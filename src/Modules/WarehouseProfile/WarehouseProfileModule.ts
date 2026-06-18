import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IOwnerRepository, OWNER_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository, SKU_REPOSITORY } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import {
  IWarehouseRepository,
  WAREHOUSE_REPOSITORY,
} from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository, ZONE_REPOSITORY } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { MasterDataModule } from '@modules/MasterData/MasterDataModule';
import {
  IWarehouseProfileRepository,
  WAREHOUSE_PROFILE_REPOSITORY,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import {
  IWarehouseProfileAssignmentRepository,
  WAREHOUSE_PROFILE_ASSIGNMENT_REPOSITORY,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileAssignmentRepository';
import {
  IRuleGroupRepository,
  RULE_GROUP_REPOSITORY,
} from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import {
  IRuleDefinitionRepository,
  RULE_DEFINITION_REPOSITORY,
} from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import {
  IWarehouseProfileRuleRepository,
  WAREHOUSE_PROFILE_RULE_REPOSITORY,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';
import { IRuleResolver, RULE_RESOLVER } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { RulePayloadValidator } from '@modules/WarehouseProfile/Application/Services/RulePayloadValidator';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { GetWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetWarehouseProfileUseCase';
import { ListWarehouseProfilesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfilesUseCase';
import { UpdateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/UpdateWarehouseProfileUseCase';
import { ActivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/ActivateWarehouseProfileUseCase';
import { DeactivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/DeactivateWarehouseProfileUseCase';
import { ProfileActivationGuard } from '@modules/WarehouseProfile/Application/Services/ProfileActivationGuard';
import { CreateWarehouseProfileAssignmentUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileAssignmentUseCase';
import { ListWarehouseProfileAssignmentsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileAssignmentsUseCase';
import { CreateRuleGroupUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateRuleGroupUseCase';
import { GetRuleGroupUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetRuleGroupUseCase';
import { ListRuleGroupsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListRuleGroupsUseCase';
import { CreateRuleDefinitionUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateRuleDefinitionUseCase';
import { GetRuleDefinitionUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetRuleDefinitionUseCase';
import { ListRuleDefinitionsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListRuleDefinitionsUseCase';
import { AddWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/AddWarehouseProfileRuleUseCase';
import { ListWarehouseProfileRulesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileRulesUseCase';
import { RemoveWarehouseProfileRuleUseCase } from '@modules/WarehouseProfile/Application/UseCases/RemoveWarehouseProfileRuleUseCase';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';
import { WarehouseProfileAssignmentOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileAssignmentOrmEntity';
import { RuleGroupOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleGroupOrmEntity';
import { RuleDefinitionOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/RuleDefinitionOrmEntity';
import { WarehouseProfileRuleOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileRuleOrmEntity';
import { WarehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileRepository';
import { WarehouseProfileAssignmentRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileAssignmentRepository';
import { RuleGroupRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleGroupRepository';
import { RuleDefinitionRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/RuleDefinitionRepository';
import { WarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileRuleRepository';
import { WarehouseProfileController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileController';
import { WarehouseProfileAssignmentController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileAssignmentController';
import { RuleGroupController } from '@modules/WarehouseProfile/Presentation/Controllers/RuleGroupController';
import { RuleDefinitionController } from '@modules/WarehouseProfile/Presentation/Controllers/RuleDefinitionController';
import { WarehouseProfileRuleController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileRuleController';
import { RulePreviewController } from '@modules/WarehouseProfile/Presentation/Controllers/RulePreviewController';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseProfileOrmEntity,
      WarehouseProfileAssignmentOrmEntity,
      RuleGroupOrmEntity,
      RuleDefinitionOrmEntity,
      WarehouseProfileRuleOrmEntity,
    ]),
    MasterDataModule,
  ],
  controllers: [
    WarehouseProfileController,
    WarehouseProfileAssignmentController,
    RuleGroupController,
    RuleDefinitionController,
    WarehouseProfileRuleController,
    RulePreviewController,
  ],
  providers: [
    { provide: WAREHOUSE_PROFILE_REPOSITORY, useClass: WarehouseProfileRepository },
    { provide: WAREHOUSE_PROFILE_ASSIGNMENT_REPOSITORY, useClass: WarehouseProfileAssignmentRepository },
    { provide: RULE_GROUP_REPOSITORY, useClass: RuleGroupRepository },
    { provide: RULE_DEFINITION_REPOSITORY, useClass: RuleDefinitionRepository },
    { provide: WAREHOUSE_PROFILE_RULE_REPOSITORY, useClass: WarehouseProfileRuleRepository },
    ScopeKeyService,
    WarehouseProfilePolicyValidator,
    RulePayloadValidator,
    ConditionEvaluator,
    RuleConflictDetector,
    {
      provide: RULE_RESOLVER,
      useFactory: (
        profiles: IWarehouseProfileRepository,
        definitions: IRuleDefinitionRepository,
        bindings: IWarehouseProfileRuleRepository,
        groups: IRuleGroupRepository,
        conditionEvaluator: ConditionEvaluator,
      ) => new RuleResolver(profiles, definitions, bindings, groups, conditionEvaluator),
      inject: [
        WAREHOUSE_PROFILE_REPOSITORY,
        RULE_DEFINITION_REPOSITORY,
        WAREHOUSE_PROFILE_RULE_REPOSITORY,
        RULE_GROUP_REPOSITORY,
        ConditionEvaluator,
      ],
    },
    {
      provide: CreateWarehouseProfileUseCase,
      useFactory: (
        profiles: IWarehouseProfileRepository,
        warehouses: IWarehouseRepository,
        zones: IZoneRepository,
        owners: IOwnerRepository,
        skus: ISkuRepository,
        scopeKeyService: ScopeKeyService,
        policyValidator: WarehouseProfilePolicyValidator,
      ) =>
        new CreateWarehouseProfileUseCase(profiles, warehouses, zones, owners, skus, scopeKeyService, policyValidator),
      inject: [
        WAREHOUSE_PROFILE_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        ZONE_REPOSITORY,
        OWNER_REPOSITORY,
        SKU_REPOSITORY,
        ScopeKeyService,
        WarehouseProfilePolicyValidator,
      ],
    },
    {
      provide: GetWarehouseProfileUseCase,
      useFactory: (profiles: IWarehouseProfileRepository) => new GetWarehouseProfileUseCase(profiles),
      inject: [WAREHOUSE_PROFILE_REPOSITORY],
    },
    {
      provide: ListWarehouseProfilesUseCase,
      useFactory: (profiles: IWarehouseProfileRepository) => new ListWarehouseProfilesUseCase(profiles),
      inject: [WAREHOUSE_PROFILE_REPOSITORY],
    },
    {
      provide: UpdateWarehouseProfileUseCase,
      useFactory: (
        profiles: IWarehouseProfileRepository,
        warehouses: IWarehouseRepository,
        zones: IZoneRepository,
        owners: IOwnerRepository,
        skus: ISkuRepository,
        scopeKeyService: ScopeKeyService,
        policyValidator: WarehouseProfilePolicyValidator,
      ) =>
        new UpdateWarehouseProfileUseCase(profiles, warehouses, zones, owners, skus, scopeKeyService, policyValidator),
      inject: [
        WAREHOUSE_PROFILE_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        ZONE_REPOSITORY,
        OWNER_REPOSITORY,
        SKU_REPOSITORY,
        ScopeKeyService,
        WarehouseProfilePolicyValidator,
      ],
    },
    {
      provide: ProfileActivationGuard,
      useFactory: (profiles: IWarehouseProfileRepository, preview: PreviewRuleResolutionUseCase) =>
        new ProfileActivationGuard(profiles, preview),
      inject: [WAREHOUSE_PROFILE_REPOSITORY, PreviewRuleResolutionUseCase],
    },
    {
      provide: ActivateWarehouseProfileUseCase,
      useFactory: (
        profiles: IWarehouseProfileRepository,
        policyValidator: WarehouseProfilePolicyValidator,
        activationGuard: ProfileActivationGuard,
      ) => new ActivateWarehouseProfileUseCase(profiles, policyValidator, activationGuard),
      inject: [WAREHOUSE_PROFILE_REPOSITORY, WarehouseProfilePolicyValidator, ProfileActivationGuard],
    },
    {
      provide: DeactivateWarehouseProfileUseCase,
      useFactory: (profiles: IWarehouseProfileRepository) => new DeactivateWarehouseProfileUseCase(profiles),
      inject: [WAREHOUSE_PROFILE_REPOSITORY],
    },
    {
      provide: CreateWarehouseProfileAssignmentUseCase,
      useFactory: (
        assignments: IWarehouseProfileAssignmentRepository,
        profiles: IWarehouseProfileRepository,
        warehouses: IWarehouseRepository,
        scopeKeyService: ScopeKeyService,
      ) => new CreateWarehouseProfileAssignmentUseCase(assignments, profiles, warehouses, scopeKeyService),
      inject: [
        WAREHOUSE_PROFILE_ASSIGNMENT_REPOSITORY,
        WAREHOUSE_PROFILE_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        ScopeKeyService,
      ],
    },
    {
      provide: ListWarehouseProfileAssignmentsUseCase,
      useFactory: (assignments: IWarehouseProfileAssignmentRepository, profiles: IWarehouseProfileRepository) =>
        new ListWarehouseProfileAssignmentsUseCase(assignments, profiles),
      inject: [WAREHOUSE_PROFILE_ASSIGNMENT_REPOSITORY, WAREHOUSE_PROFILE_REPOSITORY],
    },
    {
      provide: CreateRuleGroupUseCase,
      useFactory: (groups: IRuleGroupRepository) => new CreateRuleGroupUseCase(groups),
      inject: [RULE_GROUP_REPOSITORY],
    },
    {
      provide: GetRuleGroupUseCase,
      useFactory: (groups: IRuleGroupRepository) => new GetRuleGroupUseCase(groups),
      inject: [RULE_GROUP_REPOSITORY],
    },
    {
      provide: ListRuleGroupsUseCase,
      useFactory: (groups: IRuleGroupRepository) => new ListRuleGroupsUseCase(groups),
      inject: [RULE_GROUP_REPOSITORY],
    },
    {
      provide: CreateRuleDefinitionUseCase,
      useFactory: (
        definitions: IRuleDefinitionRepository,
        groups: IRuleGroupRepository,
        warehouses: IWarehouseRepository,
        zones: IZoneRepository,
        owners: IOwnerRepository,
        skus: ISkuRepository,
        scopeKeyService: ScopeKeyService,
        payloadValidator: RulePayloadValidator,
      ) =>
        new CreateRuleDefinitionUseCase(
          definitions,
          groups,
          warehouses,
          zones,
          owners,
          skus,
          scopeKeyService,
          payloadValidator,
        ),
      inject: [
        RULE_DEFINITION_REPOSITORY,
        RULE_GROUP_REPOSITORY,
        WAREHOUSE_REPOSITORY,
        ZONE_REPOSITORY,
        OWNER_REPOSITORY,
        SKU_REPOSITORY,
        ScopeKeyService,
        RulePayloadValidator,
      ],
    },
    {
      provide: GetRuleDefinitionUseCase,
      useFactory: (definitions: IRuleDefinitionRepository) => new GetRuleDefinitionUseCase(definitions),
      inject: [RULE_DEFINITION_REPOSITORY],
    },
    {
      provide: ListRuleDefinitionsUseCase,
      useFactory: (definitions: IRuleDefinitionRepository) => new ListRuleDefinitionsUseCase(definitions),
      inject: [RULE_DEFINITION_REPOSITORY],
    },
    {
      provide: AddWarehouseProfileRuleUseCase,
      useFactory: (
        bindings: IWarehouseProfileRuleRepository,
        profiles: IWarehouseProfileRepository,
        definitions: IRuleDefinitionRepository,
      ) => new AddWarehouseProfileRuleUseCase(bindings, profiles, definitions),
      inject: [WAREHOUSE_PROFILE_RULE_REPOSITORY, WAREHOUSE_PROFILE_REPOSITORY, RULE_DEFINITION_REPOSITORY],
    },
    {
      provide: ListWarehouseProfileRulesUseCase,
      useFactory: (bindings: IWarehouseProfileRuleRepository, profiles: IWarehouseProfileRepository) =>
        new ListWarehouseProfileRulesUseCase(bindings, profiles),
      inject: [WAREHOUSE_PROFILE_RULE_REPOSITORY, WAREHOUSE_PROFILE_REPOSITORY],
    },
    {
      provide: RemoveWarehouseProfileRuleUseCase,
      useFactory: (bindings: IWarehouseProfileRuleRepository, profiles: IWarehouseProfileRepository) =>
        new RemoveWarehouseProfileRuleUseCase(bindings, profiles),
      inject: [WAREHOUSE_PROFILE_RULE_REPOSITORY, WAREHOUSE_PROFILE_REPOSITORY],
    },
    {
      provide: PreviewRuleResolutionUseCase,
      useFactory: (resolver: IRuleResolver, conflictDetector: RuleConflictDetector) =>
        new PreviewRuleResolutionUseCase(resolver, conflictDetector),
      inject: [RULE_RESOLVER, RuleConflictDetector],
    },
  ],
  exports: [
    WAREHOUSE_PROFILE_REPOSITORY,
    WAREHOUSE_PROFILE_ASSIGNMENT_REPOSITORY,
    RULE_GROUP_REPOSITORY,
    RULE_DEFINITION_REPOSITORY,
    WAREHOUSE_PROFILE_RULE_REPOSITORY,
    RULE_RESOLVER,
  ],
})
export class WarehouseProfileModule {}
