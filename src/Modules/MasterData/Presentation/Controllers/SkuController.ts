import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreateSkuUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuUseCase';
import { GetSkuUseCase } from '@modules/MasterData/Application/UseCases/GetSkuUseCase';
import { GetSkuRuleFactsUseCase } from '@modules/MasterData/Application/UseCases/GetSkuRuleFactsUseCase';
import { ListSkusUseCase } from '@modules/MasterData/Application/UseCases/ListSkusUseCase';
import { UpdateSkuUseCase } from '@modules/MasterData/Application/UseCases/UpdateSkuUseCase';
import { CreateSkuRequest } from '@modules/MasterData/Presentation/Requests/CreateSkuRequest';
import { ListSkusQuery } from '@modules/MasterData/Presentation/Requests/ListSkusQuery';
import { UpdateSkuRequest } from '@modules/MasterData/Presentation/Requests/UpdateSkuRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('skus')
export class SkuController {
  constructor(
    private readonly createSkuUseCase: CreateSkuUseCase,
    private readonly getSkuUseCase: GetSkuUseCase,
    private readonly getSkuRuleFactsUseCase: GetSkuRuleFactsUseCase,
    private readonly listSkusUseCase: ListSkusUseCase,
    private readonly updateSkuUseCase: UpdateSkuUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Sku)
  public async Create(@Body() request: CreateSkuRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createSkuUseCase.Execute(request, context);
  }

  @Get(':id/rule-facts')
  @RequirePermission(ActionCode.Read, ObjectType.Sku)
  public async GetRuleFacts(@Param('id') id: string) {
    return await this.getSkuRuleFactsUseCase.Execute(id);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Sku)
  public async GetById(@Param('id') id: string) {
    return await this.getSkuUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Sku)
  public async List(@Query() query: ListSkusQuery) {
    return await this.listSkusUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Sku)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdateSkuRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.updateSkuUseCase.Execute({ Id: id, ...request }, context);
  }
}
