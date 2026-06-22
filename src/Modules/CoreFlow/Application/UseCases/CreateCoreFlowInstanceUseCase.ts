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
import { CreateCoreFlowInstanceDto, CoreFlowInstanceDto } from '@modules/CoreFlow/Application/DTOs/CoreFlowDtos';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowDtoMapper } from '@modules/CoreFlow/Application/Mappers/CoreFlowDtoMapper';
import { CoreFlowInstanceEntity } from '@modules/CoreFlow/Domain/Entities/CoreFlowInstanceEntity';
import { CoreFlowStageCode } from '@modules/CoreFlow/Domain/Enums/CoreFlowStageCode';
import { CoreFlowInstanceStatus } from '@modules/CoreFlow/Domain/Enums/CoreFlowInstanceStatus';

export class CreateCoreFlowInstanceUseCase {
  constructor(
    private readonly coreFlows: ICoreFlowRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateCoreFlowInstanceDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<CoreFlowInstanceDto> {
    const duplicate = await this.coreFlows.FindInstanceByBusinessReference(
      request.BusinessReference,
      request.WarehouseCode,
      request.OwnerCode ?? undefined,
    );
    if (duplicate) {
      throw new ConflictException('CoreFlow business reference already exists in this warehouse/owner context');
    }

    const now = new Date();
    const instance = new CoreFlowInstanceEntity({
      Id: randomUUID(),
      BusinessReference: request.BusinessReference,
      SourceSystem: request.SourceSystem,
      WarehouseCode: request.WarehouseCode,
      OwnerCode: request.OwnerCode ?? null,
      CorrelationId: request.CorrelationId?.trim() || randomUUID(),
      CurrentStage: CoreFlowStageCode.Inbound,
      Status: CoreFlowInstanceStatus.Active,
      Metadata: request.Metadata ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
      UpdatedBy: null,
    });

    const buildEntry = (created: CoreFlowInstanceEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.CoreFlow,
        ObjectId: created.Id,
        ObjectCode: created.BusinessReference,
        AfterJson: CoreFlowDtoMapper.ToInstanceDto(created) as unknown as Record<string, unknown>,
        WarehouseId: created.WarehouseCode,
        OwnerId: created.OwnerCode,
        ReferenceType: 'CoreFlowInstance',
        ReferenceId: created.Id,
      });

    if (!this.auditedTransaction) {
      const created = await this.coreFlows.CreateInstance(instance);
      return CoreFlowDtoMapper.ToInstanceDto(created);
    }

    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.coreFlows.CreateInstance(instance, manager);
      return { result: CoreFlowDtoMapper.ToInstanceDto(created), entry: buildEntry(created) };
    });
  }
}
