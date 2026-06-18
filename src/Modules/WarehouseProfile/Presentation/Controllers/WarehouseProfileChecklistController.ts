import { Controller, Get, Param } from '@nestjs/common';
import { VerifyWarehouseProfileChecklistUseCase } from '@modules/WarehouseProfile/Application/UseCases/VerifyWarehouseProfileChecklistUseCase';

/**
 * Read-only B7 checklist endpoint (AC1/AC5). Only a GET is exposed — the checklist never mutates.
 * The controller delegates to the use case; it never touches repositories/resolver/preview directly.
 * A 404 NOT_FOUND envelope is produced by GlobalExceptionFilter when the profile id is unknown.
 */
@Controller('warehouse-profiles')
export class WarehouseProfileChecklistController {
  constructor(private readonly verifyChecklistUseCase: VerifyWarehouseProfileChecklistUseCase) {}

  @Get(':id/checklist')
  public async GetChecklist(@Param('id') id: string) {
    return await this.verifyChecklistUseCase.Execute({ ProfileId: id });
  }
}
