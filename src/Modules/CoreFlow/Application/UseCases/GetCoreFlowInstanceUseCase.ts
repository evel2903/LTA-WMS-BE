import { NotFoundException } from '@common/Exceptions/AppException';
import { CoreFlowInstanceDto } from '@modules/CoreFlow/Application/DTOs/CoreFlowDtos';
import { ICoreFlowRepository } from '@modules/CoreFlow/Application/Interfaces/ICoreFlowRepository';
import { CoreFlowDtoMapper } from '@modules/CoreFlow/Application/Mappers/CoreFlowDtoMapper';

export class GetCoreFlowInstanceUseCase {
  constructor(private readonly coreFlows: ICoreFlowRepository) {}

  public async Execute(id: string): Promise<CoreFlowInstanceDto> {
    const instance = await this.coreFlows.FindInstanceById(id);
    if (!instance) throw new NotFoundException('CoreFlow instance not found');
    return CoreFlowDtoMapper.ToInstanceDto(instance);
  }
}
