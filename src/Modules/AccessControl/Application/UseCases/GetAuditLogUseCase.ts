import { NotFoundException } from '@common/Exceptions/AppException';
import { IAuditLogRepository } from '@modules/AccessControl/Application/Interfaces/IAuditLogRepository';
import { AuditLogDto, AuditLogDtoMapper } from '@modules/AccessControl/Application/Mappers/AuditLogDtoMapper';

export class GetAuditLogUseCase {
  constructor(private readonly auditLogRepository: IAuditLogRepository) {}

  public async Execute(id: string): Promise<AuditLogDto> {
    const log = await this.auditLogRepository.FindById(id);
    if (!log) {
      throw new NotFoundException('Audit log not found');
    }
    return AuditLogDtoMapper.ToDto(log);
  }
}
