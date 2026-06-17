import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateWarehouseDto } from '@modules/MasterData/Application/DTOs/CreateWarehouseDto';
import { WarehouseDto } from '@modules/MasterData/Application/DTOs/WarehouseDto';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { WarehouseDtoMapper } from '@modules/MasterData/Application/Mappers/WarehouseDtoMapper';
import { WarehouseEntity } from '@modules/MasterData/Domain/Entities/WarehouseEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class CreateWarehouseUseCase {
  constructor(
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly siteRepository: ISiteRepository,
  ) {}

  public async Execute(request: CreateWarehouseDto): Promise<WarehouseDto> {
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

    const created = await this.warehouseRepository.Create(warehouse);
    return WarehouseDtoMapper.ToDto(created);
  }
}
