import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { PackDefinitionDto } from '@modules/MasterData/Application/DTOs/PackDefinitionDto';
import { UpdatePackDefinitionDto } from '@modules/MasterData/Application/DTOs/UpdatePackDefinitionDto';
import { IPackDefinitionRepository } from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { PackDefinitionMapper } from '@modules/MasterData/Application/Mappers/PackDefinitionMapper';
import { SkuSupportPolicyValidator } from '@modules/MasterData/Application/Services/SkuSupportPolicyValidator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdatePackDefinitionUseCase {
  constructor(
    private readonly packDefinitions: IPackDefinitionRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
  ) {}

  public async Execute(request: UpdatePackDefinitionDto): Promise<PackDefinitionDto> {
    const pack = await this.packDefinitions.FindById(request.Id);
    if (!pack) {
      throw new NotFoundException('Pack definition not found');
    }

    const targetSkuId = request.SkuId ?? pack.SkuId;
    const targetPackCode = request.PackCode ?? pack.PackCode;
    const targetUomId = request.UomId ?? pack.UomId;
    const targetQuantity = request.QuantityPerPack ?? pack.QuantityPerPack;
    const targetIsDefault = request.IsDefault ?? pack.IsDefault;
    const targetStatus = request.Status ?? pack.Status;

    SkuSupportPolicyValidator.ValidatePackQuantity(targetQuantity);

    if (targetSkuId !== pack.SkuId || targetPackCode !== pack.PackCode) {
      const duplicate = await this.packDefinitions.FindBySkuAndPackCode(targetSkuId, targetPackCode);
      if (duplicate && duplicate.Id !== pack.Id) {
        throw new ConflictException('Pack code already exists for SKU');
      }
    }

    if (targetStatus === MasterDataStatus.Active && targetIsDefault) {
      const defaultPack = await this.packDefinitions.FindActiveDefaultBySkuId(targetSkuId);
      if (defaultPack && defaultPack.Id !== pack.Id) {
        throw new ConflictException('Active default pack already exists for SKU');
      }
    }

    const sku = await this.skus.FindById(targetSkuId);
    const uom = await this.uoms.FindById(targetUomId);
    if (targetStatus === MasterDataStatus.Active) {
      SkuSupportPolicyValidator.EnsureActiveSku(sku);
      SkuSupportPolicyValidator.EnsureActiveUom(uom);
    } else {
      SkuSupportPolicyValidator.EnsureSkuExists(sku);
      SkuSupportPolicyValidator.EnsureUomExists(uom);
    }

    pack.SkuId = targetSkuId;
    pack.PackCode = targetPackCode;
    pack.PackName = request.PackName ?? pack.PackName;
    pack.UomId = targetUomId;
    pack.QuantityPerPack = targetQuantity;
    pack.IsDefault = targetIsDefault;
    pack.Status = targetStatus;
    pack.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : pack.SourceSystem;
    pack.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : pack.ReferenceId;
    pack.UpdatedAt = new Date();

    const updated = await this.packDefinitions.Update(pack);
    return PackDefinitionMapper.ToDto(updated);
  }
}
