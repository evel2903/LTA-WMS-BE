import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  CreateInboundPlanDto,
  CreateInboundPlanLineDto,
  InboundPlanDto,
} from '@modules/Inbound/Application/DTOs/InboundPlanDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { InboundPlanDtoMapper } from '@modules/Inbound/Application/Mappers/InboundPlanDtoMapper';
import {
  AssertNonEmptyInboundPlanHeader,
  AssertValidBusinessReferenceLength,
  AssertValidExpectedArrivalAt,
  AssertValidInboundPlanLines,
} from '@modules/Inbound/Application/Services/InboundPlanRequestValidation';
import { InboundPlanEntity } from '@modules/Inbound/Domain/Entities/InboundPlanEntity';
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

/**
 * Một dòng đã resolve SKU/UOM (cả Id lẫn Code). Dùng cho cả luồng tạo JSON (resolve theo Id,
 * per-line) lẫn luồng import Excel (resolve theo Code, batch — qua ExecuteWithResolvedLines).
 */
export interface ResolvedInboundLine {
  Request: CreateInboundPlanLineDto;
  SkuCode: string;
  UomCode: string;
}

export class CreateInboundPlanUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly partners: IPartnerRepository,
    private readonly owners: IOwnerRepository,
    private readonly warehouses: IWarehouseRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
    private readonly profiles: IWarehouseProfileRepository,
    private readonly audited: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateInboundPlanDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InboundPlanDto> {
    this.AssertRequest(request);

    const duplicate = await this.FindDuplicate(request, context);
    if (duplicate) return duplicate;

    const lineRefs = await this.ResolveLinesById(request.Lines);
    return this.PersistPlan(request, lineRefs, context);
  }

  /**
   * Tạo plan với các dòng đã resolve sẵn (SkuId/UomId/SkuCode/UomCode). Dùng cho luồng import
   * Excel server-side: phần validate dòng đã batch ở use-case import nên KHÔNG resolve per-line
   * lại (tránh N+1). Giữ duplicate-check + validate header + persist atomic như Execute.
   */
  public async ExecuteWithResolvedLines(
    request: CreateInboundPlanDto,
    lineRefs: ResolvedInboundLine[],
    context: AuditContext = SystemAuditContext,
  ): Promise<InboundPlanDto> {
    this.AssertRequest(request);

    const duplicate = await this.FindDuplicate(request, context);
    if (duplicate) return duplicate;

    return this.PersistPlan(request, lineRefs, context);
  }

  private async FindDuplicate(request: CreateInboundPlanDto, context: AuditContext): Promise<InboundPlanDto | null> {
    const existing = await this.inboundPlans.FindByBusinessKey(
      request.SourceSystem,
      request.SourceDocumentType,
      request.SourceDocumentNumber,
      request.OwnerId,
      request.WarehouseId,
    );
    return existing ? this.ReturnDuplicate(existing, context) : null;
  }

  private async ResolveLinesById(lines: CreateInboundPlanLineDto[]): Promise<ResolvedInboundLine[]> {
    const lineRefs: ResolvedInboundLine[] = [];
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

  private async PersistPlan(
    request: CreateInboundPlanDto,
    lineRefs: ResolvedInboundLine[],
    context: AuditContext,
  ): Promise<InboundPlanDto> {
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

    const now = new Date();
    if (request.WarehouseProfileId) {
      const profile = await this.profiles.FindById(request.WarehouseProfileId);
      this.AssertWarehouseProfile(profile, request.OwnerId, request.WarehouseId, now);
    }

    const planId = randomUUID();
    const businessReference = this.BusinessReference(request);
    // IFB-24: plans are born Draft -- freely editable/deletable, not yet "real"
    // to the outside world. No CoreFlowInstance/outbox event yet; those are
    // ConfirmInboundPlanUseCase's job once the plan leaves Draft.
    const plan = new InboundPlanEntity({
      Id: planId,
      SourceSystem: request.SourceSystem,
      SourceDocumentType: request.SourceDocumentType,
      SourceDocumentNumber: request.SourceDocumentNumber,
      BusinessReference: businessReference,
      SupplierId: supplier.Id,
      SupplierCode: supplier.PartnerCode,
      OwnerId: owner.Id,
      OwnerCode: owner.OwnerCode,
      WarehouseId: warehouse.Id,
      WarehouseCode: warehouse.WarehouseCode,
      WarehouseProfileId: request.WarehouseProfileId ?? null,
      ExpectedArrivalAt: request.ExpectedArrivalAt ? new Date(request.ExpectedArrivalAt) : null,
      Status: InboundPlanDocumentStatus.Draft,
      CoreFlowInstanceId: null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
    });
    const lines = lineRefs.map(
      (line) =>
        new InboundPlanLineEntity({
          Id: randomUUID(),
          InboundPlanId: planId,
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

    const write = async (manager?: Parameters<IInboundPlanRepository['Create']>[2]) => {
      const created = await this.inboundPlans.Create(plan, lines, manager);
      return InboundPlanDtoMapper.ToDto(created, false);
    };

    try {
      return await this.audited.Run(async (manager) => {
        const result = await write(manager);
        return {
          result,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.InboundPlan,
            ObjectId: plan.Id,
            ObjectCode: plan.BusinessReference,
            AfterJson: result as unknown as Record<string, unknown>,
            ReferenceType: 'InboundPlan',
            ReferenceId: plan.Id,
            WarehouseId: plan.WarehouseId,
            OwnerId: plan.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const duplicate = await this.inboundPlans.FindByBusinessKey(
          request.SourceSystem,
          request.SourceDocumentType,
          request.SourceDocumentNumber,
          request.OwnerId,
          request.WarehouseId,
        );
        if (duplicate) return this.ReturnDuplicate(duplicate, context);
      }
      throw error;
    }
  }

  private AssertRequest(request: CreateInboundPlanDto): void {
    AssertNonEmptyInboundPlanHeader({
      SourceSystem: request.SourceSystem,
      SourceDocumentType: request.SourceDocumentType,
      SourceDocumentNumber: request.SourceDocumentNumber,
      SupplierId: request.SupplierId,
      OwnerId: request.OwnerId,
      WarehouseId: request.WarehouseId,
    });
    AssertValidBusinessReferenceLength(this.BusinessReference(request));
    AssertValidExpectedArrivalAt(request.ExpectedArrivalAt);
    AssertValidInboundPlanLines(request.Lines);
  }

  private BusinessReference(request: CreateInboundPlanDto): string {
    return `${request.SourceSystem}:${request.SourceDocumentType}:${request.SourceDocumentNumber}`;
  }

  private async ReturnDuplicate(
    existing: Awaited<ReturnType<IInboundPlanRepository['FindByBusinessKey']>>,
    context: AuditContext,
  ): Promise<InboundPlanDto> {
    if (!existing) throw new ConflictException('Inbound plan unique constraint violated');
    const duplicate = InboundPlanDtoMapper.ToDto(existing, true);
    return this.audited.Run(async () => ({
      result: duplicate,
      entry: MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.InboundPlan,
        ObjectId: existing.Plan.Id,
        ObjectCode: existing.Plan.BusinessReference,
        AfterJson: duplicate as unknown as Record<string, unknown>,
        ReferenceType: 'InboundPlanDuplicate',
        ReferenceId: existing.Plan.Id,
        WarehouseId: existing.Plan.WarehouseId,
        OwnerId: existing.Plan.OwnerId,
      }),
    }));
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
