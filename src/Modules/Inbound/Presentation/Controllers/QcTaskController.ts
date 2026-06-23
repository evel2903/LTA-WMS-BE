import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { RecordQcResultUseCase } from '@modules/Inbound/Application/UseCases/RecordQcResultUseCase';
import { RecordQcResultRequest } from '@modules/Inbound/Presentation/Requests/RecordQcResultRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('qc-tasks')
export class QcTaskController {
  constructor(private readonly recordQcResultUseCase: RecordQcResultUseCase) {}

  @Post(':qcTaskId/results')
  @RequirePermission(ActionCode.Update, ObjectType.QcTask)
  public async RecordResult(
    @Param('qcTaskId') qcTaskId: string,
    @Body() request: RecordQcResultRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.recordQcResultUseCase.Execute({ QcTaskId: qcTaskId, ...request }, context);
  }
}
