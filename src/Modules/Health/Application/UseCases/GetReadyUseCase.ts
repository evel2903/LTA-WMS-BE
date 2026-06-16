import { IHealthService, ReadyReport } from '@modules/Health/Application/Interfaces/IHealthService';

export class GetReadyUseCase {
  constructor(private readonly healthService: IHealthService) {}

  public async Execute(): Promise<ReadyReport> {
    return await this.healthService.Ready();
  }
}
