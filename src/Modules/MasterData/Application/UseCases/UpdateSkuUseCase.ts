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
  AssertUpdateDataScopes,
  ResolveActorUserId,
} from '@modules/AccessControl/Application/Services/PermissionScopeAssertion';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { SkuDto } from '@modules/MasterData/Application/DTOs/SkuDto';
import { UpdateSkuDto } from '@modules/MasterData/Application/DTOs/UpdateSkuDto';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { SkuDtoMapper } from '@modules/MasterData/Application/Mappers/SkuDtoMapper';
import { SkuPolicyValidator } from '@modules/MasterData/Application/Services/SkuPolicyValidator';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateSkuUseCase {
  // Hard-blocked in production by A6 (Sku source-of-truth read-only) — see CreateSkuUseCase.
  constructor(
    private readonly skuRepository: ISkuRepository,
    private readonly ownerRepository: IOwnerRepository,
    private readonly uomRepository: IUomRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(request: UpdateSkuDto, context: AuditContext = SystemAuditContext): Promise<SkuDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.Sku,
        ObjectType: ObjectType.Sku,
        Action: ActionCode.Update,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const sku = await this.skuRepository.FindById(request.Id);
    if (!sku) {
      throw new NotFoundException('SKU not found');
    }
    const before = SkuDtoMapper.ToDto(sku) as unknown as Record<string, unknown>;
    const targetOwnerId = request.DefaultOwnerId !== undefined ? request.DefaultOwnerId : sku.DefaultOwnerId;
    await AssertUpdateDataScopes(this.permissionChecker, ResolveActorUserId(request, context), ObjectType.Sku, [
      { OwnerId: sku.DefaultOwnerId },
      { OwnerId: targetOwnerId },
    ]);

    if (request.SkuCode && request.SkuCode !== sku.SkuCode) {
      const duplicate = await this.skuRepository.FindByCode(request.SkuCode);
      if (duplicate && duplicate.Id !== sku.Id) {
        throw new ConflictException('SKU code already exists');
      }
      sku.SkuCode = request.SkuCode;
    }

    sku.SkuName = request.SkuName ?? sku.SkuName;
    sku.DefaultOwnerId = request.DefaultOwnerId !== undefined ? request.DefaultOwnerId : sku.DefaultOwnerId;
    sku.ItemClass = request.ItemClass ?? sku.ItemClass;
    sku.ItemStatus = request.ItemStatus ?? sku.ItemStatus;
    sku.BaseUomId = request.BaseUomId ?? sku.BaseUomId;
    sku.InventoryUomId = request.InventoryUomId ?? sku.InventoryUomId;
    sku.LotControlled = request.LotControlled ?? sku.LotControlled;
    sku.ExpiryControlled = request.ExpiryControlled ?? sku.ExpiryControlled;
    sku.SerialControlled = request.SerialControlled ?? sku.SerialControlled;
    sku.OwnerControlled = request.OwnerControlled ?? sku.OwnerControlled;
    sku.LpnControlled = request.LpnControlled ?? sku.LpnControlled;
    sku.TemperatureControlled = request.TemperatureControlled ?? sku.TemperatureControlled;
    sku.DgControlled = request.DgControlled ?? sku.DgControlled;
    sku.CustomsControlled = request.CustomsControlled ?? sku.CustomsControlled;
    sku.QcRequired = request.QcRequired ?? sku.QcRequired;
    sku.TemperatureClass = request.TemperatureClass !== undefined ? request.TemperatureClass : sku.TemperatureClass;
    sku.DgClass = request.DgClass !== undefined ? request.DgClass : sku.DgClass;
    sku.BondedFlag = request.BondedFlag ?? sku.BondedFlag;
    sku.ShelfLifeDays = request.ShelfLifeDays !== undefined ? request.ShelfLifeDays : sku.ShelfLifeDays;
    sku.MinRemainingShelfLifeDays =
      request.MinRemainingShelfLifeDays !== undefined
        ? request.MinRemainingShelfLifeDays
        : sku.MinRemainingShelfLifeDays;
    sku.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : sku.SourceSystem;
    sku.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : sku.ReferenceId;
    sku.UpdatedAt = new Date();

    if (sku.DefaultOwnerId) {
      await this.ValidateOwner(sku.DefaultOwnerId);
    }
    await this.ValidateUom(sku.BaseUomId, 'Base UOM');
    await this.ValidateUom(sku.InventoryUomId, 'Inventory UOM');
    SkuPolicyValidator.Validate(sku);

    const buildEntry = (updated: SkuEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Sku,
        ObjectId: updated.Id,
        ObjectCode: updated.SkuCode,
        ReasonCodeId: reasonCodeId,
        BeforeJson: before,
        AfterJson: SkuDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const updated = await this.skuRepository.Update(sku);
      return SkuDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.skuRepository.Update(sku, manager);
      return { result: SkuDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }

  private async ValidateOwner(ownerId: string): Promise<void> {
    const owner = await this.ownerRepository.FindById(ownerId);
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    if (owner.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Owner must be active');
    }
  }

  private async ValidateUom(uomId: string, label: string): Promise<void> {
    const uom = await this.uomRepository.FindById(uomId);
    if (!uom) {
      throw new NotFoundException(`${label} not found`);
    }
    if (uom.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException(`${label} must be active`);
    }
  }
}
