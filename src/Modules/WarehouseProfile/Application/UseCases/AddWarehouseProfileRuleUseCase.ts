import { randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateWarehouseProfileRuleDto } from '@modules/WarehouseProfile/Application/DTOs/CreateWarehouseProfileRuleDto';
import { WarehouseProfileRuleDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileRuleDto';
import { IRuleDefinitionRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { IWarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';
import { WarehouseProfileRuleDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/WarehouseProfileRuleDtoMapper';
import { WarehouseProfileRuleEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileRuleEntity';

export class AddWarehouseProfileRuleUseCase {
  // auditedTransaction is optional only so fixture-setup tests can construct the use case
  // bare; the module always wires it. This is AUDIT-ONLY (no ownership policy / reason-code).
  constructor(
    private readonly bindingRepository: IWarehouseProfileRuleRepository,
    private readonly profileRepository: IWarehouseProfileRepository,
    private readonly definitionRepository: IRuleDefinitionRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: CreateWarehouseProfileRuleDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<WarehouseProfileRuleDto> {
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

    const buildEntry = (created: WarehouseProfileRuleEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Rule,
        ObjectId: created.Id,
        ObjectCode: null,
        AfterJson: WarehouseProfileRuleDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
        WarehouseId: null,
        OwnerId: null,
      });

    if (!this.auditedTransaction) {
      const created = await this.bindingRepository.Create(binding);
      return WarehouseProfileRuleDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.bindingRepository.Create(binding, manager);
      return { result: WarehouseProfileRuleDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
