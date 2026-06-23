import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ReprintPrintJobDto } from '@modules/BarcodeLabel/Application/DTOs/PreviewPrintJobDto';
import { PrintJobDto } from '@modules/BarcodeLabel/Application/DTOs/PrintJobDto';
import { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { BarcodeLabelDtoMapper } from '@modules/BarcodeLabel/Application/Mappers/BarcodeLabelDtoMapper';
import { AssertPrintJobPermission } from '@modules/BarcodeLabel/Application/UseCases/PrintJobPermission';
import { PrintJobEntity } from '@modules/BarcodeLabel/Domain/Entities/PrintJobEntity';
import { ReprintRequestEntity } from '@modules/BarcodeLabel/Domain/Entities/ReprintRequestEntity';
import { PrintJobStatus } from '@modules/BarcodeLabel/Domain/Enums/PrintJobStatus';

export class ReprintPrintJobUseCase {
  constructor(
    private readonly labels: IBarcodeLabelRepository,
    private readonly reasonCatalog: IReasonCodeCatalog,
    private readonly audited?: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(request: ReprintPrintJobDto, context: AuditContext = SystemAuditContext): Promise<PrintJobDto> {
    const reasonCode = request.ReasonCode?.trim();
    if (!reasonCode) {
      throw new BusinessRuleException('Reprint requires a reason code', { Reason: 'REASON_REQUIRED' });
    }
    const validated = await this.reasonCatalog.ValidateReason({
      ReasonCode: reasonCode,
      Action: ActionCode.Reprint,
      ObjectType: ObjectType.PrintJob,
    });

    const printJob = await this.labels.FindPrintJobById(request.PrintJobId);
    if (!printJob) throw new NotFoundException('Print job not found');
    await AssertPrintJobPermission(this.permissionChecker, context.ActorUserId, ActionCode.Reprint, {
      WarehouseId: printJob.WarehouseId,
      OwnerId: printJob.OwnerId,
    });

    if (!this.audited) {
      return await this.ReprintWithoutTransaction(printJob, request, context, reasonCode, validated.ReasonCodeId);
    }

    return this.audited.Run(async (manager) => {
      const lockedPrintJob = await this.labels.FindPrintJobByIdForUpdate(request.PrintJobId, manager);
      if (!lockedPrintJob) throw new NotFoundException('Print job not found');
      const before = BarcodeLabelDtoMapper.ToPrintJobDto(lockedPrintJob);
      const { updated, reprint } = await this.ApplyReprint(
        lockedPrintJob,
        request,
        context,
        reasonCode,
        validated.ReasonCodeId,
        manager,
      );

      return {
        result: BarcodeLabelDtoMapper.ToPrintJobDto(updated),
        entry: MergeAuditContext(context, {
          Action: ActionCode.Reprint,
          ObjectType: ObjectType.PrintJob,
          ObjectId: updated.Id,
          ObjectCode: updated.JobCode,
          BeforeJson: before as unknown as Record<string, unknown>,
          AfterJson: BarcodeLabelDtoMapper.ToPrintJobDto(updated) as unknown as Record<string, unknown>,
          ReasonCodeId: reprint.ReasonCodeId,
          ReasonNote: request.ReasonNote ?? null,
        }),
      };
    });
  }

  private async ReprintWithoutTransaction(
    printJob: PrintJobEntity,
    request: ReprintPrintJobDto,
    context: AuditContext,
    reasonCode: string,
    reasonCodeId: string,
  ): Promise<PrintJobDto> {
    const { updated } = await this.ApplyReprint(printJob, request, context, reasonCode, reasonCodeId);
    return BarcodeLabelDtoMapper.ToPrintJobDto(updated);
  }

  private async ApplyReprint(
    printJob: PrintJobEntity,
    request: ReprintPrintJobDto,
    context: AuditContext,
    reasonCode: string,
    reasonCodeId: string,
    manager?: EntityManager,
  ): Promise<{ updated: PrintJobEntity; reprint: ReprintRequestEntity }> {
    const now = new Date();
    const nextCount = printJob.ReprintCount + 1;
    printJob.ReprintCount = nextCount;
    printJob.Status = PrintJobStatus.Reprinted;
    printJob.UpdatedAt = now;
    printJob.UpdatedBy = context.ActorUserId;

    const reprint = new ReprintRequestEntity({
      Id: randomUUID(),
      OriginalPrintJobId: printJob.Id,
      ReprintSequence: nextCount,
      ReasonCode: reasonCode,
      ReasonCodeId: reasonCodeId,
      ReasonNote: request.ReasonNote ?? null,
      EvidenceRefs: request.EvidenceRefs ?? null,
      RequestedBy: context.ActorUserId,
      RequestedAt: now,
    });

    await this.labels.CreateReprintRequest(reprint, manager);
    const updated = await this.labels.UpdatePrintJob(printJob, manager);
    return { updated, reprint };
  }
}
