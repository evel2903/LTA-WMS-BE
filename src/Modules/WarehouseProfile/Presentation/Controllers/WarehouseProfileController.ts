import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { GetWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetWarehouseProfileUseCase';
import { ListWarehouseProfilesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfilesUseCase';
import { UpdateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/UpdateWarehouseProfileUseCase';
import { ActivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/ActivateWarehouseProfileUseCase';
import { DeactivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/DeactivateWarehouseProfileUseCase';
import { CreateWarehouseProfileRequest } from '@modules/WarehouseProfile/Presentation/Requests/CreateWarehouseProfileRequest';
import { ListWarehouseProfilesQuery } from '@modules/WarehouseProfile/Presentation/Requests/ListWarehouseProfilesQuery';
import { UpdateWarehouseProfileRequest } from '@modules/WarehouseProfile/Presentation/Requests/UpdateWarehouseProfileRequest';
import { ActivateWarehouseProfileRequest } from '@modules/WarehouseProfile/Presentation/Requests/ActivateWarehouseProfileRequest';
import { DeactivateWarehouseProfileRequest } from '@modules/WarehouseProfile/Presentation/Requests/DeactivateWarehouseProfileRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('warehouse-profiles')
export class WarehouseProfileController {
  constructor(
    private readonly createWarehouseProfileUseCase: CreateWarehouseProfileUseCase,
    private readonly getWarehouseProfileUseCase: GetWarehouseProfileUseCase,
    private readonly listWarehouseProfilesUseCase: ListWarehouseProfilesUseCase,
    private readonly updateWarehouseProfileUseCase: UpdateWarehouseProfileUseCase,
    private readonly activateWarehouseProfileUseCase: ActivateWarehouseProfileUseCase,
    private readonly deactivateWarehouseProfileUseCase: DeactivateWarehouseProfileUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.WarehouseProfile, {
    WarehouseId: { In: 'body', Key: 'WarehouseId' },
    ZoneId: { In: 'body', Key: 'ZoneId' },
    OwnerId: { In: 'body', Key: 'OwnerId' },
  })
  public async Create(@Body() request: CreateWarehouseProfileRequest) {
    return await this.createWarehouseProfileUseCase.Execute(request);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.WarehouseProfile)
  public async GetById(@Param('id') id: string) {
    return await this.getWarehouseProfileUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.WarehouseProfile)
  public async List(@Query() query: ListWarehouseProfilesQuery) {
    return await this.listWarehouseProfilesUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.WarehouseProfile)
  public async Update(@Param('id') id: string, @Body() request: UpdateWarehouseProfileRequest) {
    return await this.updateWarehouseProfileUseCase.Execute({ Id: id, ...request });
  }

  @Post(':id/activate')
  @RequirePermission(ActionCode.Update, ObjectType.WarehouseProfile)
  public async Activate(@Param('id') id: string, @Body() request: ActivateWarehouseProfileRequest) {
    return await this.activateWarehouseProfileUseCase.Execute({ Id: id, ...request });
  }

  @Post(':id/deactivate')
  @RequirePermission(ActionCode.Update, ObjectType.WarehouseProfile)
  public async Deactivate(@Param('id') id: string, @Body() request: DeactivateWarehouseProfileRequest) {
    return await this.deactivateWarehouseProfileUseCase.Execute({ Id: id, ...request });
  }
}
