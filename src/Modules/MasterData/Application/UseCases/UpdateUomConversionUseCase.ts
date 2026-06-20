import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
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
import { UomConversionDto } from '@modules/MasterData/Application/DTOs/UomConversionDto';
import { UpdateUomConversionDto } from '@modules/MasterData/Application/DTOs/UpdateUomConversionDto';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomConversionRepository } from '@modules/MasterData/Application/Interfaces/IUomConversionRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomConversionMapper } from '@modules/MasterData/Application/Mappers/UomConversionMapper';
import { SkuSupportPolicyValidator } from '@modules/MasterData/Application/Services/SkuSupportPolicyValidator';
import { UomConversionEntity } from '@modules/MasterData/Domain/Entities/UomConversionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateUomConversionUseCase {
  // Optional audit deps: see CreateUomConversionUseCase — module always wires them.
  constructor(
    private readonly uomConversions: IUomConversionRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: UpdateUomConversionDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<UomConversionDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.UomPack,
        ObjectType: ObjectType.Uom,
        Action: ActionCode.Update,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const conversion = await this.uomConversions.FindById(request.Id);
    if (!conversion) {
      throw new NotFoundException('UOM conversion not found');
    }
    const before = UomConversionMapper.ToDto(conversion) as unknown as Record<string, unknown>;

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

    const buildEntry = (updated: UomConversionEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Uom,
        ObjectId: updated.Id,
        ObjectCode: null,
        BeforeJson: before,
        AfterJson: UomConversionMapper.ToDto(updated) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
      });

    if (!this.auditedTransaction) {
      const updated = await this.uomConversions.Update(conversion);
      return UomConversionMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.uomConversions.Update(conversion, manager);
      return { result: UomConversionMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
