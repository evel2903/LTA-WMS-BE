import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { CreateSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/CreateSkuBarcodeUseCase';
import { GetSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/GetSkuBarcodeUseCase';
import { ListSkuBarcodesUseCase } from '@modules/MasterData/Application/UseCases/ListSkuBarcodesUseCase';
import { ResolveSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/ResolveSkuBarcodeUseCase';
import { UpdateSkuBarcodeUseCase } from '@modules/MasterData/Application/UseCases/UpdateSkuBarcodeUseCase';
import { CreateSkuBarcodeRequest } from '@modules/MasterData/Presentation/Requests/CreateSkuBarcodeRequest';
import { ListSkuBarcodeQuery } from '@modules/MasterData/Presentation/Requests/ListSkuBarcodeQuery';
import { ResolveSkuBarcodeQuery } from '@modules/MasterData/Presentation/Requests/ResolveSkuBarcodeQuery';
import { UpdateSkuBarcodeRequest } from '@modules/MasterData/Presentation/Requests/UpdateSkuBarcodeRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('sku-barcodes')
export class SkuBarcodeController {
  constructor(
    private readonly createSkuBarcodeUseCase: CreateSkuBarcodeUseCase,
    private readonly getSkuBarcodeUseCase: GetSkuBarcodeUseCase,
    private readonly listSkuBarcodesUseCase: ListSkuBarcodesUseCase,
    private readonly resolveSkuBarcodeUseCase: ResolveSkuBarcodeUseCase,
    private readonly updateSkuBarcodeUseCase: UpdateSkuBarcodeUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.Sku)
  public async Create(@Body() request: CreateSkuBarcodeRequest) {
    return await this.createSkuBarcodeUseCase.Execute(request);
  }

  @Get('resolve')
  @RequirePermission(ActionCode.Read, ObjectType.Sku)
  public async Resolve(@Query() query: ResolveSkuBarcodeQuery) {
    return await this.resolveSkuBarcodeUseCase.Execute(query);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.Sku)
  public async GetById(@Param('id') id: string) {
    return await this.getSkuBarcodeUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.Sku)
  public async List(@Query() query: ListSkuBarcodeQuery) {
    return await this.listSkuBarcodesUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.Sku)
  public async Update(@Param('id') id: string, @Body() request: UpdateSkuBarcodeRequest) {
    return await this.updateSkuBarcodeUseCase.Execute({ Id: id, ...request });
  }
}
