import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  InboundPlanDto,
  UpdateInboundPlanDto,
  UpdateInboundPlanLineDto,
} from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanDtoMapper } from '@modules/Inbound/Application/Mappers/InboundPlanDtoMapper';
import { AssertInboundPlanPermission } from '@modules/Inbound/Application/Services/InboundPlanPermission';
import {
  AssertNonEmptyInboundPlanHeader,
  AssertValidBusinessReferenceLength,
  AssertValidExpectedArrivalAt,
  AssertValidInboundPlanLines,
} from '@modules/Inbound/Application/Services/InboundPlanRequestValidation';
import { InboundPlanLineEntity } from '@modules/Inbound/Domain/Entities/InboundPlanLineEntity';
import { InboundPlanDocumentStatus } from '@modules/Inbound/Domain/Enums/InboundPlanDocumentStatus';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';
import { SkuStatus } from '@modules/MasterData/Domain/Enums/SkuStatus';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

interface ResolvedUpdateLine {
  Request: UpdateInboundPlanLineDto;
  SkuCode: string;
  UomCode: string;
}

/**
 * IFB-24: full header + line replace while a plan is still Draft. Mirrors
 * CreateInboundPlanUseCase's validation (supplier/owner/warehouse/sku/uom
 * active, warehouse profile scope, duplicate business-key) -- Draft means
 * "not chốt yet", so every field Create can set, Update can change too.
 */
