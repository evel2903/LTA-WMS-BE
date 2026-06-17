import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateZoneDto } from '@modules/MasterData/Application/DTOs/CreateZoneDto';
import { ZoneDto } from '@modules/MasterData/Application/DTOs/ZoneDto';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { ZoneDtoMapper } from '@modules/MasterData/Application/Mappers/ZoneDtoMapper';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateZoneUseCase {
  constructor(
    private readonly zoneRepository: IZoneRepository,
    private readonly warehouseRepository: IWarehouseRepository,
  ) {}

  public async Execute(request: CreateZoneDto): Promise<ZoneDto> {
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

    const created = await this.zoneRepository.Create(zone);
    return ZoneDtoMapper.ToDto(created);
  }
}
