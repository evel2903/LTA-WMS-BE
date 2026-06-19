import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { VerifyWarehouseProfileChecklistUseCase } from '@modules/WarehouseProfile/Application/UseCases/VerifyWarehouseProfileChecklistUseCase';

/**
 * Read-only B7 checklist endpoint (AC1/AC5). Only a GET is exposed — the checklist never mutates.
 * The controller delegates to the use case; it never touches repositories/resolver/preview directly.
 * A 404 NOT_FOUND envelope is produced by GlobalExceptionFilter when the profile id is unknown.
 */
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('warehouse-profiles')
export class WarehouseProfileChecklistController {
  constructor(private readonly verifyChecklistUseCase: VerifyWarehouseProfileChecklistUseCase) {}

  @Get(':id/checklist')
  @RequirePermission(ActionCode.Read, ObjectType.WarehouseProfile)
  public async GetChecklist(@Param('id') id: string) {
    return await this.verifyChecklistUseCase.Execute({ ProfileId: id });
  }
}
