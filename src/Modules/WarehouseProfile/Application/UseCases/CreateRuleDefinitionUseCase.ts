import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { ISkuRepository } from '@modules/MasterData/Application/Interfaces/ISkuRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { CreateRuleDefinitionDto } from '@modules/WarehouseProfile/Application/DTOs/CreateRuleDefinitionDto';
import { RuleDefinitionDto } from '@modules/WarehouseProfile/Application/DTOs/RuleDefinitionDto';
import { IRuleDefinitionRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleDefinitionRepository';
import { IRuleGroupRepository } from '@modules/WarehouseProfile/Application/Interfaces/IRuleGroupRepository';
import { RuleDefinitionDtoMapper } from '@modules/WarehouseProfile/Application/Mappers/RuleDefinitionDtoMapper';
import { ParseEffectiveDate } from '@modules/WarehouseProfile/Application/Services/EffectiveDate';
import { RulePayloadValidator } from '@modules/WarehouseProfile/Application/Services/RulePayloadValidator';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { ScopeReferenceValidator } from '@modules/WarehouseProfile/Application/Services/ScopeReferenceValidator';
import { RuleStatus } from '@modules/WarehouseProfile/Domain/Enums/RuleStatus';
import { RuleDefinitionEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleDefinitionEntity';

export class CreateRuleDefinitionUseCase {
  private readonly scopeReferenceValidator: ScopeReferenceValidator;

  constructor(
    private readonly definitionRepository: IRuleDefinitionRepository,
    private readonly groupRepository: IRuleGroupRepository,
    warehouseRepository: IWarehouseRepository,
    zoneRepository: IZoneRepository,
    ownerRepository: IOwnerRepository,
    skuRepository: ISkuRepository,
    private readonly scopeKeyService: ScopeKeyService,
    private readonly payloadValidator: RulePayloadValidator,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {
    this.scopeReferenceValidator = new ScopeReferenceValidator(
      warehouseRepository,
      zoneRepository,
      ownerRepository,
      skuRepository,
    );
  }

  public async Execute(
    request: CreateRuleDefinitionDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<RuleDefinitionDto> {
    const ruleCode = this.AssertNonEmpty(request.RuleCode, 'RuleCode');
    const ruleName = this.AssertNonEmpty(request.RuleName, 'RuleName');

    const precedenceTier = this.payloadValidator.AssertPrecedenceTier(request.PrecedenceTier);
    const controlMode = this.payloadValidator.AssertControlMode(request.ControlMode);
    const status =
      request.Status === undefined ? RuleStatus.Active : this.payloadValidator.AssertStatus(request.Status);

    const conditionJson = this.payloadValidator.ValidateCondition(request.ConditionJson);
    const actionJson = this.payloadValidator.ValidateAction(request.ActionJson);

    const effectiveFrom = ParseEffectiveDate(request.EffectiveFrom, 'EffectiveFrom');
    const effectiveTo = request.EffectiveTo ? ParseEffectiveDate(request.EffectiveTo, 'EffectiveTo') : null;
    this.payloadValidator.AssertEffectiveWindow(effectiveFrom, effectiveTo);

    const group = await this.groupRepository.FindById(request.RuleGroupId);
    if (!group) {
      throw new NotFoundException('Rule group not found');
    }

    // Non-null scope references must exist and be active (master-data ports, reused from B1).
    await this.scopeReferenceValidator.Assert({
      WarehouseId: request.WarehouseId ?? null,
      ZoneId: request.ZoneId ?? null,
      OwnerId: request.OwnerId ?? null,
      SkuId: request.SkuId ?? null,
    });

    if (await this.definitionRepository.FindByCode(ruleCode)) {
      throw new ConflictException('Rule code already exists');
    }

    const scopeKey = this.scopeKeyService.Build({
      // warehouse_type_code is a V0 string catalog axis; null/empty normalizes to wildcard.
      WarehouseTypeCode: request.WarehouseTypeCode ?? '',
      WarehouseId: request.WarehouseId,
      ZoneId: request.ZoneId,
      LocationType: request.LocationType,
      OwnerId: request.OwnerId,
      SkuId: request.SkuId,
      ItemClass: request.ItemClass,
      OrderType: request.OrderType,
      CustomerId: request.CustomerId,
      SupplierId: request.SupplierId,
    });

    const now = new Date();
    const definition = new RuleDefinitionEntity({
      Id: randomUUID(),
      RuleCode: ruleCode,
      RuleName: ruleName,
      RuleGroupId: group.Id,
      PrecedenceTier: precedenceTier,
      ControlMode: controlMode,
      WarehouseTypeCode: request.WarehouseTypeCode ?? null,
      WarehouseId: request.WarehouseId ?? null,
      ZoneId: request.ZoneId ?? null,
      LocationType: request.LocationType ?? null,
      OwnerId: request.OwnerId ?? null,
      SkuId: request.SkuId ?? null,
      ItemClass: request.ItemClass ?? null,
      OrderType: request.OrderType ?? null,
      CustomerId: request.CustomerId ?? null,
      SupplierId: request.SupplierId ?? null,
      ScopeKey: scopeKey,
      ConditionJson: conditionJson,
      ActionJson: actionJson,
      Priority: request.Priority ?? 100,
      Status: status,
      EffectiveFrom: effectiveFrom,
      EffectiveTo: effectiveTo,
      RequiresReason: request.RequiresReason ?? false,
      RequiresEvidence: request.RequiresEvidence ?? false,
      AllowOverride: request.AllowOverride ?? false,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: request.CreatedBy ?? null,
      UpdatedBy: request.CreatedBy ?? null,
    });

    const buildEntry = (created: RuleDefinitionEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Rule,
        ObjectId: created.Id,
        ObjectCode: created.RuleCode,
        AfterJson: RuleDefinitionDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
        WarehouseId: created.WarehouseId,
        OwnerId: created.OwnerId,
      });

    if (!this.auditedTransaction) {
      const created = await this.definitionRepository.Create(definition);
      return RuleDefinitionDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.definitionRepository.Create(definition, manager);
      return { result: RuleDefinitionDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }

  private AssertNonEmpty(value: string | undefined, label: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BusinessRuleException(`${label} is required`);
    }
    return value.trim();
  }
}
