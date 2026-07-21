import { NotFoundException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ReceiptOperationalStateDto } from '@modules/Inbound/Application/DTOs/ReceiptOperationalStateDto';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertReceiptPermission } from '@modules/Inbound/Application/Services/ReceiptPermission';
import { QcTaskStatus } from '@modules/Inbound/Domain/Enums/QcTaskStatus';

export class GetReceiptOperationalStateUseCase {
  constructor(
    private readonly receiving: IReceivingRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(id: string, actorUserId?: string | null): Promise<ReceiptOperationalStateDto> {
    const receipt = await this.receiving.FindReceiptById(id);
    if (!receipt) throw new NotFoundException('Receipt not found');
    await AssertReceiptPermission(this.permissionChecker, actorUserId, ActionCode.Read, receipt);
    const [sessions, lines, qcTasks, qcResults, lpns, releases, discrepancies] = await Promise.all([
      this.receiving.ListReceivingSessionsByReceiptId(id),
      this.receiving.ListReceiptLinesByReceiptId(id),
      this.receiving.ListQcTasksByReceiptId(id),
      this.receiving.ListQcResultsByReceiptId(id),
      this.receiving.ListInboundLpnsByReceiptId(id),
      this.receiving.ListInboundPutawayReleasesByReceiptId(id),
      this.receiving.ListInboundDiscrepanciesByReceiptId(id),
    ]);
    const taskStatusById = new Map(qcTasks.map((task) => [task.Id, task.TaskStatus]));
    return {
      ReceiptId: id,
      InboundPlanId: receipt.InboundPlanId,
      Receipt: ReceivingDtoMapper.ToReceiptDto(receipt),
      ReceivingSessions: sessions.map((session) => ReceivingDtoMapper.ToSessionDto(session, receipt)),
      ReceiptLines: lines.map((line) => ReceivingDtoMapper.ToLineDto(line)),
      QcTasks: qcTasks.map((task) => ReceivingDtoMapper.ToQcTaskDto(task)),
      QcResults: qcResults.map((result) =>
        ReceivingDtoMapper.ToQcResultDto(result, taskStatusById.get(result.QcTaskId) ?? QcTaskStatus.Dispositioned),
      ),
      Lpns: lpns.map((lpn) => ReceivingDtoMapper.ToInboundLpnDto(lpn)),
      Releases: releases.map((release) => ReceivingDtoMapper.ToInboundPutawayReleaseDto(release)),
      Discrepancies: discrepancies.map((discrepancy) => ReceivingDtoMapper.ToDiscrepancyDto(discrepancy)),
    };
  }
}
