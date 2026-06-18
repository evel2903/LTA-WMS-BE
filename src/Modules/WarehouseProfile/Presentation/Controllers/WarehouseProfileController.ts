import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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
  public async Create(@Body() request: CreateWarehouseProfileRequest) {
    return await this.createWarehouseProfileUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getWarehouseProfileUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListWarehouseProfilesQuery) {
    return await this.listWarehouseProfilesUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateWarehouseProfileRequest) {
    return await this.updateWarehouseProfileUseCase.Execute({ Id: id, ...request });
  }

  @Post(':id/activate')
  public async Activate(@Param('id') id: string, @Body() request: ActivateWarehouseProfileRequest) {
    return await this.activateWarehouseProfileUseCase.Execute({ Id: id, ...request });
  }

  @Post(':id/deactivate')
  public async Deactivate(@Param('id') id: string, @Body() request: DeactivateWarehouseProfileRequest) {
    return await this.deactivateWarehouseProfileUseCase.Execute({ Id: id, ...request });
  }
}
