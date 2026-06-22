import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { CreateLabelTemplateUseCase } from '@modules/BarcodeLabel/Application/UseCases/CreateLabelTemplateUseCase';
import { CreateLabelTemplateVersionUseCase } from '@modules/BarcodeLabel/Application/UseCases/CreateLabelTemplateVersionUseCase';
import { GetLabelTemplateUseCase } from '@modules/BarcodeLabel/Application/UseCases/GetLabelTemplateUseCase';
import { ListLabelTemplatesUseCase } from '@modules/BarcodeLabel/Application/UseCases/ListLabelTemplatesUseCase';
import { CreateLabelTemplateRequest } from '@modules/BarcodeLabel/Presentation/Requests/CreateLabelTemplateRequest';
import { CreateLabelTemplateVersionRequest } from '@modules/BarcodeLabel/Presentation/Requests/CreateLabelTemplateVersionRequest';
import { ListLabelTemplatesQuery } from '@modules/BarcodeLabel/Presentation/Requests/ListLabelTemplatesQuery';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('label-templates')
export class LabelTemplateController {
  constructor(
    private readonly createLabelTemplateUseCase: CreateLabelTemplateUseCase,
    private readonly listLabelTemplatesUseCase: ListLabelTemplatesUseCase,
    private readonly getLabelTemplateUseCase: GetLabelTemplateUseCase,
    private readonly createLabelTemplateVersionUseCase: CreateLabelTemplateVersionUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.LabelTemplate)
  public async Create(@Body() request: CreateLabelTemplateRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createLabelTemplateUseCase.Execute(request, context);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.LabelTemplate)
  public async List(@Query() query: ListLabelTemplatesQuery) {
    return await this.listLabelTemplatesUseCase.Execute(query);
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.LabelTemplate)
  public async GetById(@Param('id') id: string) {
    return await this.getLabelTemplateUseCase.Execute(id);
  }

  @Post(':id/versions')
  @RequirePermission(ActionCode.Update, ObjectType.LabelTemplate)
  public async AddVersion(
    @Param('id') id: string,
    @Body() request: CreateLabelTemplateVersionRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.createLabelTemplateVersionUseCase.Execute({ TemplateId: id, ...request }, context);
  }
}
