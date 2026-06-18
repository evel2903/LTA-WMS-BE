import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateUomConversionUseCase } from '@modules/MasterData/Application/UseCases/CreateUomConversionUseCase';
import { GetUomConversionUseCase } from '@modules/MasterData/Application/UseCases/GetUomConversionUseCase';
import { ListUomConversionsUseCase } from '@modules/MasterData/Application/UseCases/ListUomConversionsUseCase';
import { UpdateUomConversionUseCase } from '@modules/MasterData/Application/UseCases/UpdateUomConversionUseCase';
import { CreateUomConversionRequest } from '@modules/MasterData/Presentation/Requests/CreateUomConversionRequest';
import { ListUomConversionQuery } from '@modules/MasterData/Presentation/Requests/ListUomConversionQuery';
import { UpdateUomConversionRequest } from '@modules/MasterData/Presentation/Requests/UpdateUomConversionRequest';

@Controller('uom-conversions')
export class UomConversionController {
  constructor(
    private readonly createUomConversionUseCase: CreateUomConversionUseCase,
    private readonly getUomConversionUseCase: GetUomConversionUseCase,
    private readonly listUomConversionsUseCase: ListUomConversionsUseCase,
    private readonly updateUomConversionUseCase: UpdateUomConversionUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateUomConversionRequest) {
    return await this.createUomConversionUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getUomConversionUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListUomConversionQuery) {
    return await this.listUomConversionsUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateUomConversionRequest) {
    return await this.updateUomConversionUseCase.Execute({ Id: id, ...request });
  }
}
