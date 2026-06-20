import { randomUUID } from 'crypto';
import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { CreateWarehouseProfileAssignmentDto } from '@modules/WarehouseProfile/Application/DTOs/CreateWarehouseProfileAssignmentDto';
import { WarehouseProfileAssignmentDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileAssignmentDto';
import { IWarehouseProfileAssignmentRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileAssignmentRepository';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileAssignmentDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileAssignmentDtoMapper';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfileAssignmentEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileAssignmentEntity';
import { AssignmentType } from '@modules/WarehouseProfile/Domain/Enums/AssignmentType';

export class CreateWarehouseProfileAssignmentUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it. This is AUDIT-ONLY (no ownership policy / reason-code).
  constructor(
    private readonly assignmentRepository: IWarehouseProfileAssignmentRepository,
    private readonly profileRepository: IWarehouseProfileRepository,
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly scopeKeyService: ScopeKeyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateWarehouseProfileAssignmentDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<WarehouseProfileAssignmentDto> {
    const profile = await this.profileRepository.FindById(request.WarehouseProfileId);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }

    let warehouseTypeCode: string | null = null;
    let warehouseId: string | null = null;

    if (request.AssignmentType === AssignmentType.WarehouseType) {
      if (typeof request.WarehouseTypeCode !== 'string' || request.WarehouseTypeCode.trim().length === 0) {
        throw new BusinessRuleException('WarehouseTypeCode is required for a WAREHOUSE_TYPE assignment');
      }
      warehouseTypeCode = request.WarehouseTypeCode.trim();
    } else if (request.AssignmentType === AssignmentType.Warehouse) {
      if (typeof request.WarehouseId !== 'string' || request.WarehouseId.trim().length === 0) {
        throw new BusinessRuleException('WarehouseId is required for a WAREHOUSE assignment');
      }
      const warehouse = await this.warehouseRepository.FindById(request.WarehouseId);
      if (!warehouse) {
        throw new NotFoundException('Warehouse not found');
      }
      if (warehouse.Status !== MasterDataStatus.Active) {
        throw new BusinessRuleException('Warehouse assignment target must be active');
      }
      warehouseId = warehouse.Id;
    } else {
      throw new BusinessRuleException('Unsupported assignment type');
    }

    const scopeKey = this.scopeKeyService.Build({
      WarehouseTypeCode: warehouseTypeCode ?? profile.WarehouseTypeCode,
      WarehouseId: warehouseId,
    });

    const now = new Date();
    const assignment = new WarehouseProfileAssignmentEntity({
      Id: randomUUID(),
      WarehouseProfileId: profile.Id,
      AssignmentType: request.AssignmentType,
      WarehouseTypeCode: warehouseTypeCode,
      WarehouseId: warehouseId,
      ScopeKey: scopeKey,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: request.CreatedBy ?? null,
      UpdatedBy: request.CreatedBy ?? null,
    });

    const buildEntry = (created: WarehouseProfileAssignmentEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.WarehouseProfile,
        ObjectId: created.Id,
        ObjectCode: created.ScopeKey,
        AfterJson: WarehouseProfileAssignmentDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
        WarehouseId: created.WarehouseId,
        OwnerId: null,
      });

    if (!this.auditedTransaction) {
      const created = await this.assignmentRepository.Create(assignment);
      return WarehouseProfileAssignmentDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.assignmentRepository.Create(assignment, manager);
      return { result: WarehouseProfileAssignmentDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
