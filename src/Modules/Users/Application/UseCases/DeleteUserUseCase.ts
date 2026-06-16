import { NotFoundException } from '../../../../Common/Exceptions/AppException';
import { IUserRepository } from '../../Domain/Interfaces/IUserRepository';

export class DeleteUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async Execute(id: string): Promise<void> {
    const existing = await this.userRepository.FindById(id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.Delete(id);
  }
}
