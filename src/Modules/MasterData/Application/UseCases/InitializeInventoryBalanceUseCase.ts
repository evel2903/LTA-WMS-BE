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
import { InitializeInventoryBalanceDto } from '@modules/MasterData/Application/DTOs/InitializeInventoryBalanceDto';
import { InventoryBalanceDto } from '@modules/MasterData/Application/DTOs/InventoryBalanceDto';
import { IInventoryBalanceRepository } from '@modules/MasterData/Application/Interfaces/IInventoryBalanceRepository';
import { IInventoryDimensionRepository } from '@modules/MasterData/Application/Interfaces/IInventoryDimensionRepository';
import { InventoryBalanceMapper } from '@modules/MasterData/Application/Mappers/InventoryBalanceMapper';
import { InventoryIdentityPolicyValidator } from '@modules/MasterData/Application/Services/InventoryIdentityPolicyValidator';
import { InventoryBalanceEntity } from '@modules/MasterData/Domain/Entities/InventoryBalanceEntity';

export class InitializeInventoryBalanceUseCase {
  // Inventory balance is an operational record (not in the A6 master-data ownership catalog)
  // → audit-only: no ownership enforcement, just an in-transaction audit record.
  constructor(
    private readonly inventoryBalances: IInventoryBalanceRepository,
    private readonly inventoryDimensions: IInventoryDimensionRepository,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(
    request: InitializeInventoryBalanceDto,
    context: AuditContext = SystemAuditContext,
  ): Promise<InventoryBalanceDto> {
    const dimension = await this.inventoryDimensions.FindById(request.DimensionId);
    if (!dimension) {
      throw new NotFoundException('Inventory dimension not found');
    }

    const duplicate = await this.inventoryBalances.FindByDimensionId(request.DimensionId);
    if (duplicate) {
      throw new ConflictException('Inventory balance already exists for dimension');
    }

    const qtyOnHand = request.QtyOnHand ?? 0;
    const qtyReserved = request.QtyReserved ?? 0;
    InventoryIdentityPolicyValidator.ValidateQuantities(qtyOnHand, qtyReserved);

    const now = new Date();
    const balance = new InventoryBalanceEntity({
      Id: randomUUID(),
      DimensionId: request.DimensionId,
      QtyOnHand: qtyOnHand,
      QtyReserved: qtyReserved,
      QtyAvailable: qtyOnHand - qtyReserved,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const buildEntry = (created: InventoryBalanceEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.InventoryStatus,
        ObjectId: created.Id,
        AfterJson: InventoryBalanceMapper.ToDto(created) as unknown as Record<string, unknown>,
        ReferenceType: 'InventoryDimension',
        ReferenceId: created.DimensionId,
      });

    if (!this.auditedTransaction) {
      const created = await this.inventoryBalances.Create(balance);
      return InventoryBalanceMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.inventoryBalances.Create(balance, manager);
      return { result: InventoryBalanceMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
