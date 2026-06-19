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
import {
  IReasonCodeRepository,
  REASON_CODE_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeRepository';
import { REASON_CODE_CATALOG } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { ReasonCodeCatalog } from '@modules/AccessControl/Application/Services/ReasonCodeCatalog';
import { ReasonCodeRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ReasonCodeRepository';
import { ReasonCodeOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ReasonCodeOrmEntity';
import { CreateReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/CreateReasonCodeUseCase';
import { GetReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/GetReasonCodeUseCase';
import { ListReasonCodesUseCase } from '@modules/AccessControl/Application/UseCases/ListReasonCodesUseCase';
import { UpdateReasonCodeUseCase } from '@modules/AccessControl/Application/UseCases/UpdateReasonCodeUseCase';
import { RoleController } from '@modules/AccessControl/Presentation/Controllers/RoleController';
import { PermissionController } from '@modules/AccessControl/Presentation/Controllers/PermissionController';
import { UserRoleController } from '@modules/AccessControl/Presentation/Controllers/UserRoleController';
import { ReasonCodeController } from '@modules/AccessControl/Presentation/Controllers/ReasonCodeController';
import { AUDIT_WRITER } from '@modules/AccessControl/Application/Interfaces/IAuditWriter';
import {
  IAuditLogRepository,
  AUDIT_LOG_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IAuditLogRepository';
import { AuditWriter } from '@modules/AccessControl/Infrastructure/Audit/AuditWriter';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { AuditLogRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/AuditLogRepository';
import { AuditLogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/AuditLogOrmEntity';
import { QueryAuditLogsUseCase } from '@modules/AccessControl/Application/UseCases/QueryAuditLogsUseCase';
import { GetAuditLogUseCase } from '@modules/AccessControl/Application/UseCases/GetAuditLogUseCase';
import { AuditLogController } from '@modules/AccessControl/Presentation/Controllers/AuditLogController';

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
      ReasonCodeOrmEntity,
      AuditLogOrmEntity,
    ]),
  ],
  controllers: [RoleController, PermissionController, UserRoleController, ReasonCodeController, AuditLogController],
  providers: [
    { provide: ROLE_REPOSITORY, useClass: RoleRepository },
    { provide: PERMISSION_REPOSITORY, useClass: PermissionRepository },
    { provide: ROLE_PERMISSION_REPOSITORY, useClass: RolePermissionRepository },
    { provide: USER_ROLE_REPOSITORY, useClass: UserRoleRepository },
    { provide: DATA_SCOPE_REPOSITORY, useClass: DataScopeRepository },
    { provide: REASON_CODE_REPOSITORY, useClass: ReasonCodeRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogRepository },
    { provide: AUDIT_WRITER, useClass: AuditWriter },
    AuditedTransaction,
    {
      provide: QueryAuditLogsUseCase,
      useFactory: (auditLogs: IAuditLogRepository) => new QueryAuditLogsUseCase(auditLogs),
      inject: [AUDIT_LOG_REPOSITORY],
    },
    {
      provide: GetAuditLogUseCase,
      useFactory: (auditLogs: IAuditLogRepository) => new GetAuditLogUseCase(auditLogs),
      inject: [AUDIT_LOG_REPOSITORY],
    },
    ScopeExtractor,
    PermissionGuard,
    {
      provide: REASON_CODE_CATALOG,
      useFactory: (reasonCodes: IReasonCodeRepository) => new ReasonCodeCatalog(reasonCodes),
      inject: [REASON_CODE_REPOSITORY],
    },
    {
      provide: CreateReasonCodeUseCase,
      useFactory: (reasonCodes: IReasonCodeRepository) => new CreateReasonCodeUseCase(reasonCodes),
      inject: [REASON_CODE_REPOSITORY],
    },
    {
      provide: GetReasonCodeUseCase,
      useFactory: (reasonCodes: IReasonCodeRepository) => new GetReasonCodeUseCase(reasonCodes),
      inject: [REASON_CODE_REPOSITORY],
    },
    {
      provide: ListReasonCodesUseCase,
      useFactory: (reasonCodes: IReasonCodeRepository) => new ListReasonCodesUseCase(reasonCodes),
      inject: [REASON_CODE_REPOSITORY],
    },
    {
      provide: UpdateReasonCodeUseCase,
      useFactory: (reasonCodes: IReasonCodeRepository) => new UpdateReasonCodeUseCase(reasonCodes),
      inject: [REASON_CODE_REPOSITORY],
    },
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
    REASON_CODE_CATALOG,
    REASON_CODE_REPOSITORY,
    AUDIT_WRITER,
    AUDIT_LOG_REPOSITORY,
    AuditedTransaction,
    GetUserEffectivePermissionsUseCase,
  ],
})
export class AccessControlModule {}
