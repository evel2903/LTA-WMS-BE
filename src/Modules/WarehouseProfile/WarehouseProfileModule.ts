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
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { GetWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetWarehouseProfileUseCase';
import { ListWarehouseProfilesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfilesUseCase';
import { UpdateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/UpdateWarehouseProfileUseCase';
import { CreateWarehouseProfileAssignmentUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileAssignmentUseCase';
import { ListWarehouseProfileAssignmentsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileAssignmentsUseCase';
import { WarehouseProfileOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileOrmEntity';
import { WarehouseProfileAssignmentOrmEntity } from '@modules/WarehouseProfile/Infrastructure/Persistence/Entities/WarehouseProfileAssignmentOrmEntity';
import { WarehouseProfileRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileRepository';
import { WarehouseProfileAssignmentRepository } from '@modules/WarehouseProfile/Infrastructure/Persistence/Repositories/WarehouseProfileAssignmentRepository';
import { WarehouseProfileController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileController';
import { WarehouseProfileAssignmentController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileAssignmentController';

@Module({
  imports: [
    TypeOrmModule.forFeature([WarehouseProfileOrmEntity, WarehouseProfileAssignmentOrmEntity]),
    MasterDataModule,
  ],
  controllers: [WarehouseProfileController, WarehouseProfileAssignmentController],
  providers: [
    { provide: WAREHOUSE_PROFILE_REPOSITORY, useClass: WarehouseProfileRepository },
    { provide: WAREHOUSE_PROFILE_ASSIGNMENT_REPOSITORY, useClass: WarehouseProfileAssignmentRepository },
    ScopeKeyService,
    WarehouseProfilePolicyValidator,
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
  ],
  exports: [WAREHOUSE_PROFILE_REPOSITORY, WAREHOUSE_PROFILE_ASSIGNMENT_REPOSITORY],
})
export class WarehouseProfileModule {}
