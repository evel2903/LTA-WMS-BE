import { NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { IWarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';
import { WarehouseProfileRuleDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileRuleDtoMapper';

export class RemoveWarehouseProfileRuleUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it. This is AUDIT-ONLY (no ownership policy / reason-code).
  constructor(
    private readonly bindingRepository: IWarehouseProfileRuleRepository,
    private readonly profileRepository: IWarehouseProfileRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  /**
   * Removes the binding (warehouse_profile_rule). Does NOT delete the rule definition.
   */
  public async Execute(
    warehouseProfileId: string,
    bindingId: string,
    context: AuditContext = SystemAuditContext,
  ): Promise<void> {
    const profile = await this.profileRepository.FindById(warehouseProfileId);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }

    const binding = await this.bindingRepository.FindById(bindingId);
    if (!binding || binding.WarehouseProfileId !== profile.Id) {
      throw new NotFoundException('Profile rule binding not found');
    }
    const before = WarehouseProfileRuleDtoMapper.ToDto(binding) as unknown as Record<string, unknown>;

    const entry = MergeAuditContext(context, {
      Action: ActionCode.DeleteCancel,
      ObjectType: ObjectType.Rule,
      ObjectId: binding.Id,
      ObjectCode: null,
      BeforeJson: before,
      WarehouseId: null,
      OwnerId: null,
    });

    if (!this.auditedTransaction) {
      await this.bindingRepository.Delete(binding.Id);
      return;
    }
    await this.auditedTransaction.Run(async (manager) => {
      await this.bindingRepository.Delete(binding.Id, manager);
      return { result: undefined, entry };
    });
  }
}
