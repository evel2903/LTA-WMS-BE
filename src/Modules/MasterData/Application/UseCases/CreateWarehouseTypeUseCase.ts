import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateWarehouseTypeDto } from '@modules/MasterData/Application/DTOs/CreateWarehouseTypeDto';
import { WarehouseTypeDto } from '@modules/MasterData/Application/DTOs/WarehouseTypeDto';
import { IWarehouseTypeRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseTypeRepository';
import { WarehouseTypeDtoMapper } from '@modules/MasterData/Application/Mappers/WarehouseTypeDtoMapper';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { WarehouseTypeEntity } from '@modules/MasterData/Domain/Entities/WarehouseTypeEntity';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { NormalizeWarehouseTypeCode } from '@modules/MasterData/Domain/Services/WarehouseTypeCodePolicy';

export class CreateWarehouseTypeUseCase {
  constructor(
    private readonly warehouseTypes: IWarehouseTypeRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateWarehouseTypeDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<WarehouseTypeDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        ObjectType: ObjectType.Warehouse,
        Action: ActionCode.Create,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const normalizedCode = NormalizeWarehouseTypeCode(request.WarehouseTypeCode);
    if (!normalizedCode) {
      throw new BusinessRuleException('Warehouse type code is required');
    }

    const existing = await this.warehouseTypes.FindByCode(normalizedCode);
    if (existing) {
      throw new ConflictException('Warehouse type code already exists');
    }

    const now = new Date();
    const warehouseType = new WarehouseTypeEntity({
      Id: randomUUID(),
      WarehouseTypeCode: normalizedCode,
      WarehouseTypeName: request.WarehouseTypeName,
      Description: request.Description ?? null,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const buildEntry = (created: WarehouseTypeEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Warehouse,
        ObjectId: created.Id,
        ObjectCode: created.WarehouseTypeCode,
        AfterJson: WarehouseTypeDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
      });

    if (!this.auditedTransaction) {
      const created = await this.warehouseTypes.Create(warehouseType);
      return WarehouseTypeDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.warehouseTypes.Create(warehouseType, manager);
      return { result: WarehouseTypeDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
