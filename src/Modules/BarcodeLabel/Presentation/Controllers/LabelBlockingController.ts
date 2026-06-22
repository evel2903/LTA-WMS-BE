import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ValidateLabelBlockingUseCase } from '@modules/BarcodeLabel/Application/UseCases/ValidateLabelBlockingUseCase';
import { ValidateLabelBlockingRequest } from '@modules/BarcodeLabel/Presentation/Requests/ValidateLabelBlockingRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('label-blocking')
export class LabelBlockingController {
  constructor(private readonly validateLabelBlockingUseCase: ValidateLabelBlockingUseCase) {}

  @Post('validate')
  @RequirePermission(ActionCode.Read, ObjectType.PrintJob, {
    WarehouseId: { In: 'body', Key: 'WarehouseId' },
    OwnerId: { In: 'body', Key: 'OwnerId' },
  })
  public async Validate(@Body() request: ValidateLabelBlockingRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.validateLabelBlockingUseCase.Execute(request, context);
  }
}
