import { NotFoundException } from '@common/Exceptions/AppException';
import { PrintJobDto } from '@modules/BarcodeLabel/Application/DTOs/PrintJobDto';
import { IBarcodeLabelRepository } from '@modules/BarcodeLabel/Application/Interfaces/IBarcodeLabelRepository';
import { BarcodeLabelDtoMapper } from '@modules/BarcodeLabel/Application/Mappers/BarcodeLabelDtoMapper';

export class GetPrintJobUseCase {
  constructor(private readonly labels: IBarcodeLabelRepository) {}

  public async Execute(id: string): Promise<PrintJobDto> {
    const printJob = await this.labels.FindPrintJobById(id);
    if (!printJob) throw new NotFoundException('Print job not found');
    return BarcodeLabelDtoMapper.ToPrintJobDto(printJob);
  }
}
