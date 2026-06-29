import { NotFoundException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { InboundOperationalStateDto } from '@modules/Inbound/Application/DTOs/InboundOperationalStateDto';
import { IInboundPlanRepository } from '@modules/Inbound/Application/Interfaces/IInboundPlanRepository';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertInboundPlanPermission } from '@modules/Inbound/Application/Services/InboundPlanPermission';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';

/**
 * IRM-01 — read-only aggregate of operational progress for an inbound plan.
 * Mirrors GetInboundPlanUseCase permission/scope; only ADDs a read path.
 */
export class GetInboundOperationalStateUseCase {
  constructor(
    private readonly inboundPlans: IInboundPlanRepository,
    private readonly receiving: IReceivingRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(id: string, actorUserId?: string | null): Promise<InboundOperationalStateDto> {
    const aggregate = await this.inboundPlans.FindById(id);
    if (!aggregate) throw new NotFoundException('Inbound plan not found');
    await AssertInboundPlanPermission(this.permissionChecker, actorUserId, ActionCode.Read, aggregate.Plan);

    const receipt = await this.receiving.FindReceiptByInboundPlanId(id);
    if (!receipt) {
      return {
        InboundPlanId: id,
        ReceivingSessions: [],
        ReceiptLines: [],
        QcTasks: [],
        QcResults: [],
        Lpns: [],
        Releases: [],
      };
    }

    const [sessions, lines, qcTasks, qcResults, lpns, releases] = await Promise.all([
      this.receiving.ListReceivingSessionsByInboundPlanId(id),
      this.receiving.ListReceiptLinesByReceiptId(receipt.Id),
      this.receiving.ListQcTasksByReceiptId(receipt.Id),
      this.receiving.ListQcResultsByReceiptId(receipt.Id),
      this.receiving.ListInboundLpnsByReceiptId(receipt.Id),
      this.receiving.ListInboundPutawayReleasesByReceiptId(receipt.Id),
    ]);

    const taskStatusById = new Map(qcTasks.map((task) => [task.Id, task.TaskStatus]));

    return {
      InboundPlanId: id,
      ReceivingSessions: sessions.map((session) => ReceivingDtoMapper.ToSessionDto(session, receipt)),
      ReceiptLines: lines.map((line) => ReceivingDtoMapper.ToLineDto(line)),
      QcTasks: qcTasks.map((task) => ReceivingDtoMapper.ToQcTaskDto(task)),
      QcResults: qcResults.map((result) =>
        // A recorded QC result implies its task was dispositioned, and the task is always
        // present here (same receipt, no qc-task delete path), so the ?? branch is an
        // unreachable defensive default. ponytail: keep until a qc-task delete path exists.
        ReceivingDtoMapper.ToQcResultDto(result, taskStatusById.get(result.QcTaskId) ?? QcTaskStatus.Dispositioned),
      ),
      Lpns: lpns.map((lpn) => ReceivingDtoMapper.ToInboundLpnDto(lpn)),
      Releases: releases.map((release) => ReceivingDtoMapper.ToInboundPutawayReleaseDto(release)),
    };
  }
}
