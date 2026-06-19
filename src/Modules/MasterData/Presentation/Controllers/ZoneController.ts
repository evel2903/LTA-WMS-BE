import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { AuthUser, CurrentUser } from '@modules/AccessControl/Presentation/Decorators/CurrentUser';
import { CreateZoneUseCase } from '@modules/MasterData/Application/UseCases/CreateZoneUseCase';
import { GetZoneByIdUseCase } from '@modules/MasterData/Application/UseCases/GetZoneByIdUseCase';
import { ListZonesUseCase } from '@modules/MasterData/Application/UseCases/ListZonesUseCase';
import { UpdateZoneUseCase } from '@modules/MasterData/Application/UseCases/UpdateZoneUseCase';
import { CreateZoneRequest } from '@modules/MasterData/Presentation/Requests/CreateZoneRequest';
import { ListZonesQuery } from '@modules/MasterData/Presentation/Requests/ListZonesQuery';
import { UpdateZoneRequest } from '@modules/MasterData/Presentation/Requests/UpdateZoneRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('zones')
export class ZoneController {
  constructor(
    private readonly createZoneUseCase: CreateZoneUseCase,
    private readonly getZoneByIdUseCase: GetZoneByIdUseCase,
    private readonly listZonesUseCase: ListZonesUseCase,
    private readonly updateZoneUseCase: UpdateZoneUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Zone, { WarehouseId: { In: 'body', Key: 'WarehouseId' } })
  public async Create(@Body() request: CreateZoneRequest) {
    return await this.createZoneUseCase.Execute(request);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Zone)
  public async GetById(@Param('id') id: string) {
    return await this.getZoneByIdUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Zone)
  public async List(@Query() query: ListZonesQuery) {
    return await this.listZonesUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Zone)
  public async Update(@Param('id') id: string, @Body() request: UpdateZoneRequest, @CurrentUser() user?: AuthUser) {
    return await this.updateZoneUseCase.Execute({ Id: id, ...request, ActorUserId: user?.UserId });
  }
}
