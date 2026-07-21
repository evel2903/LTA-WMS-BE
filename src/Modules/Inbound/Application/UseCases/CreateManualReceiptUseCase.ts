import { randomUUID } from 'crypto';
import { BusinessRuleException, ConflictException } from '@common/Exceptions/AppException';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CreateManualReceiptDto, CreateManualReceiptResultDto } from '@modules/Inbound/Application/DTOs/ReceiptDto';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertReceiptPermission } from '@modules/Inbound/Application/Services/ReceiptPermission';
import { ReceiptEntity } from '@modules/Inbound/Domain/Entities/ReceiptEntity';
import { ReceivingSessionEntity } from '@modules/Inbound/Domain/Entities/ReceivingSessionEntity';
import { IOwnerRepository } from '@modules/MasterData/Application/Interfaces/IOwnerRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { IPartnerRepository } from '@modules/PartnerMaster/Application/Interfaces/IPartnerRepository';
import { PartnerStatus } from '@modules/PartnerMaster/Domain/Enums/PartnerStatus';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

export class CreateManualReceiptUseCase {
  constructor(
    private readonly receiving: IReceivingRepository,
    private readonly partners: IPartnerRepository,
    private readonly owners: IOwnerRepository,
    private readonly warehouses: IWarehouseRepository,
    private readonly profiles: IWarehouseProfileRepository,
    private readonly audited: AuditedTransaction,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(
    request: CreateManualReceiptDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<CreateManualReceiptResultDto> {
    const input = this.Normalize(request);
    const duplicate = await this.receiving.FindReceiptByIdempotencyKey(
      input.OwnerId,
      input.WarehouseId,
      input.IdempotencyKey,
    );
    if (duplicate) {
      await AssertReceiptPermission(this.permissionChecker, context.ActorUserId, ActionCode.Create, duplicate);
      return await this.ReturnDuplicate(duplicate, input);
    }

    const [supplier, owner, warehouse, profile] = await Promise.all([
      this.partners.FindById(input.SupplierId),
      this.owners.FindById(input.OwnerId),
      this.warehouses.FindById(input.WarehouseId),
      input.WarehouseProfileId ? this.profiles.FindById(input.WarehouseProfileId) : Promise.resolve(null),
    ]);
    if (!supplier || supplier.PartnerType !== PartnerType.Supplier || supplier.Status !== PartnerStatus.Active) {
      throw new BusinessRuleException('Supplier not found or inactive');
    }
    if (!owner || owner.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Owner not found or inactive');
    }
    if (!warehouse || warehouse.Status !== MasterDataStatus.Active) {
      throw new BusinessRuleException('Warehouse not found or inactive');
    }
    if (input.WarehouseProfileId) {
      const now = new Date();
      if (!profile || profile.Status !== WarehouseProfileStatus.Active) {
        throw new BusinessRuleException('WarehouseProfile not found or inactive for manual receipt');
      }
      if (profile.EffectiveFrom > now || (profile.EffectiveTo && profile.EffectiveTo < now)) {
        throw new BusinessRuleException('WarehouseProfile is not effective for manual receipt');
      }
      if (profile.OwnerId && profile.OwnerId !== input.OwnerId) {
        throw new BusinessRuleException('WarehouseProfile owner scope does not match manual receipt');
      }
      if (profile.WarehouseId && profile.WarehouseId !== input.WarehouseId) {
        throw new BusinessRuleException('WarehouseProfile warehouse scope does not match manual receipt');
      }
      if (profile.SupplierId && profile.SupplierId !== input.SupplierId) {
        throw new BusinessRuleException('WarehouseProfile supplier scope does not match manual receipt');
      }
    }

    const now = new Date();
    const receipt = new ReceiptEntity({
      Id: randomUUID(),
      InboundPlanId: null,
      ReceiptNumber: input.ReceiptNumber,
      BusinessReference: input.BusinessReference,
      OwnerId: owner.Id,
      OwnerCode: owner.OwnerCode,
      WarehouseId: warehouse.Id,
      WarehouseCode: warehouse.WarehouseCode,
      WarehouseProfileId: input.WarehouseProfileId,
      SupplierId: supplier.Id,
      IdempotencyKey: input.IdempotencyKey,
      CoreFlowInstanceId: null,
      CreatedAt: now,
      UpdatedAt: now,
      CreatedBy: context.ActorUserId,
    });
    await AssertReceiptPermission(this.permissionChecker, context.ActorUserId, ActionCode.Create, receipt);

    const session = new ReceivingSessionEntity({
      Id: randomUUID(),
      InboundPlanId: null,
      ReceiptId: receipt.Id,
      SessionKey: input.SessionKey,
      DeviceCode: input.DeviceCode,
      OwnerId: owner.Id,
      OwnerCode: owner.OwnerCode,
      WarehouseId: warehouse.Id,
      WarehouseCode: warehouse.WarehouseCode,
      StartedAt: now,
      CreatedAt: now,
      UpdatedAt: now,
      StartedBy: context.ActorUserId,
    });

    try {
      return await this.audited.Run(async (manager) => {
        const created = await this.receiving.CreateSessionWithReceipt(session, receipt, manager);
        const result = this.ToResult(created.Receipt, created.Session, false);
        return {
          result,
          entry: MergeAuditContext(context, {
            Action: ActionCode.Create,
            ObjectType: ObjectType.Receipt,
            ObjectId: created.Receipt.Id,
            ObjectCode: created.Receipt.ReceiptNumber,
            AfterJson: result as unknown as Record<string, unknown>,
            ReferenceType: 'ReceivingSession',
            ReferenceId: created.Session.Id,
            WarehouseId: created.Receipt.WarehouseId,
            OwnerId: created.Receipt.OwnerId,
          }),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        const raced = await this.receiving.FindReceiptByIdempotencyKey(
          input.OwnerId,
          input.WarehouseId,
          input.IdempotencyKey,
        );
        if (raced) return await this.ReturnDuplicate(raced, input);
      }
      throw error;
    }
  }

  private async ReturnDuplicate(
    receipt: ReceiptEntity,
    input: Required<Omit<CreateManualReceiptDto, 'WarehouseProfileId' | 'DeviceCode'>> & {
      WarehouseProfileId: string | null;
      DeviceCode: string | null;
    },
  ): Promise<CreateManualReceiptResultDto> {
    const session = await this.receiving.FindSessionByReceiptAndKey(receipt.Id, input.SessionKey);
    const samePayload =
      receipt.InboundPlanId === null &&
      receipt.OwnerId === input.OwnerId &&
      receipt.WarehouseId === input.WarehouseId &&
      receipt.WarehouseProfileId === input.WarehouseProfileId &&
      receipt.SupplierId === input.SupplierId &&
      receipt.ReceiptNumber === input.ReceiptNumber &&
      receipt.BusinessReference === input.BusinessReference &&
      session?.Session.DeviceCode === input.DeviceCode;
    if (!session || !samePayload) {
      throw new ConflictException('Idempotency key was already used with a different manual receipt payload');
    }
    return this.ToResult(receipt, session.Session, true);
  }

  private ToResult(
    receipt: ReceiptEntity,
    session: ReceivingSessionEntity,
    isDuplicate: boolean,
  ): CreateManualReceiptResultDto {
    return {
      Receipt: ReceivingDtoMapper.ToReceiptDto(receipt),
      Session: ReceivingDtoMapper.ToSessionDto(session, receipt, isDuplicate),
      IsDuplicate: isDuplicate,
    };
  }

  private Normalize(request: CreateManualReceiptDto) {
    const required = [
      request.OwnerId,
      request.WarehouseId,
      request.SupplierId,
      request.ReceiptNumber,
      request.BusinessReference,
      request.SessionKey,
      request.IdempotencyKey,
    ];
    if (required.some((value) => !value?.trim())) {
      throw new BusinessRuleException('Manual receipt required fields cannot be empty');
    }
    return {
      ...request,
      OwnerId: request.OwnerId.trim(),
      WarehouseId: request.WarehouseId.trim(),
      WarehouseProfileId: request.WarehouseProfileId?.trim() || null,
      SupplierId: request.SupplierId.trim(),
      // ponytail: canonicalizes to uppercase so the existing case-sensitive unique index catches case-variant
      // duplicates atomically; if preserving the operator's original casing on display ever matters, replace
      // with a case-insensitive (LOWER()) expression index instead.
      ReceiptNumber: request.ReceiptNumber.trim().toUpperCase(),
      BusinessReference: request.BusinessReference.trim(),
      SessionKey: request.SessionKey.trim(),
      DeviceCode: request.DeviceCode?.trim() || null,
      IdempotencyKey: request.IdempotencyKey.trim(),
    };
  }
}
