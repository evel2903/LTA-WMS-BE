import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '@modules/AccessControl/AccessControlModule';
import {
  IPermissionChecker,
  PERMISSION_CHECKER,
} from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  IReasonCodeCatalog,
  REASON_CODE_CATALOG,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import {
  IWarehouseProfileRepository,
  WAREHOUSE_PROFILE_REPOSITORY,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileModule } from '@modules/WarehouseProfile/WarehouseProfileModule';
import {
  BARCODE_LABEL_REPOSITORY,
  IBarcodeLabelRepository,
} from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { CreateLabelTemplateUseCase } from '@modules/BarcodeLabel/Application/UseCases/CreateLabelTemplateUseCase';
import { CreateLabelTemplateVersionUseCase } from '@modules/BarcodeLabel/Application/UseCases/CreateLabelTemplateVersionUseCase';
import { GetLabelTemplateUseCase } from '@modules/BarcodeLabel/Application/UseCases/GetLabelTemplateUseCase';
import { GetPrintJobUseCase } from '@modules/BarcodeLabel/Application/UseCases/GetPrintJobUseCase';
import { ListLabelTemplatesUseCase } from '@modules/BarcodeLabel/Application/UseCases/ListLabelTemplatesUseCase';
import { ListPrintJobsUseCase } from '@modules/BarcodeLabel/Application/UseCases/ListPrintJobsUseCase';
import { PreviewPrintJobUseCase } from '@modules/BarcodeLabel/Application/UseCases/PreviewPrintJobUseCase';
import { ReprintPrintJobUseCase } from '@modules/BarcodeLabel/Application/UseCases/ReprintPrintJobUseCase';
import { ValidateLabelBlockingUseCase } from '@modules/BarcodeLabel/Application/UseCases/ValidateLabelBlockingUseCase';
import { LabelBlockingController } from '@modules/BarcodeLabel/Presentation/Controllers/LabelBlockingController';
import { LabelTemplateController } from '@modules/BarcodeLabel/Presentation/Controllers/LabelTemplateController';
import { PrintJobController } from '@modules/BarcodeLabel/Presentation/Controllers/PrintJobController';
import { LabelTemplateOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateOrmEntity';
import { LabelTemplateVersionOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/LabelTemplateVersionOrmEntity';
import { PrintJobOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/PrintJobOrmEntity';
import { ReprintRequestOrmEntity } from '@modules/BarcodeLabel/Infrastructure/Persistence/Entities/ReprintRequestOrmEntity';
import { BarcodeLabelRepository } from '@modules/BarcodeLabel/Infrastructure/Persistence/Repositories/BarcodeLabelRepository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LabelTemplateOrmEntity,
      LabelTemplateVersionOrmEntity,
      PrintJobOrmEntity,
      ReprintRequestOrmEntity,
    ]),
    AccessControlModule,
    WarehouseProfileModule,
  ],
  controllers: [LabelTemplateController, PrintJobController, LabelBlockingController],
  providers: [
    { provide: BARCODE_LABEL_REPOSITORY, useClass: BarcodeLabelRepository },
    {
      provide: CreateLabelTemplateUseCase,
      useFactory: (labels: IBarcodeLabelRepository, audited: AuditedTransaction) =>
        new CreateLabelTemplateUseCase(labels, audited),
      inject: [BARCODE_LABEL_REPOSITORY, AuditedTransaction],
    },
    {
      provide: CreateLabelTemplateVersionUseCase,
      useFactory: (labels: IBarcodeLabelRepository, audited: AuditedTransaction) =>
        new CreateLabelTemplateVersionUseCase(labels, audited),
      inject: [BARCODE_LABEL_REPOSITORY, AuditedTransaction],
    },
    {
      provide: GetLabelTemplateUseCase,
      useFactory: (labels: IBarcodeLabelRepository) => new GetLabelTemplateUseCase(labels),
      inject: [BARCODE_LABEL_REPOSITORY],
    },
    {
      provide: ListLabelTemplatesUseCase,
      useFactory: (labels: IBarcodeLabelRepository) => new ListLabelTemplatesUseCase(labels),
      inject: [BARCODE_LABEL_REPOSITORY],
    },
    {
      provide: PreviewPrintJobUseCase,
      useFactory: (
        labels: IBarcodeLabelRepository,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) => new PreviewPrintJobUseCase(labels, audited, permissionChecker),
      inject: [BARCODE_LABEL_REPOSITORY, AuditedTransaction, PERMISSION_CHECKER],
    },
    {
      provide: ListPrintJobsUseCase,
      useFactory: (labels: IBarcodeLabelRepository, permissionChecker: IPermissionChecker) =>
        new ListPrintJobsUseCase(labels, permissionChecker),
      inject: [BARCODE_LABEL_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: GetPrintJobUseCase,
      useFactory: (labels: IBarcodeLabelRepository, permissionChecker: IPermissionChecker) =>
        new GetPrintJobUseCase(labels, permissionChecker),
      inject: [BARCODE_LABEL_REPOSITORY, PERMISSION_CHECKER],
    },
    {
      provide: ReprintPrintJobUseCase,
      useFactory: (
        labels: IBarcodeLabelRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) => new ReprintPrintJobUseCase(labels, reasonCatalog, audited, permissionChecker),
      inject: [BARCODE_LABEL_REPOSITORY, REASON_CODE_CATALOG, AuditedTransaction, PERMISSION_CHECKER],
    },
    {
      provide: ValidateLabelBlockingUseCase,
      useFactory: (
        labels: IBarcodeLabelRepository,
        profiles: IWarehouseProfileRepository,
        reasonCatalog: IReasonCodeCatalog,
        audited: AuditedTransaction,
        permissionChecker: IPermissionChecker,
      ) => new ValidateLabelBlockingUseCase(labels, profiles, reasonCatalog, audited, permissionChecker),
      inject: [
        BARCODE_LABEL_REPOSITORY,
        WAREHOUSE_PROFILE_REPOSITORY,
        REASON_CODE_CATALOG,
        AuditedTransaction,
        PERMISSION_CHECKER,
      ],
    },
  ],
  exports: [BARCODE_LABEL_REPOSITORY, ValidateLabelBlockingUseCase],
})
export class BarcodeLabelModule {}
