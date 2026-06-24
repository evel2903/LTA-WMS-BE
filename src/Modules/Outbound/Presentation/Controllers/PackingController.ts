import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import {
  ClosePackageUseCase,
  CreatePackageUseCase,
  GetPackageUseCase,
  ListPackagesUseCase,
  MarkPackageReadyForStagingUseCase,
  RecordPackCheckUseCase,
  StartPackSessionUseCase,
} from '@modules/Outbound/Application/UseCases/PackingUseCases';
import {
  ClosePackageRequest,
  CreatePackageRequest,
  ListPackagesQuery,
  ReadyForStagingRequest,
  RecordPackCheckRequest,
  StartPackSessionRequest,
} from '@modules/Outbound/Presentation/Requests/PackingRequests';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('packing')
export class PackingController {
  constructor(
    private readonly listPackagesUseCase: ListPackagesUseCase,
    private readonly getPackageUseCase: GetPackageUseCase,
    private readonly startPackSessionUseCase: StartPackSessionUseCase,
    private readonly recordPackCheckUseCase: RecordPackCheckUseCase,
    private readonly createPackageUseCase: CreatePackageUseCase,
    private readonly closePackageUseCase: ClosePackageUseCase,
    private readonly markPackageReadyForStagingUseCase: MarkPackageReadyForStagingUseCase,
  ) {}

  @Get('packages')
  @RequirePermission(ActionCode.Read, ObjectType.Package, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  public async ListPackages(@Query() query: ListPackagesQuery, @CurrentAuditContext() context: AuditContext) {
    return this.listPackagesUseCase.Execute(query, context.ActorUserId);
  }

  @Get('packages/:id')
  @RequirePermission(ActionCode.Read, ObjectType.Package)
  public async GetPackage(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return this.getPackageUseCase.Execute(id, context.ActorUserId);
  }

  @Post('sessions')
  @RequirePermission(ActionCode.Create, ObjectType.Package)
  public async StartSession(@Body() request: StartPackSessionRequest, @CurrentAuditContext() context: AuditContext) {
    return this.startPackSessionUseCase.Execute(request, context);
  }

  @Post('sessions/:id/check')
  @RequirePermission(ActionCode.Update, ObjectType.Package)
  public async RecordCheck(
    @Param('id') id: string,
    @Body() request: RecordPackCheckRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.recordPackCheckUseCase.Execute(id, request, context);
  }

  @Post('packages')
  @RequirePermission(ActionCode.Create, ObjectType.Package)
  public async CreatePackage(@Body() request: CreatePackageRequest, @CurrentAuditContext() context: AuditContext) {
    return this.createPackageUseCase.Execute(request, context);
  }

  @Post('packages/:id/close')
  @RequirePermission(ActionCode.Update, ObjectType.Package)
  public async ClosePackage(
    @Param('id') id: string,
    @Body() request: ClosePackageRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.closePackageUseCase.Execute(id, request, context);
  }

  @Post('packages/:id/ready-for-staging')
  @RequirePermission(ActionCode.Update, ObjectType.Package)
  public async ReadyForStaging(
    @Param('id') id: string,
    @Body() request: ReadyForStagingRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return this.markPackageReadyForStagingUseCase.Execute(id, request, context);
  }
}
