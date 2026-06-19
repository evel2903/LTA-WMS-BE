import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IRoleRepository, ROLE_REPOSITORY } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import {
  IPermissionRepository,
  PERMISSION_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IPermissionRepository';
import {
  IRolePermissionRepository,
  ROLE_PERMISSION_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import {
  IUserRoleRepository,
  USER_ROLE_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';
import {
  IDataScopeRepository,
  DATA_SCOPE_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IDataScopeRepository';
import { PERMISSION_CHECKER } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { PermissionChecker } from '@modules/AccessControl/Application/Services/PermissionChecker';
import { DataScopeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/DataScopeRepository';
import { ScopeExtractor } from '@modules/AccessControl/Presentation/Services/ScopeExtractor';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { ListRolesUseCase } from '@modules/AccessControl/Application/UseCases/ListRolesUseCase';
import { GetRoleUseCase } from '@modules/AccessControl/Application/UseCases/GetRoleUseCase';
import { ListPermissionsUseCase } from '@modules/AccessControl/Application/UseCases/ListPermissionsUseCase';
import { GetUserEffectivePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/GetUserEffectivePermissionsUseCase';
import { AssignRoleToUserUseCase } from '@modules/AccessControl/Application/UseCases/AssignRoleToUserUseCase';
import { RemoveRoleFromUserUseCase } from '@modules/AccessControl/Application/UseCases/RemoveRoleFromUserUseCase';
import { RoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleRepository';
import { PermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/PermissionRepository';
import { RolePermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RolePermissionRepository';
import { UserRoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/UserRoleRepository';
import { RoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RoleOrmEntity';
import { PermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/PermissionOrmEntity';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';
import { UserRoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/UserRoleOrmEntity';
import { GroupOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/GroupOrmEntity';
import { GroupMemberOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/GroupMemberOrmEntity';
import { DataScopeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/DataScopeOrmEntity';
import { RoleController } from '@modules/AccessControl/Presentation/Controllers/RoleController';
import { PermissionController } from '@modules/AccessControl/Presentation/Controllers/PermissionController';
import { UserRoleController } from '@modules/AccessControl/Presentation/Controllers/UserRoleController';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleOrmEntity,
      PermissionOrmEntity,
      RolePermissionOrmEntity,
      UserRoleOrmEntity,
      GroupOrmEntity,
      GroupMemberOrmEntity,
      DataScopeOrmEntity,
    ]),
  ],
  controllers: [RoleController, PermissionController, UserRoleController],
  providers: [
    { provide: ROLE_REPOSITORY, useClass: RoleRepository },
    { provide: PERMISSION_REPOSITORY, useClass: PermissionRepository },
    { provide: ROLE_PERMISSION_REPOSITORY, useClass: RolePermissionRepository },
    { provide: USER_ROLE_REPOSITORY, useClass: UserRoleRepository },
    { provide: DATA_SCOPE_REPOSITORY, useClass: DataScopeRepository },
    ScopeExtractor,
    PermissionGuard,
    {
      provide: PERMISSION_CHECKER,
      useFactory: (
        userRoles: IUserRoleRepository,
        rolePermissions: IRolePermissionRepository,
        permissions: IPermissionRepository,
        dataScopes: IDataScopeRepository,
      ) => new PermissionChecker(userRoles, rolePermissions, permissions, dataScopes),
      inject: [USER_ROLE_REPOSITORY, ROLE_PERMISSION_REPOSITORY, PERMISSION_REPOSITORY, DATA_SCOPE_REPOSITORY],
    },
    {
      provide: ListRolesUseCase,
      useFactory: (roles: IRoleRepository) => new ListRolesUseCase(roles),
      inject: [ROLE_REPOSITORY],
    },
    {
      provide: GetRoleUseCase,
      useFactory: (
        roles: IRoleRepository,
        rolePermissions: IRolePermissionRepository,
        permissions: IPermissionRepository,
      ) => new GetRoleUseCase(roles, rolePermissions, permissions),
      inject: [ROLE_REPOSITORY, ROLE_PERMISSION_REPOSITORY, PERMISSION_REPOSITORY],
    },
    {
      provide: ListPermissionsUseCase,
      useFactory: (permissions: IPermissionRepository) => new ListPermissionsUseCase(permissions),
      inject: [PERMISSION_REPOSITORY],
    },
    {
      provide: GetUserEffectivePermissionsUseCase,
      useFactory: (
        userRoles: IUserRoleRepository,
        roles: IRoleRepository,
        rolePermissions: IRolePermissionRepository,
        permissions: IPermissionRepository,
      ) => new GetUserEffectivePermissionsUseCase(userRoles, roles, rolePermissions, permissions),
      inject: [USER_ROLE_REPOSITORY, ROLE_REPOSITORY, ROLE_PERMISSION_REPOSITORY, PERMISSION_REPOSITORY],
    },
    {
      provide: AssignRoleToUserUseCase,
      useFactory: (roles: IRoleRepository, userRoles: IUserRoleRepository) =>
        new AssignRoleToUserUseCase(roles, userRoles),
      inject: [ROLE_REPOSITORY, USER_ROLE_REPOSITORY],
    },
    {
      provide: RemoveRoleFromUserUseCase,
      useFactory: (roles: IRoleRepository, userRoles: IUserRoleRepository) =>
        new RemoveRoleFromUserUseCase(roles, userRoles),
      inject: [ROLE_REPOSITORY, USER_ROLE_REPOSITORY],
    },
  ],
  exports: [
    ROLE_REPOSITORY,
    PERMISSION_REPOSITORY,
    ROLE_PERMISSION_REPOSITORY,
    USER_ROLE_REPOSITORY,
    DATA_SCOPE_REPOSITORY,
    PERMISSION_CHECKER,
    ScopeExtractor,
    PermissionGuard,
    GetUserEffectivePermissionsUseCase,
  ],
})
export class AccessControlModule {}
