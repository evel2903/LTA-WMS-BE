import { AuditLogEntity } from '@modules/AccessControl/Domain/Entities/AuditLogEntity';

export type AuditLogDto = AuditLogEntity;

export class AuditLogDtoMapper {
  /** AuditLogEntity is already a flat read-model; expose it directly. */
  public static ToDto(entity: AuditLogEntity): AuditLogDto {
    return entity;
  }
}
