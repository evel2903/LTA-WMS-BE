import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateWarehouseDto } from '@modules/MasterData/Application/DTOs/CreateWarehouseDto';
import { WarehouseDto } from '@modules/MasterData/Application/DTOs/WarehouseDto';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { WarehouseDtoMapper } from '@modules/MasterData/Application/Mappers/WarehouseDtoMapper';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateWarehouseUseCase {
  // ownershipPolicy + auditedTransaction are optional only so fixture-setup tests can
  // construct the use case bare; the module always wires them, so production always
  // enforces A6 + writes audit in-transaction.
  constructor(
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly siteRepository: ISiteRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: CreateWarehouseDto, context: AuditContext = SystemAuditContext): Promise<WarehouseDto> {
    if (this.ownershipPolicy) {
      await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        Action: ActionCode.Create,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
    }

    const site = await this.siteRepository.FindById(request.SiteId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    if (site.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Site must be active');
    }

    const existing = await this.warehouseRepository.FindByCode(request.WarehouseCode);
    if (existing) {
      throw new ConflictException('Warehouse code already exists');
    }

    const now = new Date();
    const warehouse = new WarehouseEntity({
      Id: randomUUID(),
      SiteId: request.SiteId,
      WarehouseCode: request.WarehouseCode,
      WarehouseName: request.WarehouseName,
      WarehouseTypeCode: request.WarehouseTypeCode,
      Status: request.Status,
      Timezone: request.Timezone ?? null,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const buildEntry = (created: WarehouseEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Warehouse,
        ObjectId: created.Id,
        ObjectCode: created.WarehouseCode,
        AfterJson: {
          SiteId: created.SiteId,
          WarehouseCode: created.WarehouseCode,
          WarehouseName: created.WarehouseName,
          WarehouseTypeCode: created.WarehouseTypeCode,
          Status: created.Status,
        },
        WarehouseId: created.Id,
      });

    if (!this.auditedTransaction) {
      const created = await this.warehouseRepository.Create(warehouse);
      return WarehouseDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.warehouseRepository.Create(warehouse, manager);
      return { result: WarehouseDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
