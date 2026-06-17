import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { SkuDto } from '@modules/MasterData/Application/DTOs/SkuDto';
import { UpdateSkuDto } from '@modules/MasterData/Application/DTOs/UpdateSkuDto';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { SkuDtoMapper } from '@modules/MasterData/Application/Mappers/SkuDtoMapper';
import { SkuPolicyValidator } from '@modules/MasterData/Application/Services/SkuPolicyValidator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateSkuUseCase {
  constructor(
    private readonly skuRepository: ISkuRepository,
    private readonly ownerRepository: IOwnerRepository,
    private readonly uomRepository: IUomRepository,
  ) {}

  public async Execute(request: UpdateSkuDto): Promise<SkuDto> {
    const sku = await this.skuRepository.FindById(request.Id);
    if (!sku) {
      throw new NotFoundException('SKU not found');
    }

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

    const updated = await this.skuRepository.Update(sku);
    return SkuDtoMapper.ToDto(updated);
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
