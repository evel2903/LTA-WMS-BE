import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationProfileUseCase';
import { GetLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/GetLocationProfileUseCase';
import { ListLocationProfilesUseCase } from '@modules/MasterData/Application/UseCases/ListLocationProfilesUseCase';
import { UpdateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationProfileUseCase';
import { CreateLocationProfileRequest } from '@modules/MasterData/Presentation/Requests/CreateLocationProfileRequest';
import { ListLocationProfilesQuery } from '@modules/MasterData/Presentation/Requests/ListLocationProfilesQuery';
import { UpdateLocationProfileRequest } from '@modules/MasterData/Presentation/Requests/UpdateLocationProfileRequest';

@Controller('location-profiles')
export class LocationProfileController {
  constructor(
    private readonly createLocationProfileUseCase: CreateLocationProfileUseCase,
    private readonly getLocationProfileUseCase: GetLocationProfileUseCase,
    private readonly listLocationProfilesUseCase: ListLocationProfilesUseCase,
    private readonly updateLocationProfileUseCase: UpdateLocationProfileUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateLocationProfileRequest) {
    return await this.createLocationProfileUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getLocationProfileUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListLocationProfilesQuery) {
    return await this.listLocationProfilesUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateLocationProfileRequest) {
    return await this.updateLocationProfileUseCase.Execute({ Id: id, ...request });
  }
}
