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
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { CreateSkuDto } from '@modules/MasterData/Application/DTOs/CreateSkuDto';
import { SkuDto } from '@modules/MasterData/Application/DTOs/SkuDto';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { SkuDtoMapper } from '@modules/MasterData/Application/Mappers/SkuDtoMapper';
import { SkuPolicyValidator } from '@modules/MasterData/Application/Services/SkuPolicyValidator';
import { OwnerEntity } from '@modules/MasterData/Domain/Entities/OwnerEntity';
import { SkuEntity } from '@modules/MasterData/Domain/Entities/SkuEntity';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateSkuUseCase {
  // SKU create is policy-gated: deployments can allow direct WMS maintenance or
  // block writes with SOURCE_OF_TRUTH_READONLY by changing the ownership policy.
  // ownershipPolicy + auditedTransaction are optional only so fixture-setup tests can construct
  // the use case bare; the module always wires them.
  constructor(
    private readonly skuRepository: ISkuRepository,
    private readonly ownerRepository: IOwnerRepository,
    private readonly uomRepository: IUomRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: CreateSkuDto, context: AuditContext = SystemAuditContext): Promise<SkuDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.Sku,
        ObjectType: ObjectType.Sku,
        Action: ActionCode.Create,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const existing = await this.skuRepository.FindByCode(request.SkuCode);
    if (existing) {
      throw new ConflictException('SKU code already exists');
    }

    if (request.DefaultOwnerId) {
      await this.ValidateOwner(request.DefaultOwnerId);
    }

    await this.ValidateUom(request.BaseUomId, 'Base UOM');
    await this.ValidateUom(request.InventoryUomId, 'Inventory UOM');

    const now = new Date();
    const sku = new SkuEntity({
      Id: randomUUID(),
      SkuCode: request.SkuCode,
      SkuName: request.SkuName,
      DefaultOwnerId: request.DefaultOwnerId ?? null,
      ItemClass: request.ItemClass,
      ItemStatus: request.ItemStatus,
      BaseUomId: request.BaseUomId,
      InventoryUomId: request.InventoryUomId,
      LotControlled: request.LotControlled ?? false,
      ExpiryControlled: request.ExpiryControlled ?? false,
      SerialControlled: request.SerialControlled ?? false,
      OwnerControlled: request.OwnerControlled ?? false,
      LpnControlled: request.LpnControlled ?? false,
      TemperatureControlled: request.TemperatureControlled ?? false,
      DgControlled: request.DgControlled ?? false,
      CustomsControlled: request.CustomsControlled ?? false,
      QcRequired: request.QcRequired ?? false,
      TemperatureClass: request.TemperatureClass ?? null,
      DgClass: request.DgClass ?? null,
      BondedFlag: request.BondedFlag ?? false,
      ShelfLifeDays: request.ShelfLifeDays ?? null,
      MinRemainingShelfLifeDays: request.MinRemainingShelfLifeDays ?? null,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    SkuPolicyValidator.Validate(sku);

    const buildEntry = (created: SkuEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Sku,
        ObjectId: created.Id,
        ObjectCode: created.SkuCode,
        ReasonCodeId: reasonCodeId,
        AfterJson: SkuDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const created = await this.skuRepository.Create(sku);
      return SkuDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.skuRepository.Create(sku, manager);
      return { result: SkuDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }

  private async ValidateOwner(ownerId: string): Promise<OwnerEntity> {
    const owner = await this.ownerRepository.FindById(ownerId);
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    if (owner.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Owner must be active');
    }
    return owner;
  }

  private async ValidateUom(uomId: string, label: string): Promise<UomEntity> {
    const uom = await this.uomRepository.FindById(uomId);
    if (!uom) {
      throw new NotFoundException(`${label} not found`);
    }
    if (uom.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException(`${label} must be active`);
    }
    return uom;
  }
}
