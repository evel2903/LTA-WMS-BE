import {
  AuditLogQueryFilter,
  IAuditLogRepository,
} from '@modules/AccessControl/Application/Interfaces/IAuditLogRepository';
import { AuditLogDto, AuditLogDtoMapper } from '@modules/AccessControl/Application/Mappers/AuditLogDtoMapper';

export interface QueryAuditLogsInput extends AuditLogQueryFilter {
  Page?: number;
  PageSize?: number;
}

export interface PaginatedAuditLogs {
  Items: AuditLogDto[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export class QueryAuditLogsUseCase {
  constructor(private readonly auditLogRepository: IAuditLogRepository) {}

  public async Execute(input: QueryAuditLogsInput = {}): Promise<PaginatedAuditLogs> {
    const page = input.Page && input.Page > 0 ? input.Page : 1;
    const pageSize = input.PageSize && input.PageSize > 0 ? input.PageSize : 20;
    const { Items, TotalItems } = await this.auditLogRepository.Query((page - 1) * pageSize, pageSize, {
      ActorUserId: input.ActorUserId,
      Action: input.Action,
      ObjectType: input.ObjectType,
      ObjectId: input.ObjectId,
      ReasonCodeId: input.ReasonCodeId,
      From: input.From,
      To: input.To,
    });
    return {
      Items: Items.map(AuditLogDtoMapper.ToDto),
      Meta: {
        Page: page,
        PageSize: pageSize,
        TotalItems,
        TotalPages: Math.max(1, Math.ceil(TotalItems / pageSize)),
      },
    };
  }
}
