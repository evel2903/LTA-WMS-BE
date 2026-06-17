import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateOwnerUseCase } from '@modules/MasterData/Application/UseCases/CreateOwnerUseCase';
import { GetOwnerUseCase } from '@modules/MasterData/Application/UseCases/GetOwnerUseCase';
import { ListOwnersUseCase } from '@modules/MasterData/Application/UseCases/ListOwnersUseCase';
import { UpdateOwnerUseCase } from '@modules/MasterData/Application/UseCases/UpdateOwnerUseCase';
import { CreateOwnerRequest } from '@modules/MasterData/Presentation/Requests/CreateOwnerRequest';
import { ListOwnersQuery } from '@modules/MasterData/Presentation/Requests/ListOwnersQuery';
import { UpdateOwnerRequest } from '@modules/MasterData/Presentation/Requests/UpdateOwnerRequest';

@Controller('owners')
export class OwnerController {
  constructor(
    private readonly createOwnerUseCase: CreateOwnerUseCase,
    private readonly getOwnerUseCase: GetOwnerUseCase,
    private readonly listOwnersUseCase: ListOwnersUseCase,
    private readonly updateOwnerUseCase: UpdateOwnerUseCase,
  ) {}

  @Post()
  public async Create(@Body() request: CreateOwnerRequest) {
    return await this.createOwnerUseCase.Execute(request);
  }

  @Get(':id')
  public async GetById(@Param('id') id: string) {
    return await this.getOwnerUseCase.Execute(id);
  }

  @Get()
  public async List(@Query() query: ListOwnersQuery) {
    return await this.listOwnersUseCase.Execute(query);
  }

  @Patch(':id')
  public async Update(@Param('id') id: string, @Body() request: UpdateOwnerRequest) {
    return await this.updateOwnerUseCase.Execute({ Id: id, ...request });
  }
}
