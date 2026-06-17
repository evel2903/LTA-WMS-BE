import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/CreateWarehouseUseCase';
import { GetWarehouseByIdUseCase } from '@modules/MasterData/Application/UseCases/GetWarehouseByIdUseCase';
import { ListWarehousesUseCase } from '@modules/MasterData/Application/UseCases/ListWarehousesUseCase';
import { UpdateWarehouseUseCase } from '@modules/MasterData/Application/UseCases/UpdateWarehouseUseCase';
import { CreateWarehouseRequest } from '@modules/MasterData/Presentation/Requests/CreateWarehouseRequest';
import { ListWarehousesQuery } from '@modules/MasterData/Presentation/Requests/ListWarehousesQuery';
import { UpdateWarehouseRequest } from '@modules/MasterData/Presentation/Requests/UpdateWarehouseRequest';

@Controller('warehouses')
export class WarehouseController {
  constructor(
    private readonly createWarehouseUseCase: CreateWarehouseUseCase,
    private readonly getWarehouseByIdUseCase: GetWarehouseByIdUseCase,
    private readonly listWarehousesUseCase: ListWarehousesUseCase,
    private readonly updateWarehouseUseCase: UpdateWarehouseUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateWarehouseRequest) {
    return await this.createWarehouseUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getWarehouseByIdUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListWarehousesQuery) {
    return await this.listWarehousesUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateWarehouseRequest) {
    return await this.updateWarehouseUseCase.Execute({ Id: id, ...request });
  }
}
