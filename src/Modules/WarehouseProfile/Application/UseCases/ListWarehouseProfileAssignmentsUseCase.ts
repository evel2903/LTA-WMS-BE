import { NotFoundException } from '@common/Exceptions/AppException';
import { GetPagination, ToPagedResult } from '@common/Helpers/Pagination';
import { WarehouseProfileAssignmentDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileAssignmentDto';
import {
  IWarehouseProfileAssignmentRepository,
  WarehouseProfileAssignmentListFilter,
} from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileAssignmentRepository';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileAssignmentDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileAssignmentDtoMapper';

export class ListWarehouseProfileAssignmentsUseCase {
  constructor(
    private readonly assignmentRepository: IWarehouseProfileAssignmentRepository,
    private readonly profileRepository: IWarehouseProfileRepository,
  ) {}

  public async Execute(
    warehouseProfileId: string,
    query: WarehouseProfileAssignmentListFilter & { Page?: number; PageSize?: number },
  ): Promise<{
    Items: WarehouseProfileAssignmentDto[];
    Meta: { Page: number; PageSize: number; TotalItems: number; TotalPages: number };
  }> {
    const profile = await this.profileRepository.FindById(warehouseProfileId);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }

    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.assignmentRepository.ListByProfile(warehouseProfileId, paging.Skip, paging.Take, {
      AssignmentType: query.AssignmentType,
    });

    return ToPagedResult(
      result.Items.map(WarehouseProfileAssignmentDtoMapper.ToDto),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }
}
