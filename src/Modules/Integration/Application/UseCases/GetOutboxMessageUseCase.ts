import { NotFoundException } from '@common/Exceptions/AppException';
import { OutboxMessageDto } from '@modules/Integration/Application/DTOs/IntegrationDtos';
import { IIntegrationRepository } from '@modules/Integration/Application/Interfaces/IIntegrationRepository';
import { IntegrationDtoMapper } from '@modules/Integration/Application/Mappers/IntegrationDtoMapper';
import { OutboxMessageStatus } from '@modules/Integration/Domain/Enums/OutboxMessageStatus';

export class GetOutboxMessageUseCase {
  constructor(private readonly integrations: IIntegrationRepository) {}

  public async Execute(id: string, allowedStatuses?: ReadonlySet<OutboxMessageStatus>): Promise<OutboxMessageDto> {
    const message = await this.integrations.FindOutboxMessageById(id);
    if (!message) throw new NotFoundException('Integration outbox message not found', { Id: id });
    if (allowedStatuses && !allowedStatuses.has(message.Status)) {
      throw new NotFoundException('Integration outbox message not found', { Id: id });
    }
    return IntegrationDtoMapper.ToOutboxMessageDto(message);
  }
}
