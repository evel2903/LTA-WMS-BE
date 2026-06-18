import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { UomConversionDto } from '@modules/MasterData/Application/DTOs/UomConversionDto';
import { UpdateUomConversionDto } from '@modules/MasterData/Application/DTOs/UpdateUomConversionDto';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomConversionRepository } from '@modules/MasterData/Application/Interfaces/IUomConversionRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomConversionMapper } from '@modules/MasterData/Application/Mappers/UomConversionMapper';
import { SkuSupportPolicyValidator } from '@modules/MasterData/Application/Services/SkuSupportPolicyValidator';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateUomConversionUseCase {
  constructor(
    private readonly uomConversions: IUomConversionRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
  ) {}

  public async Execute(request: UpdateUomConversionDto): Promise<UomConversionDto> {
    const conversion = await this.uomConversions.FindById(request.Id);
    if (!conversion) {
      throw new NotFoundException('UOM conversion not found');
    }

    const targetSkuId = request.SkuId ?? conversion.SkuId;
    const targetFromUomId = request.FromUomId ?? conversion.FromUomId;
    const targetToUomId = request.ToUomId ?? conversion.ToUomId;
    const targetFactor = request.Factor ?? conversion.Factor;
    const targetEffectiveFrom = request.EffectiveFrom ? new Date(request.EffectiveFrom) : conversion.EffectiveFrom;
    const targetEffectiveTo = request.EffectiveTo !== undefined ? request.EffectiveTo : conversion.EffectiveTo;
    const targetStatus = request.Status ?? conversion.Status;

    SkuSupportPolicyValidator.ValidateConversionWindow(
      targetFromUomId,
      targetToUomId,
      targetFactor,
      targetEffectiveFrom,
      targetEffectiveTo,
    );

    const duplicate = await this.uomConversions.FindByUniqueKey(
      targetSkuId,
      targetFromUomId,
      targetToUomId,
      targetEffectiveFrom,
    );
    if (duplicate && duplicate.Id !== conversion.Id) {
      throw new ConflictException('UOM conversion already exists for effective date');
    }

    const sku = await this.skus.FindById(targetSkuId);
    const fromUom = await this.uoms.FindById(targetFromUomId);
    const toUom = await this.uoms.FindById(targetToUomId);
    if (targetStatus === MasterDataStatus.Active) {
      SkuSupportPolicyValidator.EnsureActiveSku(sku);
      SkuSupportPolicyValidator.EnsureActiveUom(fromUom, 'From UOM');
      SkuSupportPolicyValidator.EnsureActiveUom(toUom, 'To UOM');
      const overlap = await this.uomConversions.FindActiveOverlap(
        targetSkuId,
        targetFromUomId,
        targetToUomId,
        targetEffectiveFrom,
        targetEffectiveTo,
        conversion.Id,
      );
      if (overlap) {
        throw new ConflictException('Active UOM conversion effective window overlaps existing conversion');
      }
    } else {
      SkuSupportPolicyValidator.EnsureSkuExists(sku);
      SkuSupportPolicyValidator.EnsureUomExists(fromUom, 'From UOM');
      SkuSupportPolicyValidator.EnsureUomExists(toUom, 'To UOM');
    }

    conversion.SkuId = targetSkuId;
    conversion.FromUomId = targetFromUomId;
    conversion.ToUomId = targetToUomId;
    conversion.Factor = targetFactor;
    conversion.EffectiveFrom = targetEffectiveFrom;
    conversion.EffectiveTo = targetEffectiveTo;
    conversion.Status = targetStatus;
    conversion.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : conversion.SourceSystem;
    conversion.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : conversion.ReferenceId;
    conversion.UpdatedAt = new Date();

    const updated = await this.uomConversions.Update(conversion);
    return UomConversionMapper.ToDto(updated);
  }
}
