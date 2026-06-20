import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { RequestOverrideUseCase } from '@modules/WarehouseProfile/Application/UseCases/RequestOverrideUseCase';
import { GetOverrideLogUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetOverrideLogUseCase';
import { ListOverrideLogsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListOverrideLogsUseCase';
import { RequestOverrideRequest } from '@modules/WarehouseProfile/Presentation/Requests/RequestOverrideRequest';
import { ListOverrideLogsQuery } from '@modules/WarehouseProfile/Presentation/Requests/ListOverrideLogsQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('overrides')
export class OverrideController {
  constructor(
    private readonly requestOverrideUseCase: RequestOverrideUseCase,
    private readonly getOverrideLogUseCase: GetOverrideLogUseCase,
    private readonly listOverrideLogsUseCase: ListOverrideLogsUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Override, ObjectType.OverrideLog)
  public async Request(@Body() request: RequestOverrideRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.requestOverrideUseCase.Execute(request, context);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.OverrideLog)
  public async GetById(@Param('id') id: string) {
    return await this.getOverrideLogUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.OverrideLog)
  public async List(@Query() query: ListOverrideLogsQuery) {
    return await this.listOverrideLogsUseCase.Execute(query);
  }
}
