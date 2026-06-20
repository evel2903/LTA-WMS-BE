import { NotFoundException } from '@common/Exceptions/AppException';
import { IOverrideLogRepository } from '@modules/WarehouseProfile/Application/Interfaces/IOverrideLogRepository';
import { OverrideLogDto } from '@modules/WarehouseProfile/Application/DTOs/OverrideLogDto';
import { OverrideLogDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/OverrideLogDtoMapper';

export class GetOverrideLogUseCase {
  constructor(private readonly overrideLogs: IOverrideLogRepository) {}

  public async Execute(id: string): Promise<OverrideLogDto> {
    const log = await this.overrideLogs.FindById(id);
    if (!log) {
      throw new NotFoundException('Override log not found');
    }
    return OverrideLogDtoMapper.ToDto(log);
  }
}
