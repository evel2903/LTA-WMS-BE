import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { CreateUomDto } from '@modules/MasterData/Application/DTOs/CreateUomDto';
import { UomDto } from '@modules/MasterData/Application/DTOs/UomDto';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomDtoMapper } from '@modules/MasterData/Application/Mappers/UomDtoMapper';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';

export class CreateUomUseCase {
  // ownershipPolicy + auditedTransaction are optional only so fixture-setup tests can
  // construct the use case bare; the module always wires them, so production always
  // enforces A6 (UomPack: conditional-edit) + writes audit in-transaction.
  constructor(
    private readonly uomRepository: IUomRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: CreateUomDto, context: AuditContext = SystemAuditContext): Promise<UomDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.UomPack,
        ObjectType: ObjectType.Uom,
        Action: ActionCode.Create,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const existing = await this.uomRepository.FindByCode(request.UomCode);
    if (existing) {
      throw new ConflictException('UOM code already exists');
    }

    const now = new Date();
    const uom = new UomEntity({
      Id: randomUUID(),
      UomCode: request.UomCode,
      UomName: request.UomName,
      UomType: request.UomType ?? 'Quantity',
      DecimalPrecision: request.DecimalPrecision ?? 0,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const buildEntry = (created: UomEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Uom,
        ObjectId: created.Id,
        ObjectCode: created.UomCode,
        AfterJson: UomDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
      });

    if (!this.auditedTransaction) {
      const created = await this.uomRepository.Create(uom);
      return UomDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.uomRepository.Create(uom, manager);
      return { result: UomDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
