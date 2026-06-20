import { NotFoundException } from '@common/Exceptions/AppException';
import { IExceptionCaseRepository } from '@modules/AccessControl/Application/Interfaces/IExceptionCaseRepository';
import { ExceptionCaseDto } from '@modules/AccessControl/Application/DTOs/ExceptionCaseDto';
import { ExceptionCaseDtoMapper } from '@modules/AccessControl/Application/Mappers/ExceptionCaseDtoMapper';

export class GetExceptionUseCase {
  constructor(private readonly cases: IExceptionCaseRepository) {}

  public async Execute(id: string): Promise<ExceptionCaseDto> {
    const entity = await this.cases.FindById(id);
    if (!entity) {
      throw new NotFoundException('Exception case not found');
    }
    return ExceptionCaseDtoMapper.ToDto(entity);
  }
}
