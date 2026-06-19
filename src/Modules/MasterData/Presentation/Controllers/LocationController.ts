import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { CreateLocationUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationUseCase';
import { GetLocationUseCase } from '@modules/MasterData/Application/UseCases/GetLocationUseCase';
import { GetLocationTreeUseCase } from '@modules/MasterData/Application/UseCases/GetLocationTreeUseCase';
import { ListLocationsUseCase } from '@modules/MasterData/Application/UseCases/ListLocationsUseCase';
import { UpdateLocationUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationUseCase';
import { CreateLocationRequest } from '@modules/MasterData/Presentation/Requests/CreateLocationRequest';
import { GetLocationTreeQuery } from '@modules/MasterData/Presentation/Requests/GetLocationTreeQuery';
import { ListLocationsQuery } from '@modules/MasterData/Presentation/Requests/ListLocationsQuery';
import { UpdateLocationRequest } from '@modules/MasterData/Presentation/Requests/UpdateLocationRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('locations')
export class LocationController {
  constructor(
    private readonly createLocationUseCase: CreateLocationUseCase,
    private readonly getLocationUseCase: GetLocationUseCase,
    private readonly listLocationsUseCase: ListLocationsUseCase,
    private readonly getLocationTreeUseCase: GetLocationTreeUseCase,
    private readonly updateLocationUseCase: UpdateLocationUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Location)
  public async Create(@Body() request: CreateLocationRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createLocationUseCase.Execute(request, context);
  }

  @Get('tree')
  @RequirePermission(ActionCode.Read, ObjectType.Location)
  public async Tree(@Query() query: GetLocationTreeQuery) {
    return await this.getLocationTreeUseCase.Execute(query);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Location)
  public async GetById(@Param('id') id: string) {
    return await this.getLocationUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Location)
  public async List(@Query() query: ListLocationsQuery) {
    return await this.listLocationsUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Location)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdateLocationRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.updateLocationUseCase.Execute({ Id: id, ...request }, context);
  }
}
