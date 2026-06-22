import { NotFoundException } from '@common/Exceptions/AppException';
import { CoreFlowInstanceDto, ResolveCoreFlowInstanceDto } from '@modules/CoreFlow/Application/DTOs/CoreFlowDtos';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowDtoMapper } from '@modules/CoreFlow/Application/Mappers/CoreFlowDtoMapper';

export class ResolveCoreFlowInstanceUseCase {
  constructor(private readonly coreFlows: ICoreFlowRepository) {}

  public async Execute(request: ResolveCoreFlowInstanceDto): Promise<CoreFlowInstanceDto> {
    const instance = await this.coreFlows.FindInstanceByBusinessReference(
      request.BusinessReference,
      request.WarehouseCode,
      request.OwnerCode,
    );
    if (!instance) throw new NotFoundException('CoreFlow instance not found');
    return CoreFlowDtoMapper.ToInstanceDto(instance);
  }
}
