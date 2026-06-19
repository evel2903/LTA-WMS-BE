import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/CreateItemCoverageUseCase';
import { GetItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/GetItemCoverageUseCase';
import { ListItemCoveragesUseCase } from '@modules/MasterData/Application/UseCases/ListItemCoveragesUseCase';
import { UpdateItemCoverageUseCase } from '@modules/MasterData/Application/UseCases/UpdateItemCoverageUseCase';
import { CreateItemCoverageRequest } from '@modules/MasterData/Presentation/Requests/CreateItemCoverageRequest';
import { ListItemCoverageQuery } from '@modules/MasterData/Presentation/Requests/ListItemCoverageQuery';
import { UpdateItemCoverageRequest } from '@modules/MasterData/Presentation/Requests/UpdateItemCoverageRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('item-coverages')
export class ItemCoverageController {
  constructor(
    private readonly createItemCoverageUseCase: CreateItemCoverageUseCase,
    private readonly getItemCoverageUseCase: GetItemCoverageUseCase,
    private readonly listItemCoveragesUseCase: ListItemCoveragesUseCase,
    private readonly updateItemCoverageUseCase: UpdateItemCoverageUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.ItemCoverage, {
    OwnerId: { In: 'body', Key: 'OwnerId' },
    WarehouseId: { In: 'body', Key: 'WarehouseId' },
  })
  public async Create(@Body() request: CreateItemCoverageRequest) {
    return await this.createItemCoverageUseCase.Execute(request);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.ItemCoverage)
  public async GetById(@Param('id') id: string) {
    return await this.getItemCoverageUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.ItemCoverage)
  public async List(@Query() query: ListItemCoverageQuery) {
    return await this.listItemCoveragesUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.ItemCoverage)
  public async Update(@Param('id') id: string, @Body() request: UpdateItemCoverageRequest) {
    return await this.updateItemCoverageUseCase.Execute({ Id: id, ...request });
  }
}
