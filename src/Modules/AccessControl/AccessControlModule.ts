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
import {
  IApprovalRequestRepository,
  APPROVAL_REQUEST_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IApprovalRequestRepository';
import { ApprovalRequestRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ApprovalRequestRepository';
import { ApprovalRequestOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ApprovalRequestOrmEntity';
import { ApproverDirectory } from '@modules/AccessControl/Application/Services/ApproverDirectory';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { CreateApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/CreateApprovalRequestUseCase';
import { ApproveApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/ApproveApprovalRequestUseCase';
import { RejectApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/RejectApprovalRequestUseCase';
import { GetApprovalRequestUseCase } from '@modules/AccessControl/Application/UseCases/GetApprovalRequestUseCase';
import { ListApprovalRequestsUseCase } from '@modules/AccessControl/Application/UseCases/ListApprovalRequestsUseCase';
import { ApprovalRequestController } from '@modules/AccessControl/Presentation/Controllers/ApprovalRequestController';
import {
  IControlExceptionCatalogRepository,
  CONTROL_EXCEPTION_CATALOG_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalogRepository';
import { VALIDATION_RULE_CATALOG_REPOSITORY } from '@modules/AccessControl/Application/Interfaces/IValidationRuleCatalogRepository';
import { CONTROL_EXCEPTION_CATALOG } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { ControlExceptionCatalog } from '@modules/AccessControl/Application/Services/ControlExceptionCatalog';
import { ControlExceptionCatalogRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ControlExceptionCatalogRepository';
import { ValidationRuleCatalogRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ValidationRuleCatalogRepository';
import { ControlExceptionCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ControlExceptionCatalogOrmEntity';
import { ValidationRuleCatalogOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ValidationRuleCatalogOrmEntity';
import {
  IExceptionCaseRepository,
  EXCEPTION_CASE_REPOSITORY,
} from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { ExceptionCaseRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/ExceptionCaseRepository';
import { ExceptionCaseOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/ExceptionCaseOrmEntity';
import { IControlExceptionCatalog } from '@modules/AccessControl/Application/Interfaces/IControlExceptionCatalog';
import { CreateExceptionUseCase } from '@modules/AccessControl/Application/UseCases/CreateExceptionUseCase';
import { GetExceptionUseCase } from '@modules/AccessControl/Application/UseCases/GetExceptionUseCase';
import { ListExceptionsUseCase } from '@modules/AccessControl/Application/UseCases/ListExceptionsUseCase';
import { LogExceptionUseCase } from '@modules/AccessControl/Application/UseCases/LogExceptionUseCase';
import { AssignExceptionUseCase } from '@modules/AccessControl/Application/UseCases/AssignExceptionUseCase';
import { SubmitExceptionForApprovalUseCase } from '@modules/AccessControl/Application/UseCases/SubmitExceptionForApprovalUseCase';
import { ResolveExceptionUseCase } from '@modules/AccessControl/Application/UseCases/ResolveExceptionUseCase';
import { CloseExceptionUseCase } from '@modules/AccessControl/Application/UseCases/CloseExceptionUseCase';
import { ExceptionCaseController } from '@modules/AccessControl/Presentation/Controllers/ExceptionCaseController';

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
      ApprovalRequestOrmEntity,
      ControlExceptionCatalogOrmEntity,
      ValidationRuleCatalogOrmEntity,
      ExceptionCaseOrmEntity,
    ]),
  ],
  controllers: [
    RoleController,
    PermissionController,
    UserRoleController,
    ReasonCodeController,
    AuditLogController,
    ApprovalRequestController,
    ExceptionCaseController,
  ],
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
    { provide: CONTROL_EXCEPTION_CATALOG_REPOSITORY, useClass: ControlExceptionCatalogRepository },
    { provide: VALIDATION_RULE_CATALOG_REPOSITORY, useClass: ValidationRuleCatalogRepository },
    {
      provide: CONTROL_EXCEPTION_CATALOG,
      useFactory: (repo: IControlExceptionCatalogRepository) => new ControlExceptionCatalog(repo),
      inject: [CONTROL_EXCEPTION_CATALOG_REPOSITORY],
    },
    {
      provide: CreateReasonCodeUseCase,
      useFactory: (reasonCodes: IReasonCodeRepository, audited: AuditedTransaction) =>
        new CreateReasonCodeUseCase(reasonCodes, audited),
      inject: [REASON_CODE_REPOSITORY, AuditedTransaction],
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
      useFactory: (reasonCodes: IReasonCodeRepository, audited: AuditedTransaction) =>
        new UpdateReasonCodeUseCase(reasonCodes, audited),
      inject: [REASON_CODE_REPOSITORY, AuditedTransaction],
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
      useFactory: (roles: IRoleRepository, userRoles: IUserRoleRepository, audited: AuditedTransaction) =>
        new AssignRoleToUserUseCase(roles, userRoles, audited),
      inject: [ROLE_REPOSITORY, USER_ROLE_REPOSITORY, AuditedTransaction],
    },
    {
      provide: RemoveRoleFromUserUseCase,
      useFactory: (roles: IRoleRepository, userRoles: IUserRoleRepository, audited: AuditedTransaction) =>
        new RemoveRoleFromUserUseCase(roles, userRoles, audited),
      inject: [ROLE_REPOSITORY, USER_ROLE_REPOSITORY, AuditedTransaction],
    },
    { provide: APPROVAL_REQUEST_REPOSITORY, useClass: ApprovalRequestRepository },
    {
      provide: ApproverDirectory,
      useFactory: (permissions: IPermissionRepository, rolePermissions: IRolePermissionRepository) =>
        new ApproverDirectory(permissions, rolePermissions),
      inject: [PERMISSION_REPOSITORY, ROLE_PERMISSION_REPOSITORY],
    },
    {
      provide: CreateApprovalRequestUseCase,
      useFactory: (
        approvalRequests: IApprovalRequestRepository,
        approverDirectory: ApproverDirectory,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
      ) => new CreateApprovalRequestUseCase(approvalRequests, approverDirectory, reasonCatalog, audited),
      inject: [APPROVAL_REQUEST_REPOSITORY, ApproverDirectory, REASON_CODE_CATALOG, AuditedTransaction],
    },
    {
      provide: ApproveApprovalRequestUseCase,
      useFactory: (
        approvalRequests: IApprovalRequestRepository,
        permissionChecker: IPermissionChecker,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
      ) => new ApproveApprovalRequestUseCase(approvalRequests, permissionChecker, reasonCatalog, audited),
      inject: [APPROVAL_REQUEST_REPOSITORY, PERMISSION_CHECKER, REASON_CODE_CATALOG, AuditedTransaction],
    },
    {
      provide: RejectApprovalRequestUseCase,
      useFactory: (
        approvalRequests: IApprovalRequestRepository,
        permissionChecker: IPermissionChecker,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
      ) => new RejectApprovalRequestUseCase(approvalRequests, permissionChecker, reasonCatalog, audited),
      inject: [APPROVAL_REQUEST_REPOSITORY, PERMISSION_CHECKER, REASON_CODE_CATALOG, AuditedTransaction],
    },
    {
      provide: GetApprovalRequestUseCase,
      useFactory: (approvalRequests: IApprovalRequestRepository) => new GetApprovalRequestUseCase(approvalRequests),
      inject: [APPROVAL_REQUEST_REPOSITORY],
    },
    {
      provide: ListApprovalRequestsUseCase,
      useFactory: (approvalRequests: IApprovalRequestRepository) => new ListApprovalRequestsUseCase(approvalRequests),
      inject: [APPROVAL_REQUEST_REPOSITORY],
    },
    { provide: EXCEPTION_CASE_REPOSITORY, useClass: ExceptionCaseRepository },
    {
      provide: CreateExceptionUseCase,
      useFactory: (
        cases: IExceptionCaseRepository,
        controlExceptionCatalog: IControlExceptionCatalog,
        audited: AuditedTransaction,
      ) => new CreateExceptionUseCase(cases, controlExceptionCatalog, audited),
      inject: [EXCEPTION_CASE_REPOSITORY, CONTROL_EXCEPTION_CATALOG, AuditedTransaction],
    },
    {
      provide: GetExceptionUseCase,
      useFactory: (cases: IExceptionCaseRepository) => new GetExceptionUseCase(cases),
      inject: [EXCEPTION_CASE_REPOSITORY],
    },
    {
      provide: ListExceptionsUseCase,
      useFactory: (cases: IExceptionCaseRepository) => new ListExceptionsUseCase(cases),
      inject: [EXCEPTION_CASE_REPOSITORY],
    },
    {
      provide: LogExceptionUseCase,
      useFactory: (cases: IExceptionCaseRepository, audited: AuditedTransaction) =>
        new LogExceptionUseCase(cases, audited),
      inject: [EXCEPTION_CASE_REPOSITORY, AuditedTransaction],
    },
    {
      provide: AssignExceptionUseCase,
      useFactory: (cases: IExceptionCaseRepository, audited: AuditedTransaction) =>
        new AssignExceptionUseCase(cases, audited),
      inject: [EXCEPTION_CASE_REPOSITORY, AuditedTransaction],
    },
    {
      provide: SubmitExceptionForApprovalUseCase,
      useFactory: (
        cases: IExceptionCaseRepository,
        controlExceptionCatalog: IControlExceptionCatalog,
        createApprovalRequest: CreateApprovalRequestUseCase,
        audited: AuditedTransaction,
      ) => new SubmitExceptionForApprovalUseCase(cases, controlExceptionCatalog, createApprovalRequest, audited),
      inject: [EXCEPTION_CASE_REPOSITORY, CONTROL_EXCEPTION_CATALOG, CreateApprovalRequestUseCase, AuditedTransaction],
    },
    {
      provide: ResolveExceptionUseCase,
      useFactory: (
        cases: IExceptionCaseRepository,
        controlExceptionCatalog: IControlExceptionCatalog,
        reasonCatalog: IReasonCodeCatalog,
        approvalRequests: IApprovalRequestRepository,
        audited: AuditedTransaction,
      ) => new ResolveExceptionUseCase(cases, controlExceptionCatalog, reasonCatalog, approvalRequests, audited),
      inject: [
        EXCEPTION_CASE_REPOSITORY,
        CONTROL_EXCEPTION_CATALOG,
        REASON_CODE_CATALOG,
        APPROVAL_REQUEST_REPOSITORY,
        AuditedTransaction,
      ],
    },
    {
      provide: CloseExceptionUseCase,
      useFactory: (
        cases: IExceptionCaseRepository,
        controlExceptionCatalog: IControlExceptionCatalog,
        approvalRequests: IApprovalRequestRepository,
        audited: AuditedTransaction,
      ) => new CloseExceptionUseCase(cases, controlExceptionCatalog, approvalRequests, audited),
      inject: [EXCEPTION_CASE_REPOSITORY, CONTROL_EXCEPTION_CATALOG, APPROVAL_REQUEST_REPOSITORY, AuditedTransaction],
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
    APPROVAL_REQUEST_REPOSITORY,
    CreateApprovalRequestUseCase,
    CONTROL_EXCEPTION_CATALOG,
    CONTROL_EXCEPTION_CATALOG_REPOSITORY,
    VALIDATION_RULE_CATALOG_REPOSITORY,
    EXCEPTION_CASE_REPOSITORY,
  ],
})
export class AccessControlModule {}
