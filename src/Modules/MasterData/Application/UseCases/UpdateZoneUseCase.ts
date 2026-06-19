import {
  BusinessRuleException,
  ConflictException,
  ForbiddenAppException,
  NotFoundException,
} from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { UpdateZoneDto } from '@modules/MasterData/Application/DTOs/UpdateZoneDto';
import { ZoneDto } from '@modules/MasterData/Application/DTOs/ZoneDto';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { ZoneDtoMapper } from '@modules/MasterData/Application/Mappers/ZoneDtoMapper';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateZoneUseCase {
  constructor(
    private readonly zoneRepository: IZoneRepository,
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly permissionChecker: IPermissionChecker,
  ) {}

  public async Execute(request: UpdateZoneDto): Promise<ZoneDto> {
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

    const updated = await this.zoneRepository.Update(zone);
    return ZoneDtoMapper.ToDto(updated);
  }
}
