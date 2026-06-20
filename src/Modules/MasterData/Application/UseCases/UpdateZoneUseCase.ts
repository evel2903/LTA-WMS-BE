import {
  BusinessRuleException,
  ConflictException,
  ForbiddenAppException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { UpdateZoneDto } from '@modules/MasterData/Application/DTOs/UpdateZoneDto';
import { ZoneDto } from '@modules/MasterData/Application/DTOs/ZoneDto';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { ZoneDtoMapper } from '@modules/MasterData/Application/Mappers/ZoneDtoMapper';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateZoneUseCase {
  // permissionChecker is required (C2 data-scope re-check). ownershipPolicy + auditedTransaction
  // are optional only so fixture-setup tests can construct bare; the module always wires them.
  constructor(
    private readonly zoneRepository: IZoneRepository,
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly permissionChecker: IPermissionChecker,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: UpdateZoneDto, context: AuditContext = SystemAuditContext): Promise<ZoneDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        ObjectType: ObjectType.Zone,
        Action: ActionCode.Update,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const zone = await this.zoneRepository.FindById(request.Id);
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    // Entity-resident data-scope re-check (architecture 6.4 step 5): the guard enforces
    // the (action, object) permission, but a zone's warehouse scope lives on the row, not
    // the request — so the use case re-checks it against the actor's data scope.
    if (request.ActorUserId) {
      const decision = await this.permissionChecker.Check({
        UserId: request.ActorUserId,
        Action: ActionCode.Update,
        ObjectType: ObjectType.Zone,
        Scope: { WarehouseId: zone.WarehouseId },
      });
      if (!decision.Allowed) {
        throw new ForbiddenAppException(`Access denied (${decision.Reason})`, { Reason: decision.Reason });
      }
    }

    const before = ZoneDtoMapper.ToDto(zone) as unknown as Record<string, unknown>;

    const targetWarehouseId = request.WarehouseId ?? zone.WarehouseId;
    if (request.WarehouseId !== undefined) {
      const warehouse = await this.warehouseRepository.FindById(request.WarehouseId);
      if (!warehouse) {
        throw new NotFoundException('Warehouse not found');
      }
      if (warehouse.Status !== MasterDataStatus.Active) {
        throw new BusinessRuleException('Warehouse must be active');
      }
    }

    const targetZoneCode = request.ZoneCode ?? zone.ZoneCode;
    if (targetWarehouseId !== zone.WarehouseId || targetZoneCode !== zone.ZoneCode) {
      const duplicate = await this.zoneRepository.FindByWarehouseAndCode(targetWarehouseId, targetZoneCode);
      if (duplicate && duplicate.Id !== zone.Id) {
        throw new ConflictException('Zone code already exists in warehouse');
      }
    }

    zone.WarehouseId = targetWarehouseId;
    zone.ZoneCode = targetZoneCode;
    zone.ZoneName = request.ZoneName ?? zone.ZoneName;
    zone.ZoneType = request.ZoneType ?? zone.ZoneType;
    zone.Status = request.Status ?? zone.Status;
    zone.Sequence = request.Sequence !== undefined ? request.Sequence : zone.Sequence;
    zone.TemperatureClass = request.TemperatureClass !== undefined ? request.TemperatureClass : zone.TemperatureClass;
    zone.ComplianceFlags = request.ComplianceFlags !== undefined ? request.ComplianceFlags : zone.ComplianceFlags;
    zone.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : zone.SourceSystem;
    zone.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : zone.ReferenceId;
    zone.UpdatedAt = new Date();

    const buildEntry = (updated: ZoneEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Zone,
        ObjectId: updated.Id,
        ObjectCode: updated.ZoneCode,
        BeforeJson: before,
        AfterJson: ZoneDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
        WarehouseId: updated.WarehouseId,
      });

    if (!this.auditedTransaction) {
      const updated = await this.zoneRepository.Update(zone);
      return ZoneDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.zoneRepository.Update(zone, manager);
      return { result: ZoneDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
