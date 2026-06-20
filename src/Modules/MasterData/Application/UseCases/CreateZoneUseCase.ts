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
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { CreateZoneDto } from '@modules/MasterData/Application/DTOs/CreateZoneDto';
import { ZoneDto } from '@modules/MasterData/Application/DTOs/ZoneDto';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { ZoneDtoMapper } from '@modules/MasterData/Application/Mappers/ZoneDtoMapper';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateZoneUseCase {
  // Optional audit deps: module always wires them, so production enforces A6
  // (WarehouseLocation) + writes audit in-transaction.
  constructor(
    private readonly zoneRepository: IZoneRepository,
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: CreateZoneDto, context: AuditContext = SystemAuditContext): Promise<ZoneDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        ObjectType: ObjectType.Zone,
        Action: ActionCode.Create,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const warehouse = await this.warehouseRepository.FindById(request.WarehouseId);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    if (warehouse.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Warehouse must be active');
    }

    const existing = await this.zoneRepository.FindByWarehouseAndCode(request.WarehouseId, request.ZoneCode);
    if (existing) {
      throw new ConflictException('Zone code already exists in warehouse');
    }

    const now = new Date();
    const zone = new ZoneEntity({
      Id: randomUUID(),
      WarehouseId: request.WarehouseId,
      ZoneCode: request.ZoneCode,
      ZoneName: request.ZoneName,
      ZoneType: request.ZoneType,
      Status: request.Status,
      Sequence: request.Sequence ?? null,
      TemperatureClass: request.TemperatureClass ?? null,
      ComplianceFlags: request.ComplianceFlags ?? {},
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const buildEntry = (created: ZoneEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Zone,
        ObjectId: created.Id,
        ObjectCode: created.ZoneCode,
        AfterJson: ZoneDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
        WarehouseId: created.WarehouseId,
      });

    if (!this.auditedTransaction) {
      const created = await this.zoneRepository.Create(zone);
      return ZoneDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.zoneRepository.Create(zone, manager);
      return { result: ZoneDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
