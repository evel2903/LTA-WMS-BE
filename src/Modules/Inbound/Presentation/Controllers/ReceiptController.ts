import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ConfirmReceiptLineUseCase } from '@modules/Inbound/Application/UseCases/ConfirmReceiptLineUseCase';
import { ConfirmReceiptLineRequest } from '@modules/Inbound/Presentation/Requests/ConfirmReceiptLineRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('receipts')
export class ReceiptController {
  constructor(private readonly confirmReceiptLineUseCase: ConfirmReceiptLineUseCase) {}

  @Post(':receiptId/lines')
  @RequirePermission(ActionCode.Update, ObjectType.Receipt)
  public async ConfirmReceiptLine(
    @Param('receiptId') receiptId: string,
    @Body() request: ConfirmReceiptLineRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.confirmReceiptLineUseCase.Execute({ ReceiptId: receiptId, ...request }, context);
  }
}
