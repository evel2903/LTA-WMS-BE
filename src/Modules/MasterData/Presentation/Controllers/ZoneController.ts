import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateZoneUseCase } from '@modules/MasterData/Application/UseCases/CreateZoneUseCase';
import { GetZoneByIdUseCase } from '@modules/MasterData/Application/UseCases/GetZoneByIdUseCase';
import { ListZonesUseCase } from '@modules/MasterData/Application/UseCases/ListZonesUseCase';
import { UpdateZoneUseCase } from '@modules/MasterData/Application/UseCases/UpdateZoneUseCase';
import { CreateZoneRequest } from '@modules/MasterData/Presentation/Requests/CreateZoneRequest';
import { ListZonesQuery } from '@modules/MasterData/Presentation/Requests/ListZonesQuery';
import { UpdateZoneRequest } from '@modules/MasterData/Presentation/Requests/UpdateZoneRequest';

@Controller('zones')
export class ZoneController {
  constructor(
    private readonly createZoneUseCase: CreateZoneUseCase,
    private readonly getZoneByIdUseCase: GetZoneByIdUseCase,
    private readonly listZonesUseCase: ListZonesUseCase,
    private readonly updateZoneUseCase: UpdateZoneUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateZoneRequest) {
    return await this.createZoneUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getZoneByIdUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListZonesQuery) {
    return await this.listZonesUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateZoneRequest) {
    return await this.updateZoneUseCase.Execute({ Id: id, ...request });
  }
}
