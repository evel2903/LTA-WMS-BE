import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { QueryAuditLogsUseCase } from '@modules/AccessControl/Application/UseCases/QueryAuditLogsUseCase';
import { GetAuditLogUseCase } from '@modules/AccessControl/Application/UseCases/GetAuditLogUseCase';
import { QueryAuditLogsQuery } from '@modules/AccessControl/Presentation/Requests/QueryAuditLogsQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(
    private readonly queryAuditLogsUseCase: QueryAuditLogsUseCase,
    private readonly getAuditLogUseCase: GetAuditLogUseCase,
  ) {}

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.AuditLog)
  public async Query(@Query() query: QueryAuditLogsQuery) {
    return await this.queryAuditLogsUseCase.Execute({
      Page: query.Page,
      PageSize: query.PageSize,
      ActorUserId: query.ActorUserId,
      Action: query.Action,
      ObjectType: query.ObjectType,
      ObjectId: query.ObjectId,
      ReasonCodeId: query.ReasonCodeId,
      From: query.From != null ? new Date(query.From) : undefined,
      To: query.To != null ? new Date(query.To) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.AuditLog)
  public async GetById(@Param('id') id: string) {
    return await this.getAuditLogUseCase.Execute(id);
  }
}
