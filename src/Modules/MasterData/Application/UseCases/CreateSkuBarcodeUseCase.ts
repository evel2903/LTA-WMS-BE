import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { CreateSkuBarcodeDto } from '@modules/MasterData/Application/DTOs/CreateSkuBarcodeDto';
import { SkuBarcodeDto } from '@modules/MasterData/Application/DTOs/SkuBarcodeDto';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { IPackDefinitionRepository } from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { ISkuBarcodeRepository } from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { SkuBarcodeMapper } from '@modules/MasterData/Application/Mappers/SkuBarcodeMapper';
import { SkuSupportPolicyValidator } from '@modules/MasterData/Application/Services/SkuSupportPolicyValidator';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateSkuBarcodeUseCase {
  constructor(
    private readonly skuBarcodes: ISkuBarcodeRepository,
    private readonly packDefinitions: IPackDefinitionRepository,
    private readonly skus: ISkuRepository,
    private readonly owners: IOwnerRepository,
    private readonly uoms: IUomRepository,
  ) {}

  public async Execute(request: CreateSkuBarcodeDto): Promise<SkuBarcodeDto> {
    const ownerId = request.OwnerId ?? null;
    const duplicate = await this.skuBarcodes.FindByValueAndOwner(request.BarcodeValue, ownerId);
    if (duplicate) {
      throw new ConflictException('Barcode value already exists in owner scope');
    }

    await this.ValidateReferences(request.SkuId, request.UomId, ownerId, request.PackCode ?? null, request.Status);

    const now = new Date();
    const barcode = new SkuBarcodeEntity({
      Id: randomUUID(),
      SkuId: request.SkuId,
      OwnerId: ownerId,
      UomId: request.UomId,
      PackCode: request.PackCode ?? null,
      BarcodeValue: request.BarcodeValue,
      BarcodeType: request.BarcodeType,
      IsPrimary: request.IsPrimary ?? false,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const created = await this.skuBarcodes.Create(barcode);
    return SkuBarcodeMapper.ToDto(created);
  }

  private async ValidateReferences(
    skuId: string,
    uomId: string,
    ownerId: string | null,
    packCode: string | null,
    status: MasterDataStatus,
  ): Promise<void> {
    const sku = await this.skus.FindById(skuId);
    const uom = await this.uoms.FindById(uomId);
    const owner = ownerId ? await this.owners.FindById(ownerId) : null;

    if (status === MasterDataStatus.Active) {
      SkuSupportPolicyValidator.EnsureActiveSku(sku);
      SkuSupportPolicyValidator.EnsureActiveUom(uom);
      if (ownerId) {
        SkuSupportPolicyValidator.EnsureActiveOwner(owner);
      }
    } else {
      SkuSupportPolicyValidator.EnsureSkuExists(sku);
      SkuSupportPolicyValidator.EnsureUomExists(uom);
      if (ownerId) {
        SkuSupportPolicyValidator.EnsureOwnerExists(owner);
      }
    }

    if (packCode) {
      SkuSupportPolicyValidator.EnsureActivePack(
        await this.packDefinitions.FindBySkuAndPackCode(skuId, packCode),
        skuId,
        uomId,
      );
    }
  }
}
