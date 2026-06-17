import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateSiteUseCase } from '@modules/MasterData/Application/UseCases/CreateSiteUseCase';
import { GetSiteByIdUseCase } from '@modules/MasterData/Application/UseCases/GetSiteByIdUseCase';
import { ListSitesUseCase } from '@modules/MasterData/Application/UseCases/ListSitesUseCase';
import { UpdateSiteUseCase } from '@modules/MasterData/Application/UseCases/UpdateSiteUseCase';
import { CreateSiteRequest } from '@modules/MasterData/Presentation/Requests/CreateSiteRequest';
import { ListSitesQuery } from '@modules/MasterData/Presentation/Requests/ListSitesQuery';
import { UpdateSiteRequest } from '@modules/MasterData/Presentation/Requests/UpdateSiteRequest';

@Controller('sites')
export class SiteController {
  constructor(
    private readonly createSiteUseCase: CreateSiteUseCase,
    private readonly getSiteByIdUseCase: GetSiteByIdUseCase,
    private readonly listSitesUseCase: ListSitesUseCase,
    private readonly updateSiteUseCase: UpdateSiteUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateSiteRequest) {
    return await this.createSiteUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getSiteByIdUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListSitesQuery) {
    return await this.listSitesUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateSiteRequest) {
    return await this.updateSiteUseCase.Execute({ Id: id, ...request });
  }
}
