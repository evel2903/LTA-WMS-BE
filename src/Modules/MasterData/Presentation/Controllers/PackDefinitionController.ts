import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreatePackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/CreatePackDefinitionUseCase';
import { GetPackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/GetPackDefinitionUseCase';
import { ListPackDefinitionsUseCase } from '@modules/MasterData/Application/UseCases/ListPackDefinitionsUseCase';
import { UpdatePackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/UpdatePackDefinitionUseCase';
import { CreatePackDefinitionRequest } from '@modules/MasterData/Presentation/Requests/CreatePackDefinitionRequest';
import { ListPackDefinitionQuery } from '@modules/MasterData/Presentation/Requests/ListPackDefinitionQuery';
import { UpdatePackDefinitionRequest } from '@modules/MasterData/Presentation/Requests/UpdatePackDefinitionRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('pack-definitions')
export class PackDefinitionController {
  constructor(
    private readonly createPackDefinitionUseCase: CreatePackDefinitionUseCase,
    private readonly getPackDefinitionUseCase: GetPackDefinitionUseCase,
    private readonly listPackDefinitionsUseCase: ListPackDefinitionsUseCase,
    private readonly updatePackDefinitionUseCase: UpdatePackDefinitionUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Sku)
  public async Create(@Body() request: CreatePackDefinitionRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createPackDefinitionUseCase.Execute(request, context);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Sku)
  public async GetById(@Param('id') id: string) {
    return await this.getPackDefinitionUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Sku)
  public async List(@Query() query: ListPackDefinitionQuery) {
    return await this.listPackDefinitionsUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Sku)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdatePackDefinitionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.updatePackDefinitionUseCase.Execute({ Id: id, ...request }, context);
  }
}
