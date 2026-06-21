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
import { InventoryStatusDto } from '@modules/MasterData/Application/DTOs/InventoryStatusDto';
import { UpdateInventoryStatusDto } from '@modules/MasterData/Application/DTOs/UpdateInventoryStatusDto';
import { IInventoryStatusRepository } from '@modules/MasterData/Application/Interfaces/IInventoryStatusRepository';
import { InventoryStatusMapper } from '@modules/MasterData/Application/Mappers/InventoryStatusMapper';
import { InventoryStatusEntity } from '@modules/MasterData/Domain/Entities/InventoryStatusEntity';

/**
 * Controlled update of an inventory status's behavior flags (C14). Inventory Status is a
 * WMS-owned change-controlled group (A6: DirectEditAllowed + RequiresReason + RequiresAudit),
 * so a reason code is mandatory and resolved via the C3 catalog; the change is audited
 * atomically (C5). No data-scope re-check — inventory status is global reference data with
 * no warehouse/owner axis. There is no create/delete (seeded catalog).
 */
export class UpdateInventoryStatusUseCase {
  // ownershipPolicy + auditedTransaction are optional only so fixture-setup tests can
  // construct the use case bare; the module always wires them.
  constructor(
    private readonly inventoryStatuses: IInventoryStatusRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: UpdateInventoryStatusDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InventoryStatusDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.InventoryStatus,
        ObjectType: ObjectType.InventoryStatus,
        Action: ActionCode.Update,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const status = await this.inventoryStatuses.FindById(request.Id);
    if (!status) {
      throw new NotFoundException('Inventory status not found');
    }

    const before = InventoryStatusMapper.ToDto(status) as unknown as Record<string, unknown>;

    status.DisplayName = request.DisplayName ?? status.DisplayName;
    status.StageGroup = request.StageGroup ?? status.StageGroup;
    status.AllowsAllocation =
      request.AllowsAllocation !== undefined ? request.AllowsAllocation : status.AllowsAllocation;
    status.AllowsPick = request.AllowsPick !== undefined ? request.AllowsPick : status.AllowsPick;
    status.Hold = request.Hold !== undefined ? request.Hold : status.Hold;
    status.IsTerminal = request.IsTerminal !== undefined ? request.IsTerminal : status.IsTerminal;
    status.IsMilestone = request.IsMilestone !== undefined ? request.IsMilestone : status.IsMilestone;
    status.SortOrder = request.SortOrder !== undefined ? request.SortOrder : status.SortOrder;
    status.Status = request.Status ?? status.Status;
    status.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : status.SourceSystem;
    status.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : status.ReferenceId;
    status.UpdatedAt = new Date();

    const buildEntry = (updated: InventoryStatusEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.InventoryStatus,
        ObjectId: updated.Id,
        ObjectCode: updated.StatusCode,
        BeforeJson: before,
        AfterJson: InventoryStatusMapper.ToDto(updated) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
      });

    if (!this.auditedTransaction) {
      const updated = await this.inventoryStatuses.Update(status);
      return InventoryStatusMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.inventoryStatuses.Update(status, manager);
      return { result: InventoryStatusMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
