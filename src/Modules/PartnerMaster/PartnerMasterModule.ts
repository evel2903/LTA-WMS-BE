import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  IReasonCodeCatalog,
  REASON_CODE_CATALOG,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { CreatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/CreatePartnerUseCase';
import { DeactivatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/DeactivatePartnerUseCase';
import { GetPartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/GetPartnerUseCase';
import { ListPartnersUseCase } from '@modules/PartnerMaster/Application/UseCases/ListPartnersUseCase';
import { ResolvePartnerByReferenceUseCase } from '@modules/PartnerMaster/Application/UseCases/ResolvePartnerByReferenceUseCase';
import { UpdatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/UpdatePartnerUseCase';
import {
  IPartnerRepository,
  PARTNER_REPOSITORY,
} from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerOrmEntity } from '@modules/PartnerMaster/Infrastructure/Persistence/Entities/PartnerOrmEntity';
import { PartnerRepository } from '@modules/PartnerMaster/Infrastructure/Persistence/Repositories/PartnerRepository';
import { PartnerController } from '@modules/PartnerMaster/Presentation/Controllers/PartnerController';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerOrmEntity]), AccessControlModule],
  controllers: [PartnerController],
  providers: [
    { provide: PARTNER_REPOSITORY, useClass: PartnerRepository },
    {
      provide: CreatePartnerUseCase,
      useFactory: (partners: IPartnerRepository, audited: AuditedTransaction) =>
        new CreatePartnerUseCase(partners, audited),
      inject: [PARTNER_REPOSITORY, AuditedTransaction],
    },
    {
      provide: GetPartnerUseCase,
      useFactory: (partners: IPartnerRepository) => new GetPartnerUseCase(partners),
      inject: [PARTNER_REPOSITORY],
    },
    {
      provide: ListPartnersUseCase,
      useFactory: (partners: IPartnerRepository) => new ListPartnersUseCase(partners),
      inject: [PARTNER_REPOSITORY],
    },
    {
      provide: ResolvePartnerByReferenceUseCase,
      useFactory: (partners: IPartnerRepository) => new ResolvePartnerByReferenceUseCase(partners),
      inject: [PARTNER_REPOSITORY],
    },
    {
      provide: UpdatePartnerUseCase,
      useFactory: (partners: IPartnerRepository, audited: AuditedTransaction) =>
        new UpdatePartnerUseCase(partners, audited),
      inject: [PARTNER_REPOSITORY, AuditedTransaction],
    },
    {
      provide: DeactivatePartnerUseCase,
      useFactory: (partners: IPartnerRepository, audited: AuditedTransaction, reasonCatalog: IReasonCodeCatalog) =>
        new DeactivatePartnerUseCase(partners, audited, reasonCatalog),
      inject: [PARTNER_REPOSITORY, AuditedTransaction, REASON_CODE_CATALOG],
    },
  ],
  exports: [PARTNER_REPOSITORY],
})
export class PartnerMasterModule {}
