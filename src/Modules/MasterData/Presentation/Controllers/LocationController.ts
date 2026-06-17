import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateLocationUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationUseCase';
import { GetLocationUseCase } from '@modules/MasterData/Application/UseCases/GetLocationUseCase';
import { GetLocationTreeUseCase } from '@modules/MasterData/Application/UseCases/GetLocationTreeUseCase';
import { ListLocationsUseCase } from '@modules/MasterData/Application/UseCases/ListLocationsUseCase';
import { UpdateLocationUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationUseCase';
import { CreateLocationRequest } from '@modules/MasterData/Presentation/Requests/CreateLocationRequest';
import { GetLocationTreeQuery } from '@modules/MasterData/Presentation/Requests/GetLocationTreeQuery';
import { ListLocationsQuery } from '@modules/MasterData/Presentation/Requests/ListLocationsQuery';
import { UpdateLocationRequest } from '@modules/MasterData/Presentation/Requests/UpdateLocationRequest';

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
  public async Create(@Body() request: CreateLocationRequest) {
    return await this.createLocationUseCase.Execute(request);
  }

  @Get('tree')
  public async Tree(@Query() query: GetLocationTreeQuery) {
    return await this.getLocationTreeUseCase.Execute(query);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getLocationUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListLocationsQuery) {
    return await this.listLocationsUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateLocationRequest) {
    return await this.updateLocationUseCase.Execute({ Id: id, ...request });
  }
}
