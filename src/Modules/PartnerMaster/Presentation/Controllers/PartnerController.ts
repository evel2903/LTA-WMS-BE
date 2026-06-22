import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/CreatePartnerUseCase';
import { DeactivatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/DeactivatePartnerUseCase';
import { GetPartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/GetPartnerUseCase';
import { ListPartnersUseCase } from '@modules/PartnerMaster/Application/UseCases/ListPartnersUseCase';
import { ResolvePartnerByReferenceUseCase } from '@modules/PartnerMaster/Application/UseCases/ResolvePartnerByReferenceUseCase';
import { UpdatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/UpdatePartnerUseCase';
import { CreatePartnerRequest } from '@modules/PartnerMaster/Presentation/Requests/CreatePartnerRequest';
import { DeactivatePartnerRequest } from '@modules/PartnerMaster/Presentation/Requests/DeactivatePartnerRequest';
import { ListPartnersQuery } from '@modules/PartnerMaster/Presentation/Requests/ListPartnersQuery';
import { ResolvePartnerByReferenceQuery } from '@modules/PartnerMaster/Presentation/Requests/ResolvePartnerByReferenceQuery';
import { UpdatePartnerRequest } from '@modules/PartnerMaster/Presentation/Requests/UpdatePartnerRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('partners')
export class PartnerController {
  constructor(
    private readonly createPartnerUseCase: CreatePartnerUseCase,
    private readonly getPartnerUseCase: GetPartnerUseCase,
    private readonly listPartnersUseCase: ListPartnersUseCase,
    private readonly resolvePartnerByReferenceUseCase: ResolvePartnerByReferenceUseCase,
    private readonly updatePartnerUseCase: UpdatePartnerUseCase,
    private readonly deactivatePartnerUseCase: DeactivatePartnerUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Partner)
  public async Create(@Body() request: CreatePartnerRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createPartnerUseCase.Execute(request, context);
  }

  @Get('resolve')
  @RequirePermission(ActionCode.Read, ObjectType.Partner)
  public async Resolve(@Query() query: ResolvePartnerByReferenceQuery) {
    return await this.resolvePartnerByReferenceUseCase.Execute(query);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Partner)
  public async GetById(@Param('id') id: string) {
    return await this.getPartnerUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Partner)
  public async List(@Query() query: ListPartnersQuery) {
    return await this.listPartnersUseCase.Execute(query);
  }

  @Patch(':id/deactivate')
  @RequirePermission(ActionCode.DeleteCancel, ObjectType.Partner)
  public async Deactivate(
    @Param('id') id: string,
    @Body() request: DeactivatePartnerRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.deactivatePartnerUseCase.Execute({ Id: id, ...request }, context);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Partner)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdatePartnerRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.updatePartnerUseCase.Execute({ Id: id, ...request }, context);
  }
}
