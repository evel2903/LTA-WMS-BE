import { NotFoundException } from '@common/Exceptions/AppException';
import { AuditContext, SystemAuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { PrintJobDto } from '@modules/BarcodeLabel/Application/DTOs/PrintJobDto';
import { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { BarcodeLabelDtoMapper } from '@modules/BarcodeLabel/Application/Mappers/BarcodeLabelDtoMapper';
import { AssertPrintJobPermission } from '@modules/BarcodeLabel/Application/UseCases/PrintJobPermission';

export class GetPrintJobUseCase {
  constructor(
    private readonly labels: IBarcodeLabelRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(id: string, context: AuditContext = SystemAuditContext): Promise<PrintJobDto> {
    const printJob = await this.labels.FindPrintJobById(id);
    if (!printJob) throw new NotFoundException('Print job not found');
    await AssertPrintJobPermission(this.permissionChecker, context.ActorUserId, ActionCode.Read, {
      WarehouseId: printJob.WarehouseId,
      OwnerId: printJob.OwnerId,
    });
    return BarcodeLabelDtoMapper.ToPrintJobDto(printJob);
  }
}
