import { NotFoundException } from '@common/Exceptions/AppException';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { IWarehouseProfileRuleRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRuleRepository';

export class RemoveWarehouseProfileRuleUseCase {
  constructor(
    private readonly bindingRepository: IWarehouseProfileRuleRepository,
    private readonly profileRepository: IWarehouseProfileRepository,
  ) {}

  /**
   * Removes the binding (warehouse_profile_rule). Does NOT delete the rule definition.
   */
  public async Execute(warehouseProfileId: string, bindingId: string): Promise<void> {
    const profile = await this.profileRepository.FindById(warehouseProfileId);
    if (!profile) {
      throw new NotFoundException('Warehouse profile not found');
    }

    const binding = await this.bindingRepository.FindById(bindingId);
    if (!binding || binding.WarehouseProfileId !== profile.Id) {
      throw new NotFoundException('Profile rule binding not found');
    }

    await this.bindingRepository.Delete(binding.Id);
  }
}