export class UpdateInboundPlanUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly partners: IPartnerRepository,
    private readonly owners: IOwnerRepository,
    private readonly warehouses: IWarehouseRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
    private readonly profiles: IWarehouseProfileRepository,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: UpdateInboundPlanDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InboundPlanDto> {
    this.AssertRequest(request);

    // Fail-fast pre-check against the CURRENT (pre-edit) scope -- no lock/transaction
    // cost for a bad id or an actor who can't even touch this plan today.
    const preCheck = await this.inboundPlans.FindById(request.Id);
    if (!preCheck) throw new NotFoundException('Inbound plan not found');
    await AssertInboundPlanPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, preCheck.Plan);

    const supplier = await this.partners.FindById(request.SupplierId);
    if (!supplier || supplier.PartnerType !== PartnerType.Supplier || supplier.Status !== PartnerStatus.Active) {
      throw new BusinessRuleException('Supplier not found or inactive');
    }
    const owner = await this.owners.FindById(request.OwnerId);
    if (!owner || owner.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Owner not found or inactive');
    }
    const warehouse = await this.warehouses.FindById(request.WarehouseId);
    if (!warehouse || warehouse.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Warehouse not found or inactive');
    }
    // IFB-24 review fix: the pre-check above only proves the actor can touch the plan's
    // CURRENT Warehouse/Owner -- Update can also move a plan INTO a different
    // Warehouse/Owner, and without this second check that new scope was never verified
    // at all, letting an actor move a plan out to a scope they have no grant on.
    await AssertInboundPlanPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, {
      WarehouseId: warehouse.Id,
      OwnerId: owner.Id,
    });
    const now = new Date();
    if (request.WarehouseProfileId) {
      const profile = await this.profiles.FindById(request.WarehouseProfileId);
      this.AssertWarehouseProfile(profile, request.OwnerId, request.WarehouseId, now);
    }

    const businessReference = `${request.SourceSystem}:${request.SourceDocumentType}:${request.SourceDocumentNumber}`;
    const changedKey =
      businessReference !== preCheck.Plan.BusinessReference ||
      request.OwnerId !== preCheck.Plan.OwnerId ||
      request.WarehouseId !== preCheck.Plan.WarehouseId;
    if (changedKey) {
      const duplicate = await this.inboundPlans.FindByBusinessKey(
        request.SourceSystem,
        request.SourceDocumentType,
        request.SourceDocumentNumber,
        request.OwnerId,
        request.WarehouseId,
      );
      if (duplicate && duplicate.Plan.Id !== preCheck.Plan.Id) {
        throw new ConflictException('Inbound plan unique constraint violated');
      }
    }

    // Cheap fail-fast: reject an obviously-bad SKU/UOM reference before ever acquiring
    // the row lock below. The result is discarded -- the version actually persisted is
    // re-resolved fresh INSIDE the lock (see the re-review fix note there) so this call
    // exists purely to avoid paying for a lock acquisition on input that's going to be
    // rejected anyway.
    await this.ResolveLines(request.Lines);

    // IFB-24 review fix: the Draft guard + mutation + line replace now all run against
    // a row locked via FindByIdForUpdate (pessimistic_write) INSIDE this transaction --
    // see ConfirmInboundPlanUseCase's identical fix for the race this closes. Everything
    // above this point (master-data validation, duplicate-key precheck) has no such race
    // (those don't depend on THIS plan's own concurrently-mutable state).
    //
    // Re-review fix: this used to wrap the whole block in try/catch and reword ANY
    // ConflictException to a generic "unique constraint violated" message -- harmless
    // when the only 409 source was InboundPlanRepository's own HandleUniqueViolation
    // (which already throws that exact wording for a real Postgres 23505), but it would
    // have silently clobbered the more specific staleness message below. Repository-level
    // unique violations already carry the correct wording on their own, so there's
    // nothing left for a use-case-level catch to add -- removed.
    return await this.audited.Run(async (manager) => {
      const aggregate = await this.inboundPlans.FindByIdForUpdate(request.Id, manager);
      if (!aggregate) throw new NotFoundException('Inbound plan not found');
      // Re-review fix (authorization TOCTOU): re-check permission against the LOCKED
      // (current, "leaving") Warehouse/Owner scope -- the two checks above only proved
      // the actor could touch the plan's OLD scope and the request's NEW scope at read
      // time; a concurrent Update could have moved the plan to a THIRD Warehouse/Owner
      // in the race window before this lock was acquired.
      await AssertInboundPlanPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, aggregate.Plan);
      // Second re-review fix: the "entering" (destination) scope check earlier in
      // Execute() also only ran outside the lock -- the actor's grant on that
      // warehouse/owner could have been revoked (or another concurrent Update could
      // move the plan again) in the window between that check and this lock. Re-check
      // the DESTINATION scope too, not just the plan's current/leaving one, so both
      // directions of the move are re-verified against the latest grants.
      await AssertInboundPlanPermission(this.permissionChecker, context.ActorUserId, ActionCode.Update, {
        WarehouseId: warehouse.Id,
        OwnerId: owner.Id,
      });
      if (aggregate.Plan.Status !== InboundPlanDocumentStatus.Draft) {
        throw new BusinessRuleException(
          `Chỉ phiếu ở trạng thái Draft mới sửa được (hiện tại: ${aggregate.Plan.Status})`,
        );
      }
      // Re-review fix (P1 decision, locked 2026-07-16): optimistic concurrency for
      // this use case's full header+line replace. Pessimistic locking above already
      // serializes two concurrent Updates so they can't physically race on the same
      // write, but without this check the SECOND writer still silently overwrites the
      // FIRST writer's just-committed changes with its own (older) form snapshot --
      // classic last-write-wins lost update, with zero signal to either operator.
      // Reuses the existing UpdatedAt audit column as the concurrency token (an
      // If-Unmodified-Since-style check) instead of adding a dedicated version column
      // -- see the story's Dev Notes for why this was chosen over a new column.
      if (aggregate.Plan.UpdatedAt.getTime() !== new Date(request.ExpectedUpdatedAt).getTime()) {
        throw new ConflictException(
          'Phiếu đã được người khác chỉnh sửa từ lúc bạn mở form. Vui lòng tải lại trước khi lưu.',
        );
      }

      // Re-review fix (P2, master-data freshness): supplier/owner/warehouse/profile
      // were validated active/scoped OUTSIDE the lock, using reads from before this
      // transaction even started -- a concurrent deactivation or WarehouseProfile
      // change in that race window would otherwise let a now-invalid reference get
      // persisted unnoticed. Re-validate the SAME checks against fresh reads, inside
      // the lock, right before writing.
      const freshSupplier = await this.partners.FindById(request.SupplierId);
      if (
        !freshSupplier ||
        freshSupplier.PartnerType !== PartnerType.Supplier ||
        freshSupplier.Status !== PartnerStatus.Active
      ) {
        throw new BusinessRuleException('Supplier not found or inactive');
      }
      const freshOwner = await this.owners.FindById(request.OwnerId);
      if (!freshOwner || freshOwner.Status !== MasterDataStatus.Active) {
        throw new BusinessRuleException('Owner not found or inactive');
      }
      const freshWarehouse = await this.warehouses.FindById(request.WarehouseId);
      if (!freshWarehouse || freshWarehouse.Status !== MasterDataStatus.Active) {
        throw new BusinessRuleException('Warehouse not found or inactive');
      }
      if (request.WarehouseProfileId) {
        const freshProfile = await this.profiles.FindById(request.WarehouseProfileId);
        this.AssertWarehouseProfile(freshProfile, request.OwnerId, request.WarehouseId, new Date());
      }
      // Adversarial-verify fix: the header-level freshness re-check above left line-level
      // SKU/UOM references out (the cheap pre-lock ResolveLines call above only fail-fasts
      // on obviously-bad input) -- a SKU/UOM deactivated in the race window between that
      // pre-lock read and this lock would otherwise still get persisted via ReplaceLines
      // below. Re-resolve fresh, inside the lock, and build the persisted line entities
      // from THIS result -- symmetric with how freshSupplier/freshOwner/freshWarehouse
      // are used above instead of their pre-lock counterparts.
      const freshLineRefs = await this.ResolveLines(request.Lines);
      const newLines = freshLineRefs.map(
        (line) =>
          new InboundPlanLineEntity({
            Id: randomUUID(),
            InboundPlanId: request.Id,
            LineNumber: line.Request.LineNumber,
            SkuId: line.Request.SkuId,
            SkuCode: line.SkuCode,
            UomId: line.Request.UomId,
            UomCode: line.UomCode,
            ExpectedQuantity: line.Request.ExpectedQuantity,
            ExternalLineReference: line.Request.ExternalLineReference ?? null,
            CreatedAt: now,
          }),
      );

      const before = InboundPlanDtoMapper.ToDto(aggregate);
      aggregate.Plan.ApplyEdits({
        SourceSystem: request.SourceSystem,
        SourceDocumentType: request.SourceDocumentType,
        SourceDocumentNumber: request.SourceDocumentNumber,
        BusinessReference: businessReference,
        SupplierId: freshSupplier.Id,
        SupplierCode: freshSupplier.PartnerCode,
        OwnerId: freshOwner.Id,
        OwnerCode: freshOwner.OwnerCode,
        WarehouseId: freshWarehouse.Id,
        WarehouseCode: freshWarehouse.WarehouseCode,
        WarehouseProfileId: request.WarehouseProfileId ?? null,
        ExpectedArrivalAt: request.ExpectedArrivalAt ? new Date(request.ExpectedArrivalAt) : null,
        UpdatedBy: context.ActorUserId,
      });

      const updatedPlan = await this.inboundPlans.UpdatePlan(aggregate.Plan, manager);
      const updatedLines = await this.inboundPlans.ReplaceLines(aggregate.Plan.Id, newLines, manager);
      const result = InboundPlanDtoMapper.ToDto({ Plan: updatedPlan, Lines: updatedLines });

      return {
        result,
        entry: MergeAuditContext(context, {
          Action: ActionCode.Update,
          ObjectType: ObjectType.InboundPlan,
          ObjectId: aggregate.Plan.Id,
          ObjectCode: aggregate.Plan.BusinessReference,
          BeforeJson: before as unknown as Record<string, unknown>,
          AfterJson: result as unknown as Record<string, unknown>,
          ReferenceType: 'InboundPlan',
          ReferenceId: aggregate.Plan.Id,
          WarehouseId: aggregate.Plan.WarehouseId,
          OwnerId: aggregate.Plan.OwnerId,
        }),
      };
    });
  }

  private AssertRequest(request: UpdateInboundPlanDto): void {
    AssertNonEmptyInboundPlanHeader({
      SourceSystem: request.SourceSystem,
      SourceDocumentType: request.SourceDocumentType,
      SourceDocumentNumber: request.SourceDocumentNumber,
      SupplierId: request.SupplierId,
      OwnerId: request.OwnerId,
      WarehouseId: request.WarehouseId,
    });
    AssertValidBusinessReferenceLength(
      `${request.SourceSystem}:${request.SourceDocumentType}:${request.SourceDocumentNumber}`,
    );
    AssertValidExpectedArrivalAt(request.ExpectedArrivalAt);
    AssertValidInboundPlanLines(request.Lines);
  }

  private async ResolveLines(lines: UpdateInboundPlanLineDto[]): Promise<ResolvedUpdateLine[]> {
    const lineRefs: ResolvedUpdateLine[] = [];
    for (const line of lines) {
      const sku = await this.skus.FindById(line.SkuId);
      if (!sku || sku.ItemStatus !== SkuStatus.Active) {
        throw new BusinessRuleException(`SKU not found or inactive at line ${line.LineNumber}`);
      }
      const uom = await this.uoms.FindById(line.UomId);
      if (!uom || uom.Status !== MasterDataStatus.Active) {
        throw new BusinessRuleException(`UOM not found or inactive at line ${line.LineNumber}`);
      }
      lineRefs.push({ Request: line, SkuCode: sku.SkuCode, UomCode: uom.UomCode });
    }
    return lineRefs;
  }

  private AssertWarehouseProfile(
    profile: WarehouseProfileEntity | null,
    ownerId: string,
    warehouseId: string,
    now: Date,
  ): void {
    if (!profile) throw new BusinessRuleException('WarehouseProfile not found for inbound plan');
    if (profile.Status !== WarehouseProfileStatus.Active) {
      throw new BusinessRuleException('WarehouseProfile is not active for inbound plan');
    }
    if (profile.EffectiveFrom > now || (profile.EffectiveTo && profile.EffectiveTo < now)) {
      throw new BusinessRuleException('WarehouseProfile is not effective for inbound plan');
    }
    if (profile.OwnerId && profile.OwnerId !== ownerId) {
      throw new BusinessRuleException('WarehouseProfile owner scope does not match inbound plan');
    }
    if (profile.WarehouseId && profile.WarehouseId !== warehouseId) {
      throw new BusinessRuleException('WarehouseProfile warehouse scope does not match inbound plan');
    }
  }
}
