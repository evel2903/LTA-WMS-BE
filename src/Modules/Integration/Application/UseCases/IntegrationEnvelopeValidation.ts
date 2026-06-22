import { BusinessRuleException } from '@common/Exceptions/AppException';
import { IntegrationEnvelopeDto } from '@modules/Integration/Application/DTOs/IntegrationDtos';

export class IntegrationEnvelopeValidation {
  public static Validate(envelope: IntegrationEnvelopeDto): void {
    const required: Array<[keyof IntegrationEnvelopeDto, unknown]> = [
      ['MessageId', envelope.MessageId],
      ['MessageType', envelope.MessageType],
      ['Version', envelope.Version],
      ['BusinessReference', envelope.BusinessReference],
      ['SourceSystem', envelope.SourceSystem],
      ['TargetSystem', envelope.TargetSystem],
      ['WarehouseContext', envelope.WarehouseContext],
      ['EventTime', envelope.EventTime],
      ['Payload', envelope.Payload],
    ];

    for (const [field, value] of required) {
      if (typeof value === 'string' && value.trim().length === 0) {
        throw new BusinessRuleException(`Integration envelope ${String(field)} is required`);
      }
      if (value === null || value === undefined) {
        throw new BusinessRuleException(`Integration envelope ${String(field)} is required`);
      }
    }

    if (!(envelope.EventTime instanceof Date) || Number.isNaN(envelope.EventTime.getTime())) {
      throw new BusinessRuleException('Integration envelope EventTime must be a valid date');
    }
    if (typeof envelope.Payload !== 'object' || Array.isArray(envelope.Payload)) {
      throw new BusinessRuleException('Integration envelope Payload must be an object');
    }
  }
}
