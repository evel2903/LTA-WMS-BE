import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { CreatePackDefinitionDto } from '@modules/MasterData/Application/DTOs/CreatePackDefinitionDto';
import { PackDefinitionDto } from '@modules/MasterData/Application/DTOs/PackDefinitionDto';
import { IPackDefinitionRepository } from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { PackDefinitionMapper } from '@modules/MasterData/Application/Mappers/PackDefinitionMapper';
import { SkuSupportPolicyValidator } from '@modules/MasterData/Application/Services/SkuSupportPolicyValidator';
import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreatePackDefinitionUseCase {
  constructor(
    private readonly packDefinitions: IPackDefinitionRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
  ) {}

  public async Execute(request: CreatePackDefinitionDto): Promise<PackDefinitionDto> {
    SkuSupportPolicyValidator.ValidatePackQuantity(request.QuantityPerPack);

    const duplicate = await this.packDefinitions.FindBySkuAndPackCode(request.SkuId, request.PackCode);
    if (duplicate) {
      throw new ConflictException('Pack code already exists for SKU');
    }

    const isActiveDefault = request.Status === MasterDataStatus.Active && request.IsDefault === true;
    if (isActiveDefault) {
      const defaultPack = await this.packDefinitions.FindActiveDefaultBySkuId(request.SkuId);
      if (defaultPack) {
        throw new ConflictException('Active default pack already exists for SKU');
      }
    }

    await this.ValidateReferences(request.SkuId, request.UomId, request.Status);

    const now = new Date();
    const pack = new PackDefinitionEntity({
      Id: randomUUID(),
      SkuId: request.SkuId,
      PackCode: request.PackCode,
      PackName: request.PackName,
      UomId: request.UomId,
      QuantityPerPack: request.QuantityPerPack,
      IsDefault: request.IsDefault ?? false,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const created = await this.packDefinitions.Create(pack);
    return PackDefinitionMapper.ToDto(created);
  }

  private async ValidateReferences(skuId: string, uomId: string, status: MasterDataStatus): Promise<void> {
    const sku = await this.skus.FindById(skuId);
    const uom = await this.uoms.FindById(uomId);

    if (status === MasterDataStatus.Active) {
      SkuSupportPolicyValidator.EnsureActiveSku(sku);
      SkuSupportPolicyValidator.EnsureActiveUom(uom);
      return;
    }

    SkuSupportPolicyValidator.EnsureSkuExists(sku);
    SkuSupportPolicyValidator.EnsureUomExists(uom);
  }
}
