import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { UpdateWarehouseDto } from '@modules/MasterData/Application/DTOs/UpdateWarehouseDto';
import { WarehouseDto } from '@modules/MasterData/Application/DTOs/WarehouseDto';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { WarehouseDtoMapper } from '@modules/MasterData/Application/Mappers/WarehouseDtoMapper';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

export class UpdateWarehouseUseCase {
  constructor(
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly siteRepository: ISiteRepository,
  ) {}

  public async Execute(request: UpdateWarehouseDto): Promise<WarehouseDto> {
    const warehouse = await this.warehouseRepository.FindById(request.Id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

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

    const updated = await this.warehouseRepository.Update(warehouse);
    return WarehouseDtoMapper.ToDto(updated);
  }
}
