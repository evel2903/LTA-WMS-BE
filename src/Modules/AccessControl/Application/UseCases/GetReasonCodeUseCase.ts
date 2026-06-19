import { NotFoundException } from '@common/Exceptions/AppException';
import { IReasonCodeRepository } from '@modules/AccessControl/Application/Interfaces/IReasonCodeRepository';
import { ReasonCodeDto } from '@modules/AccessControl/Application/DTOs/ReasonCodeDto';
import { ReasonCodeDtoMapper } from '@modules/AccessControl/Application/Mappers/ReasonCodeDtoMapper';

export class GetReasonCodeUseCase {
  constructor(private readonly reasonCodeRepository: IReasonCodeRepository) {}

  public async Execute(id: string): Promise<ReasonCodeDto> {
    const reason = await this.reasonCodeRepository.FindById(id);
    if (!reason) {
      throw new NotFoundException('Reason code not found');
    }
    return ReasonCodeDtoMapper.ToDto(reason);
  }
}
