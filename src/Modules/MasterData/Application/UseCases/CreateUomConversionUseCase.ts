import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { CreateUomConversionDto } from '@modules/MasterData/Application/DTOs/CreateUomConversionDto';
import { UomConversionDto } from '@modules/MasterData/Application/DTOs/UomConversionDto';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomConversionRepository } from '@modules/MasterData/Application/Interfaces/IUomConversionRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomConversionMapper } from '@modules/MasterData/Application/Mappers/UomConversionMapper';
import { SkuSupportPolicyValidator } from '@modules/MasterData/Application/Services/SkuSupportPolicyValidator';
import { UomConversionEntity } from '@modules/MasterData/Domain/Entities/UomConversionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateUomConversionUseCase {
  constructor(
    private readonly uomConversions: IUomConversionRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
  ) {}

  public async Execute(request: CreateUomConversionDto): Promise<UomConversionDto> {
    const effectiveFrom = new Date(request.EffectiveFrom);
    const effectiveTo = request.EffectiveTo ? new Date(request.EffectiveTo) : null;
    SkuSupportPolicyValidator.ValidateConversionWindow(
      request.FromUomId,
      request.ToUomId,
      request.Factor,
      effectiveFrom,
      effectiveTo,
    );

    const duplicate = await this.uomConversions.FindByUniqueKey(
      request.SkuId,
      request.FromUomId,
      request.ToUomId,
      effectiveFrom,
    );
    if (duplicate) {
      throw new ConflictException('UOM conversion already exists for effective date');
    }

    await this.ValidateReferences(request.SkuId, request.FromUomId, request.ToUomId, request.Status);
    if (request.Status === MasterDataStatus.Active) {
      const overlap = await this.uomConversions.FindActiveOverlap(
        request.SkuId,
        request.FromUomId,
        request.ToUomId,
        effectiveFrom,
        effectiveTo,
      );
      if (overlap) {
        throw new ConflictException('Active UOM conversion effective window overlaps existing conversion');
      }
    }

    const now = new Date();
    const conversion = new UomConversionEntity({
      Id: randomUUID(),
      SkuId: request.SkuId,
      FromUomId: request.FromUomId,
      ToUomId: request.ToUomId,
      Factor: request.Factor,
      EffectiveFrom: effectiveFrom,
      EffectiveTo: effectiveTo,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const created = await this.uomConversions.Create(conversion);
    return UomConversionMapper.ToDto(created);
  }

  private async ValidateReferences(
    skuId: string,
    fromUomId: string,
    toUomId: string,
    status: MasterDataStatus,
  ): Promise<void> {
    const sku = await this.skus.FindById(skuId);
    const fromUom = await this.uoms.FindById(fromUomId);
    const toUom = await this.uoms.FindById(toUomId);

    if (status === MasterDataStatus.Active) {
      SkuSupportPolicyValidator.EnsureActiveSku(sku);
      SkuSupportPolicyValidator.EnsureActiveUom(fromUom, 'From UOM');
      SkuSupportPolicyValidator.EnsureActiveUom(toUom, 'To UOM');
      return;
    }

    SkuSupportPolicyValidator.EnsureSkuExists(sku);
    SkuSupportPolicyValidator.EnsureUomExists(fromUom, 'From UOM');
    SkuSupportPolicyValidator.EnsureUomExists(toUom, 'To UOM');
  }
}
