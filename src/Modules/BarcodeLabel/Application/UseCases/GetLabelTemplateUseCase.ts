import { NotFoundException } from '@common/Exceptions/AppException';
import { LabelTemplateDto } from '@modules/BarcodeLabel/Application/DTOs/LabelTemplateDto';
import { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { BarcodeLabelDtoMapper } from '@modules/BarcodeLabel/Application/Mappers/BarcodeLabelDtoMapper';

export class GetLabelTemplateUseCase {
  constructor(private readonly labels: IBarcodeLabelRepository) {}

  public async Execute(id: string): Promise<LabelTemplateDto> {
    const template = await this.labels.FindTemplateById(id);
    if (!template) throw new NotFoundException('Label template not found');
    return BarcodeLabelDtoMapper.ToTemplateDto(template);
  }
}
