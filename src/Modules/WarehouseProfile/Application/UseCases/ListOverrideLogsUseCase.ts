import {
  IOverrideLogRepository,
  OverrideLogListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IOverrideLogRepository';
import { OverrideLogDto } from '@modules/WarehouseProfile/Application/DTOs/OverrideLogDto';
import { OverrideLogDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/OverrideLogDtoMapper';

export interface ListOverrideLogsInput extends OverrideLogListFilter {
  Page?: number;
  PageSize?: number;
}

export interface PaginatedOverrideLogs {
  Items: OverrideLogDto[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

/** Override-frequency query (FR-19): filter by rule/actor/target and a created-at window. */
export class ListOverrideLogsUseCase {
  constructor(private readonly overrideLogs: IOverrideLogRepository) {}

  public async Execute(input: ListOverrideLogsInput = {}): Promise<PaginatedOverrideLogs> {
    const page = input.Page && input.Page > 0 ? input.Page : 1;
    const pageSize = input.PageSize && input.PageSize > 0 ? input.PageSize : 20;
    const { Items, TotalItems } = await this.overrideLogs.List((page - 1) * pageSize, pageSize, {
      RuleId: input.RuleId,
      ActorUserId: input.ActorUserId,
      TargetObjectType: input.TargetObjectType,
      TargetObjectId: input.TargetObjectId,
      From: input.From,
      To: input.To,
    });
    return {
      Items: Items.map(OverrideLogDtoMapper.ToDto),
      Meta: {
        Page: page,
        PageSize: pageSize,
        TotalItems,
        TotalPages: Math.max(1, Math.ceil(TotalItems / pageSize)),
      },
    };
  }
}
