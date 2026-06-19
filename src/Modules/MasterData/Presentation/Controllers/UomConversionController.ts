import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateUomConversionUseCase } from '@modules/MasterData/Application/UseCases/CreateUomConversionUseCase';
import { GetUomConversionUseCase } from '@modules/MasterData/Application/UseCases/GetUomConversionUseCase';
import { ListUomConversionsUseCase } from '@modules/MasterData/Application/UseCases/ListUomConversionsUseCase';
import { UpdateUomConversionUseCase } from '@modules/MasterData/Application/UseCases/UpdateUomConversionUseCase';
import { CreateUomConversionRequest } from '@modules/MasterData/Presentation/Requests/CreateUomConversionRequest';
import { ListUomConversionQuery } from '@modules/MasterData/Presentation/Requests/ListUomConversionQuery';
import { UpdateUomConversionRequest } from '@modules/MasterData/Presentation/Requests/UpdateUomConversionRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('uom-conversions')
export class UomConversionController {
  constructor(
    private readonly createUomConversionUseCase: CreateUomConversionUseCase,
    private readonly getUomConversionUseCase: GetUomConversionUseCase,
    private readonly listUomConversionsUseCase: ListUomConversionsUseCase,
    private readonly updateUomConversionUseCase: UpdateUomConversionUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Uom)
  public async Create(@Body() request: CreateUomConversionRequest) {
    return await this.createUomConversionUseCase.Execute(request);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Uom)
  public async GetById(@Param('id') id: string) {
    return await this.getUomConversionUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Uom)
  public async List(@Query() query: ListUomConversionQuery) {
    return await this.listUomConversionsUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Uom)
  public async Update(@Param('id') id: string, @Body() request: UpdateUomConversionRequest) {
    return await this.updateUomConversionUseCase.Execute({ Id: id, ...request });
  }
}
