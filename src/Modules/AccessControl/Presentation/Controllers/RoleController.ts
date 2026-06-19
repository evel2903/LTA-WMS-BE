import { Controller, Get, Param, ParseEnumPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ListRolesUseCase } from '@modules/AccessControl/Application/UseCases/ListRolesUseCase';
import { GetRoleUseCase } from '@modules/AccessControl/Application/UseCases/GetRoleUseCase';
import { ListRolesQuery } from '@modules/AccessControl/Presentation/Requests/ListRolesQuery';

@UseGuards(JwtAuthGuard)
@Controller('access-control/roles')
export class RoleController {
  constructor(
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly getRoleUseCase: GetRoleUseCase,
  ) {}

  @Get()
  public async List(@Query() query: ListRolesQuery) {
    return await this.listRolesUseCase.Execute(query);
  }

  @Get(':roleCode')
  public async GetByCode(@Param('roleCode', new ParseEnumPipe(RoleCode)) roleCode: RoleCode) {
    return await this.getRoleUseCase.Execute(roleCode);
  }
}
