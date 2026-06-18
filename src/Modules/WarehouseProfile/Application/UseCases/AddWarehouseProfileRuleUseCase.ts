import { randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { CreateWarehouseProfileRuleDto } from '@modules/WarehouseProfile/Application/DTOs/CreateWarehouseProfileRuleDto';
import { WarehouseProfileRuleDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileRuleDto';
import { IRuleDefinitionRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { IWarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';
import { WarehouseProfileRuleDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileRuleDtoMapper';
import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';

export class AddWarehouseProfileRuleUseCase {
  constructor(
    private readonly bindingRepository: IWarehouseProfileRuleRepository,
    private readonly profileRepository: IWarehouseProfileRepository,
    private readonly definitionRepository: IRuleDefinitionRepository,
  ) {}

  public async Execute(request: CreateWarehouseProfileRuleDto): Promise<WarehouseProfileRuleDto> {
    const profile = await this.profileRepository.FindById(request.WarehouseProfileId);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }

    const definition = await this.definitionRepository.FindById(request.RuleDefinitionId);
    if (!definition) {
      throw new NotFoundException('Rule definition not found');
    }

    // Pre-check duplicate binding; DB unique index + 23505 mapping is the race backstop.
    const existing = await this.bindingRepository.FindByProfileAndRule(profile.Id, definition.Id);
    if (existing) {
      throw new ConflictException('Rule is already bound to this profile');
    }

    const now = new Date();
    const binding = new WarehouseProfileRuleEntity({
      Id: randomUUID(),
      WarehouseProfileId: profile.Id,
      RuleDefinitionId: definition.Id,
      IsEnabled: request.IsEnabled ?? true,
      OverridePriority: request.OverridePriority ?? null,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: request.CreatedBy ?? null,
      UpdatedBy: request.CreatedBy ?? null,
    });

    const created = await this.bindingRepository.Create(binding);
    return WarehouseProfileRuleDtoMapper.ToDto(created);
  }
}
