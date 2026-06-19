import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { AuthUser, CurrentUser } from '@modules/AccessControl/Presentation/Decorators/CurrentUser';
import { CreateReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/CreateReasonCodeUseCase';
import { GetReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/GetReasonCodeUseCase';
import { ListReasonCodesUseCase } from '@modules/AccessControl/Application/UseCases/ListReasonCodesUseCase';
import { UpdateReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/UpdateReasonCodeUseCase';
import { CreateReasonCodeRequest } from '@modules/AccessControl/Presentation/Requests/CreateReasonCodeRequest';
import { ListReasonCodesQuery } from '@modules/AccessControl/Presentation/Requests/ListReasonCodesQuery';
import { UpdateReasonCodeRequest } from '@modules/AccessControl/Presentation/Requests/UpdateReasonCodeRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('reason-codes')
export class ReasonCodeController {
  constructor(
    private readonly createReasonCodeUseCase: CreateReasonCodeUseCase,
    private readonly getReasonCodeUseCase: GetReasonCodeUseCase,
    private readonly listReasonCodesUseCase: ListReasonCodesUseCase,
    private readonly updateReasonCodeUseCase: UpdateReasonCodeUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.ReasonCode)
  public async Create(@Body() request: CreateReasonCodeRequest, @CurrentUser() user?: AuthUser) {
    return await this.createReasonCodeUseCase.Execute({ ...request, ActorUserId: user?.UserId });
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.ReasonCode)
  public async GetById(@Param('id') id: string) {
    return await this.getReasonCodeUseCase.Execute(id);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.ReasonCode)
  public async List(@Query() query: ListReasonCodesQuery) {
    return await this.listReasonCodesUseCase.Execute(query);
  }

  @Patch(':id')
  @RequirePermission(ActionCode.Update, ObjectType.ReasonCode)
  public async Update(
    @Param('id') id: string,
    @Body() request: UpdateReasonCodeRequest,
    @CurrentUser() user?: AuthUser,
  ) {
    return await this.updateReasonCodeUseCase.Execute({ Id: id, ...request, ActorUserId: user?.UserId });
  }
}
