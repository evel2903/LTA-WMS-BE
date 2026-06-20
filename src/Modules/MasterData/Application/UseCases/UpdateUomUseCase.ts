import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
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
import { UomDto } from '@modules/MasterData/Application/DTOs/UomDto';
import { UpdateUomDto } from '@modules/MasterData/Application/DTOs/UpdateUomDto';
import { IUomRepository } from '@modules/MasterData/Application/Interfaces/IUomRepository';
import { UomDtoMapper } from '@modules/MasterData/Application/Mappers/UomDtoMapper';
import { UomEntity } from '@modules/MasterData/Domain/Entities/UomEntity';

export class UpdateUomUseCase {
  // Optional audit deps: see CreateUomUseCase — module always wires them.
  constructor(
    private readonly uomRepository: IUomRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: UpdateUomDto, context: AuditContext = SystemAuditContext): Promise<UomDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.UomPack,
        ObjectType: ObjectType.Uom,
        Action: ActionCode.Update,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const uom = await this.uomRepository.FindById(request.Id);
    if (!uom) {
      throw new NotFoundException('UOM not found');
    }
    const before = UomDtoMapper.ToDto(uom) as unknown as Record<string, unknown>;

    if (request.UomCode && request.UomCode !== uom.UomCode) {
      const duplicate = await this.uomRepository.FindByCode(request.UomCode);
      if (duplicate && duplicate.Id !== uom.Id) {
        throw new ConflictException('UOM code already exists');
      }
      uom.UomCode = request.UomCode;
    }

    uom.UomName = request.UomName ?? uom.UomName;
    uom.UomType = request.UomType ?? uom.UomType;
    uom.DecimalPrecision = request.DecimalPrecision ?? uom.DecimalPrecision;
    uom.Status = request.Status ?? uom.Status;
    uom.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : uom.SourceSystem;
    uom.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : uom.ReferenceId;
    uom.UpdatedAt = new Date();

    const buildEntry = (updated: UomEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Uom,
        ObjectId: updated.Id,
        ObjectCode: updated.UomCode,
        BeforeJson: before,
        AfterJson: UomDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
        ReasonCodeId: reasonCodeId,
      });

    if (!this.auditedTransaction) {
      const updated = await this.uomRepository.Update(uom);
      return UomDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.uomRepository.Update(uom, manager);
      return { result: UomDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
