import { NotFoundException } from '@common/Exceptions/AppException';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { IReceivingRepository } from '@modules/Inbound/Application/Interfaces/IReceivingRepository';
import { ReceivingDtoMapper } from '@modules/Inbound/Application/Mappers/ReceivingDtoMapper';
import { AssertReceiptPermission } from '@modules/Inbound/Application/Services/ReceiptPermission';

export class GetReceiptUseCase {
  constructor(
    private readonly receiving: IReceivingRepository,
    private readonly permissionChecker?: IPermissionChecker,
  ) {}

  public async Execute(id: string, actorUserId?: string | null) {
    const receipt = await this.receiving.FindReceiptById(id);
    if (!receipt) throw new NotFoundException('Receipt not found');
    await AssertReceiptPermission(this.permissionChecker, actorUserId, ActionCode.Read, receipt);
    return ReceivingDtoMapper.ToReceiptDto(receipt);
  }
}
