import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AddWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/AddWarehouseProfileRuleUseCase';
import { ListWarehouseProfileRulesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileRulesUseCase';
import { RemoveWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/RemoveWarehouseProfileRuleUseCase';
import { AddWarehouseProfileRuleRequest } from '@modules/WarehouseProfile/Presentation/Requests/AddWarehouseProfileRuleRequest';
import { ListWarehouseProfileRulesQuery } from '@modules/WarehouseProfile/Presentation/Requests/ListWarehouseProfileRulesQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('warehouse-profiles/:id/rules')
export class WarehouseProfileRuleController {
  constructor(
    private readonly addWarehouseProfileRuleUseCase: AddWarehouseProfileRuleUseCase,
    private readonly listWarehouseProfileRulesUseCase: ListWarehouseProfileRulesUseCase,
    private readonly removeWarehouseProfileRuleUseCase: RemoveWarehouseProfileRuleUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Update, ObjectType.WarehouseProfile)
  public async Create(
    @Param('id') id: string,
    @Body() request: AddWarehouseProfileRuleRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.addWarehouseProfileRuleUseCase.Execute({ WarehouseProfileId: id, ...request }, context);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.WarehouseProfile)
  public async List(@Param('id') id: string, @Query() query: ListWarehouseProfileRulesQuery) {
    return await this.listWarehouseProfileRulesUseCase.Execute(id, query);
  }

  @Delete(':ruleId')
  @HttpCode(204)
  @RequirePermission(ActionCode.Update, ObjectType.WarehouseProfile)
  public async Remove(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @CurrentAuditContext() context: AuditContext,
  ) {
    await this.removeWarehouseProfileRuleUseCase.Execute(id, ruleId, context);
  }
}
