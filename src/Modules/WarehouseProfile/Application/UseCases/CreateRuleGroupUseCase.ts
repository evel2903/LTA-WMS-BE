import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import { CreateRuleGroupDto } from '@modules/WarehouseProfile/Application/DTOs/CreateRuleGroupDto';
import { RuleGroupDto } from '@modules/WarehouseProfile/Application/DTOs/RuleGroupDto';
import { IRuleGroupRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import { RuleGroupDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/RuleGroupDtoMapper';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';

export class CreateRuleGroupUseCase {
  constructor(private readonly groupRepository: IRuleGroupRepository) {}

  public async Execute(request: CreateRuleGroupDto): Promise<RuleGroupDto> {
    const groupCode = this.AssertNonEmpty(request.GroupCode, 'GroupCode');
    const groupName = this.AssertNonEmpty(request.GroupName, 'GroupName');
    const catalogState = this.ResolveCatalogState(request.CatalogState);

    if (await this.groupRepository.FindByCode(groupCode)) {
      throw new ConflictException('Rule group code already exists');
    }

    const now = new Date();
    const group = new RuleGroupEntity({
      Id: randomUUID(),
      GroupCode: groupCode,
      GroupName: groupName,
      Description: request.Description ?? null,
      CatalogState: catalogState,
      DisplayOrder: request.DisplayOrder ?? null,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: request.CreatedBy ?? null,
      UpdatedBy: request.CreatedBy ?? null,
    });

    const created = await this.groupRepository.Create(group);
    return RuleGroupDtoMapper.ToDto(created);
  }

  private AssertNonEmpty(value: string | undefined, label: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BusinessRuleException(`${label} is required`);
    }
    return value.trim();
  }

  private ResolveCatalogState(value: RuleGroupCatalogState | undefined): RuleGroupCatalogState {
    if (value === undefined) {
      return RuleGroupCatalogState.Active;
    }
    if (!(Object.values(RuleGroupCatalogState) as string[]).includes(value)) {
      throw new BusinessRuleException(`CatalogState must be one of ${Object.values(RuleGroupCatalogState).join(', ')}`);
    }
    return value;
  }
}
