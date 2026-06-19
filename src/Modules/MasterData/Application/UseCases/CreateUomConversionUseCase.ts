import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
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
  // ownershipPolicy + auditedTransaction are optional only so fixture-setup tests can
  // construct the use case bare; the module always wires them, so production always
  // enforces A6 (UomPack: conditional-edit) + writes audit in-transaction.
  constructor(
    private readonly uomConversions: IUomConversionRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateUomConversionDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<UomConversionDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.UomPack,
        ObjectType: ObjectType.Uom,
        Action: ActionCode.Create,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

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

    const buildEntry = (created: UomConversionEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Uom,
        ObjectId: created.Id,
        ObjectCode: null,
        AfterJson: UomConversionMapper.ToDto(created) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
      });

    if (!this.auditedTransaction) {
      const created = await this.uomConversions.Create(conversion);
      return UomConversionMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.uomConversions.Create(conversion, manager);
      return { result: UomConversionMapper.ToDto(created), entry: buildEntry(created) };
    });
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
