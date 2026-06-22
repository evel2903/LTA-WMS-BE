import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { SkuBarcodeDto } from '@modules/MasterData/Application/DTOs/SkuBarcodeDto';
import { UpdateSkuBarcodeDto } from '@modules/MasterData/Application/DTOs/UpdateSkuBarcodeDto';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { IPackDefinitionRepository } from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { ISkuBarcodeRepository } from '@modules/MasterData/Application/Interfaces/ISkuBarcodeRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { SkuBarcodeMapper } from '@modules/MasterData/Application/Mappers/SkuBarcodeMapper';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { SkuSupportPolicyValidator } from '@modules/MasterData/Application/Services/SkuSupportPolicyValidator';
import { SkuBarcodeEntity } from '@modules/MasterData/Domain/Entities/SkuBarcodeEntity';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateSkuBarcodeUseCase {
  // Optional audit deps: see CreateSkuBarcodeUseCase — module always wires them.
  constructor(
    private readonly skuBarcodes: ISkuBarcodeRepository,
    private readonly packDefinitions: IPackDefinitionRepository,
    private readonly skus: ISkuRepository,
    private readonly owners: IOwnerRepository,
    private readonly uoms: IUomRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: UpdateSkuBarcodeDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<SkuBarcodeDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.BarcodeAlias,
        ObjectType: ObjectType.Sku,
        Action: ActionCode.Update,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const barcode = await this.skuBarcodes.FindById(request.Id);
    if (!barcode) {
      throw new NotFoundException('SKU barcode not found');
    }
    const before = SkuBarcodeMapper.ToDto(barcode) as unknown as Record<string, unknown>;

    const targetSkuId = request.SkuId ?? barcode.SkuId;
    const targetOwnerId = request.OwnerId !== undefined ? request.OwnerId : barcode.OwnerId;
    const targetUomId = request.UomId ?? barcode.UomId;
    const targetPackCode = request.PackCode !== undefined ? request.PackCode : barcode.PackCode;
    const targetBarcodeValue = request.BarcodeValue ?? barcode.BarcodeValue;
    const targetStatus = request.Status ?? barcode.Status;

    if (targetBarcodeValue !== barcode.BarcodeValue || targetOwnerId !== barcode.OwnerId) {
      const duplicate = await this.skuBarcodes.FindByValueAndOwner(targetBarcodeValue, targetOwnerId ?? null);
      if (duplicate && duplicate.Id !== barcode.Id) {
        throw new ConflictException('Barcode value already exists in owner scope');
      }
    }

    await this.ValidateReferences(
      targetSkuId,
      targetUomId,
      targetOwnerId ?? null,
      targetPackCode ?? null,
      targetStatus,
    );

    barcode.SkuId = targetSkuId;
    barcode.OwnerId = targetOwnerId ?? null;
    barcode.UomId = targetUomId;
    barcode.PackCode = targetPackCode ?? null;
    barcode.BarcodeValue = targetBarcodeValue;
    barcode.BarcodeType = request.BarcodeType ?? barcode.BarcodeType;
    barcode.IsPrimary = request.IsPrimary ?? barcode.IsPrimary;
    barcode.Status = targetStatus;
    barcode.EffectiveFrom =
      request.EffectiveFrom !== undefined
        ? request.EffectiveFrom
          ? new Date(request.EffectiveFrom)
          : null
        : barcode.EffectiveFrom;
    barcode.EffectiveTo =
      request.EffectiveTo !== undefined
        ? request.EffectiveTo
          ? new Date(request.EffectiveTo)
          : null
        : barcode.EffectiveTo;
    if (barcode.EffectiveFrom && barcode.EffectiveTo && barcode.EffectiveTo < barcode.EffectiveFrom) {
      throw new ConflictException('EffectiveTo must be greater than or equal to EffectiveFrom');
    }
    barcode.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : barcode.SourceSystem;
    barcode.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : barcode.ReferenceId;
    barcode.UpdatedAt = new Date();

    const buildEntry = (updated: SkuBarcodeEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Sku,
        ObjectId: updated.Id,
        ObjectCode: updated.BarcodeValue,
        BeforeJson: before,
        AfterJson: SkuBarcodeMapper.ToDto(updated) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
      });

    if (!this.auditedTransaction) {
      const updated = await this.skuBarcodes.Update(barcode);
      return SkuBarcodeMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.skuBarcodes.Update(barcode, manager);
      return { result: SkuBarcodeMapper.ToDto(updated), entry: buildEntry(updated) };
    });
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
