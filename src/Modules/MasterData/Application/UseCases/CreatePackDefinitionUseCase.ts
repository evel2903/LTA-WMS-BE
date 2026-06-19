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
  // ownershipPolicy + auditedTransaction are optional only so fixture-setup tests can
  // construct the use case bare; the module always wires them, so production always
  // enforces A6 (UomPack: conditional-edit) + writes audit in-transaction.
  constructor(
    private readonly packDefinitions: IPackDefinitionRepository,
    private readonly skus: ISkuRepository,
    private readonly uoms: IUomRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreatePackDefinitionDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<PackDefinitionDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.UomPack,
        ObjectType: ObjectType.Sku,
        Action: ActionCode.Create,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

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

    const buildEntry = (created: PackDefinitionEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Sku,
        ObjectId: created.Id,
        ObjectCode: created.PackCode,
        AfterJson: PackDefinitionMapper.ToDto(created) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
      });

    if (!this.auditedTransaction) {
      const created = await this.packDefinitions.Create(pack);
      return PackDefinitionMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.packDefinitions.Create(pack, manager);
      return { result: PackDefinitionMapper.ToDto(created), entry: buildEntry(created) };
    });
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
