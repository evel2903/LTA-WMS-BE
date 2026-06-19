import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ListPermissionsUseCase } from '@modules/AccessControl/Application/UseCases/ListPermissionsUseCase';
import { ListPermissionsQuery } from '@modules/AccessControl/Presentation/Requests/ListPermissionsQuery';

@UseGuards(JwtAuthGuard)
@Controller('access-control/permissions')
export class PermissionController {
  constructor(private readonly listPermissionsUseCase: ListPermissionsUseCase) {}

  @Get()
  public async List(@Query() query: ListPermissionsQuery) {
    return await this.listPermissionsUseCase.Execute(query);
  }
}
