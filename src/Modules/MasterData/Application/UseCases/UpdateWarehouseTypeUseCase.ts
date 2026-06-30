import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { UpdateWarehouseTypeDto } from '@modules/MasterData/Application/DTOs/UpdateWarehouseTypeDto';
import { WarehouseTypeDto } from '@modules/MasterData/Application/DTOs/WarehouseTypeDto';
import { IWarehouseTypeRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseTypeRepository';
import { WarehouseTypeDtoMapper } from '@modules/MasterData/Application/Mappers/WarehouseTypeDtoMapper';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { WarehouseTypeEntity } from '@modules/MasterData/Domain/Entities/WarehouseTypeEntity';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';

export class UpdateWarehouseTypeUseCase {
  constructor(
    private readonly warehouseTypes: IWarehouseTypeRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: UpdateWarehouseTypeDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<WarehouseTypeDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        ObjectType: ObjectType.Warehouse,
        Action: ActionCode.Update,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const warehouseType = await this.warehouseTypes.FindById(request.Id);
    if (!warehouseType) {
      throw new NotFoundException('Warehouse type not found');
    }
    const before = WarehouseTypeDtoMapper.ToDto(warehouseType) as unknown as Record<string, unknown>;

    const hasChanges =
      request.WarehouseTypeName !== undefined ||
      request.Description !== undefined ||
      request.Status !== undefined ||
      request.SourceSystem !== undefined ||
      request.ReferenceId !== undefined;
    if (!hasChanges) {
      throw new BusinessRuleException('Warehouse type update request is empty');
    }

    warehouseType.WarehouseTypeName = request.WarehouseTypeName ?? warehouseType.WarehouseTypeName;
    warehouseType.Description = request.Description !== undefined ? request.Description : warehouseType.Description;
    warehouseType.Status = request.Status ?? warehouseType.Status;
    warehouseType.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : warehouseType.SourceSystem;
    warehouseType.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : warehouseType.ReferenceId;
    warehouseType.UpdatedAt = new Date();

    const buildEntry = (updated: WarehouseTypeEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Warehouse,
        ObjectId: updated.Id,
        ObjectCode: updated.WarehouseTypeCode,
        BeforeJson: before,
        AfterJson: WarehouseTypeDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
      });

    if (!this.auditedTransaction) {
      const updated = await this.warehouseTypes.Update(warehouseType);
      return WarehouseTypeDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.warehouseTypes.Update(warehouseType, manager);
      return { result: WarehouseTypeDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
