import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationProfileUseCase';
import { GetLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/GetLocationProfileUseCase';
import { ListLocationProfilesUseCase } from '@modules/MasterData/Application/UseCases/ListLocationProfilesUseCase';
import { UpdateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationProfileUseCase';
import { CreateLocationProfileRequest } from '@modules/MasterData/Presentation/Requests/CreateLocationProfileRequest';
import { ListLocationProfilesQuery } from '@modules/MasterData/Presentation/Requests/ListLocationProfilesQuery';
import { UpdateLocationProfileRequest } from '@modules/MasterData/Presentation/Requests/UpdateLocationProfileRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('location-profiles')
export class LocationProfileController {
  constructor(
    private readonly createLocationProfileUseCase: CreateLocationProfileUseCase,
    private readonly getLocationProfileUseCase: GetLocationProfileUseCase,
    private readonly listLocationProfilesUseCase: ListLocationProfilesUseCase,
    private readonly updateLocationProfileUseCase: UpdateLocationProfileUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.LocationProfile)
  public async Create(@Body() request: CreateLocationProfileRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createLocationProfileUseCase.Execute(request, context);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.LocationProfile)
  public async GetById(@Param('id') id: string) {
    return await this.getLocationProfileUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.LocationProfile)
  public async List(@Query() query: ListLocationProfilesQuery) {
    return await this.listLocationProfilesUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.LocationProfile)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdateLocationProfileRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.updateLocationProfileUseCase.Execute({ Id: id, ...request }, context);
  }
}
