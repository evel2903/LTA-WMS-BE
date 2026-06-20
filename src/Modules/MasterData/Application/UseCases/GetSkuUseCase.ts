import { NotFoundException } from '@common/Exceptions/AppException';
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
import { SkuDto } from '@modules/MasterData/Application/DTOs/SkuDto';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { SkuDtoMapper } from '@modules/MasterData/Application/Mappers/SkuDtoMapper';

export class GetSkuUseCase {
  // SKU is external-owned / sensitive (A6). When the ownership policy marks the group
  // auditable, a read writes an Action=Read audit record (V0-AC-02.4). This is the single
  // representative sensitive-read path for C5; per-actor cross-owner scoping and full
  // read-audit coverage across all Get/List paths are deferred (read-audit volume). The
  // ownership + audit deps are optional only so fixture-setup tests construct bare; the
  // module always wires them.
  constructor(
    private readonly skuRepository: ISkuRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(id: string, context: AuditContext = SystemAuditContext): Promise<SkuDto> {
    const sku = await this.skuRepository.FindById(id);
    if (!sku) {
      throw new NotFoundException('SKU not found');
    }
    const dto = SkuDtoMapper.ToDto(sku);

    if (this.ownershipPolicy && this.auditedTransaction) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.Sku,
        ObjectType: ObjectType.Sku,
        Action: ActionCode.Read,
      });
      if (decision.RequiresAudit) {
        return this.auditedTransaction.Run(async () => ({
          result: dto,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Read,
            ObjectType: ObjectType.Sku,
            ObjectId: sku.Id,
            ObjectCode: sku.SkuCode,
            OwnerId: sku.DefaultOwnerId ?? null,
          }),
        }));
      }
    }

    return dto;
  }
}
