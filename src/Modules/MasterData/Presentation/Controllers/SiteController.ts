import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreateSiteUseCase } from '@modules/MasterData/Application/UseCases/CreateSiteUseCase';
import { GetSiteByIdUseCase } from '@modules/MasterData/Application/UseCases/GetSiteByIdUseCase';
import { ListSitesUseCase } from '@modules/MasterData/Application/UseCases/ListSitesUseCase';
import { UpdateSiteUseCase } from '@modules/MasterData/Application/UseCases/UpdateSiteUseCase';
import { CreateSiteRequest } from '@modules/MasterData/Presentation/Requests/CreateSiteRequest';
import { ListSitesQuery } from '@modules/MasterData/Presentation/Requests/ListSitesQuery';
import { UpdateSiteRequest } from '@modules/MasterData/Presentation/Requests/UpdateSiteRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('sites')
export class SiteController {
  constructor(
    private readonly createSiteUseCase: CreateSiteUseCase,
    private readonly getSiteByIdUseCase: GetSiteByIdUseCase,
    private readonly listSitesUseCase: ListSitesUseCase,
    private readonly updateSiteUseCase: UpdateSiteUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Site)
  public async Create(@Body() request: CreateSiteRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createSiteUseCase.Execute(request, context);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Site)
  public async GetById(@Param('id') id: string) {
    return await this.getSiteByIdUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Site)
  public async List(@Query() query: ListSitesQuery) {
    return await this.listSitesUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Site)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdateSiteRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.updateSiteUseCase.Execute({ Id: id, ...request }, context);
  }
}
