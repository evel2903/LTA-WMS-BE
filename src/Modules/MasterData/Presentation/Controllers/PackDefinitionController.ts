import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/CreatePackDefinitionUseCase';
import { GetPackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/GetPackDefinitionUseCase';
import { ListPackDefinitionsUseCase } from '@modules/MasterData/Application/UseCases/ListPackDefinitionsUseCase';
import { UpdatePackDefinitionUseCase } from '@modules/MasterData/Application/UseCases/UpdatePackDefinitionUseCase';
import { CreatePackDefinitionRequest } from '@modules/MasterData/Presentation/Requests/CreatePackDefinitionRequest';
import { ListPackDefinitionQuery } from '@modules/MasterData/Presentation/Requests/ListPackDefinitionQuery';
import { UpdatePackDefinitionRequest } from '@modules/MasterData/Presentation/Requests/UpdatePackDefinitionRequest';

@Controller('pack-definitions')
export class PackDefinitionController {
  constructor(
    private readonly createPackDefinitionUseCase: CreatePackDefinitionUseCase,
    private readonly getPackDefinitionUseCase: GetPackDefinitionUseCase,
    private readonly listPackDefinitionsUseCase: ListPackDefinitionsUseCase,
    private readonly updatePackDefinitionUseCase: UpdatePackDefinitionUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreatePackDefinitionRequest) {
    return await this.createPackDefinitionUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getPackDefinitionUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListPackDefinitionQuery) {
    return await this.listPackDefinitionsUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdatePackDefinitionRequest) {
    return await this.updatePackDefinitionUseCase.Execute({ Id: id, ...request });
  }
}
