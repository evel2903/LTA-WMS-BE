import {
  ExceptionCaseListFilter,
  IExceptionCaseRepository,
} from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { ExceptionCaseDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { ExceptionCaseDtoMapper } from '@modules/AccessControl/Application/Mappers/ExceptionCaseDtoMapper';

export interface ListExceptionsInput extends ExceptionCaseListFilter {
  Page?: number;
  PageSize?: number;
}

export interface PaginatedExceptions {
  Items: ExceptionCaseDto[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export class ListExceptionsUseCase {
  constructor(private readonly cases: IExceptionCaseRepository) {}

  public async Execute(input: ListExceptionsInput = {}): Promise<PaginatedExceptions> {
    const page = input.Page && input.Page > 0 ? input.Page : 1;
    const pageSize = input.PageSize && input.PageSize > 0 ? input.PageSize : 20;
    const { Items, TotalItems } = await this.cases.List((page - 1) * pageSize, pageSize, {
      State: input.State,
      ExceptionType: input.ExceptionType,
      ReferenceType: input.ReferenceType,
      ReferenceId: input.ReferenceId,
      WarehouseId: input.WarehouseId,
      OwnerId: input.OwnerId,
      AssignedToUserId: input.AssignedToUserId,
      Severity: input.Severity,
    });
    return {
      Items: Items.map(ExceptionCaseDtoMapper.ToDto),
      Meta: {
        Page: page,
        PageSize: pageSize,
        TotalItems,
        TotalPages: Math.max(1, Math.ceil(TotalItems / pageSize)),
      },
    };
  }
}
