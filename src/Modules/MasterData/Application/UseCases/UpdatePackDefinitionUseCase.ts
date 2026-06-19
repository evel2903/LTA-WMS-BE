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
import { PackDefinitionDto } from '@modules/MasterData/Application/DTOs/PackDefinitionDto';
import { UpdatePackDefinitionDto } from '@modules/MasterData/Application/DTOs/UpdatePackDefinitionDto';
import { IPackDefinitionRepository } from '@modules/MasterData/Application/Interfaces/IPackDefinitionRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { PackDefinitionMapper } from '@modules/MasterData/Application/Mappers/PackDefinitionMapper';
import { SkuSupportPolicyValidator } from '@modules/MasterData/Application/Services/SkuSupportPolicyValidator';
import { PackDefinitionEntity } from '@modules/MasterData/Domain/Entities/PackDefinitionEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdatePackDefinitionUseCase {
  // Optional audit deps: see CreatePackDefinitionUseCase — module always wires them.
  constructor(
    private readonly packDefinitions: IPackDefinitionRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: UpdatePackDefinitionDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<PackDefinitionDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.UomPack,
        ObjectType: ObjectType.Sku,
        Action: ActionCode.Update,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const pack = await this.packDefinitions.FindById(request.Id);
    if (!pack) {
      throw new NotFoundException('Pack definition not found');
    }
    const before = PackDefinitionMapper.ToDto(pack) as unknown as Record<string, unknown>;

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

    const buildEntry = (updated: PackDefinitionEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Sku,
        ObjectId: updated.Id,
        ObjectCode: updated.PackCode,
        BeforeJson: before,
        AfterJson: PackDefinitionMapper.ToDto(updated) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
      });

    if (!this.auditedTransaction) {
      const updated = await this.packDefinitions.Update(pack);
      return PackDefinitionMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.packDefinitions.Update(pack, manager);
      return { result: PackDefinitionMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
