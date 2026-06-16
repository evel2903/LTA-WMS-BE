import { NotFoundException } from '@common/Exceptions/AppException';
import { IUserRepository } from '@modules/Users/Application/Interfaces/IUserRepository';

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
