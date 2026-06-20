import { randomUUID } from 'crypto';
import { BusinessRuleException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { ExceptionState } from '@modules/AccessControl/Domain/Enums/ExceptionState';
import { ExceptionCaseEntity } from '@modules/AccessControl/Domain/Entities/ExceptionCaseEntity';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { CreateExceptionDto, ExceptionCaseDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { ExceptionCaseDtoMapper } from '@modules/AccessControl/Application/Mappers/ExceptionCaseDtoMapper';

/**
 * Raises an exception case in state DETECTED (architecture 6.8 / AC1, AC3). The exception type
 * is validated against the C8 control-exception catalog (unknown / DeferredV1Plus is rejected),
 * which also supplies the default Severity (caller may override). Object reference
 * (ReferenceType + ReferenceId) is mandatory at create; owner/reason are set later
 * (Assign/Resolve). The create + its Create audit row commit in one transaction (AC4).
 */
export class CreateExceptionUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it.
  constructor(
    private readonly cases: IExceptionCaseRepository,
    private readonly controlExceptionCatalog: IControlExceptionCatalog,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateExceptionDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<ExceptionCaseDto> {
    if (!request.ReferenceType || !request.ReferenceId) {
      throw new BusinessRuleException('Exception requires a business object reference (ReferenceType + ReferenceId)');
    }

    // C8 validates the exception type (throws for unknown / DeferredV1Plus) and supplies the
    // catalog defaults (category/severity/reason/evidence requirements).
    const catalogEntry = await this.controlExceptionCatalog.ValidateExceptionType(request.ExceptionType);
    const severity = request.Severity ?? catalogEntry.Severity;

    const now = new Date();
    const entity = new ExceptionCaseEntity({
      Id: randomUUID(),
      ExceptionType: catalogEntry.Code,
      State: ExceptionState.Detected,
      ReferenceType: request.ReferenceType,
      ReferenceId: request.ReferenceId,
      WarehouseId: request.WarehouseId ?? null,
      OwnerId: request.OwnerId ?? null,
      DetectedRuleId: request.DetectedRuleId ?? null,
      Severity: severity,
      EvidenceRefs: request.EvidenceRefs ?? null,
      OpenedAt: now,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
    });

    const buildEntry = (created: ExceptionCaseEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.ExceptionCase,
        ObjectId: created.Id,
        ObjectCode: created.ExceptionType,
        AfterJson: ExceptionCaseDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
        ReferenceType: created.ReferenceType,
        ReferenceId: created.ReferenceId,
        WarehouseId: created.WarehouseId,
        OwnerId: created.OwnerId,
        EvidenceRefs: created.EvidenceRefs,
      });

    if (!this.auditedTransaction) {
      const created = await this.cases.Create(entity);
      return ExceptionCaseDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.cases.Create(entity, manager);
      return { result: ExceptionCaseDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
