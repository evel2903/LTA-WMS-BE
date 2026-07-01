import {
  IReasonCodeRepository,
  ReasonCodeListFilter,
} from '@modules/AccessControl/Application/Interfaces/IReasonCodeRepository';
import { ReasonCodeDto } from '@modules/AccessControl/Application/DTOs/ReasonCodeDto';
import { ReasonCodeDtoMapper } from '@modules/AccessControl/Application/Mappers/ReasonCodeDtoMapper';

export interface ListReasonCodesInput extends ReasonCodeListFilter {
  Page?: number;
  PageSize?: number;
}

export interface PaginatedReasonCodes {
  Items: ReasonCodeDto[];
  Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
}

export class ListReasonCodesUseCase {
  constructor(private readonly reasonCodeRepository: IReasonCodeRepository) {}

  public async Execute(input: ListReasonCodesInput = {}): Promise<PaginatedReasonCodes> {
    const page = input.Page && input.Page > 0 ? input.Page : 1;
    const pageSize = input.PageSize && input.PageSize > 0 ? input.PageSize : 20;
    const { Items, TotalItems } = await this.reasonCodeRepository.List((page - 1) * pageSize, pageSize, {
      ReasonGroup: input.ReasonGroup,
      Status: input.Status,
      Action: input.Action,
      ObjectType: input.ObjectType,
    });
    return {
      Items: Items.map(ReasonCodeDtoMapper.ToDto),
      Meta: {
        Page: page,
        PageSize: pageSize,
        TotalItems,
        TotalPages: Math.max(1, Math.ceil(TotalItems / pageSize)),
      },
    };
  }
}
