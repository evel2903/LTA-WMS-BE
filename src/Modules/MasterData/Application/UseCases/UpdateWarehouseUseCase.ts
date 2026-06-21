import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import {
  AssertUpdateDataScopes,
  ResolveActorUserId,
} from '@modules/AccessControl/Application/Services/PermissionScopeAssertion';
import { UpdateWarehouseDto } from '@modules/MasterData/Application/DTOs/UpdateWarehouseDto';
import { WarehouseDto } from '@modules/MasterData/Application/DTOs/WarehouseDto';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { WarehouseDtoMapper } from '@modules/MasterData/Application/Mappers/WarehouseDtoMapper';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

const snapshot = (warehouse: WarehouseEntity): Record<string, unknown> => ({
  SiteId: warehouse.SiteId,
  WarehouseCode: warehouse.WarehouseCode,
  WarehouseName: warehouse.WarehouseName,
  WarehouseTypeCode: warehouse.WarehouseTypeCode,
  Status: warehouse.Status,
});

export class UpdateWarehouseUseCase {
  // Optional audit deps: see CreateWarehouseUseCase — module always wires them.
  constructor(
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly siteRepository: ISiteRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(request: UpdateWarehouseDto, context: AuditContext = SystemAuditContext): Promise<WarehouseDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        ObjectType: ObjectType.Warehouse,
        Action: ActionCode.Update,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const warehouse = await this.warehouseRepository.FindById(request.Id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    await AssertUpdateDataScopes(this.permissionChecker, ResolveActorUserId(request, context), ObjectType.Warehouse, [
      { WarehouseId: warehouse.Id },
    ]);
    const before = snapshot(warehouse);

    if (request.SiteId !== undefined) {
      const site = await this.siteRepository.FindById(request.SiteId);
      if (!site) {
        throw new NotFoundException('Site not found');
      }
      if (site.Status !== MasterDataStatus.Active) {
        throw new BusinessRuleException('Site must be active');
      }
      if (request.SiteId !== warehouse.SiteId) {
        warehouse.SiteId = request.SiteId;
      }
    }

    if (request.WarehouseCode && request.WarehouseCode !== warehouse.WarehouseCode) {
      const duplicate = await this.warehouseRepository.FindByCode(request.WarehouseCode);
      if (duplicate && duplicate.Id !== warehouse.Id) {
        throw new ConflictException('Warehouse code already exists');
      }
      warehouse.WarehouseCode = request.WarehouseCode;
    }

    warehouse.WarehouseName = request.WarehouseName ?? warehouse.WarehouseName;
    warehouse.WarehouseTypeCode = request.WarehouseTypeCode ?? warehouse.WarehouseTypeCode;
    warehouse.Status = request.Status ?? warehouse.Status;
    warehouse.Timezone = request.Timezone !== undefined ? request.Timezone : warehouse.Timezone;
    warehouse.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : warehouse.SourceSystem;
    warehouse.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : warehouse.ReferenceId;
    warehouse.UpdatedAt = new Date();

    const buildEntry = (updated: WarehouseEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Warehouse,
        ObjectId: updated.Id,
        ObjectCode: updated.WarehouseCode,
        BeforeJson: before,
        AfterJson: snapshot(updated),
        ReasonCodeId: reasonCodeId,
        WarehouseId: updated.Id,
      });

    if (!this.auditedTransaction) {
      const updated = await this.warehouseRepository.Update(warehouse);
      return WarehouseDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.warehouseRepository.Update(warehouse, manager);
      return { result: WarehouseDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
