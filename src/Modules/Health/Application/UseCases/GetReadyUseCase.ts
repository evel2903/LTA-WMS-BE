import { IHealthService, ReadyReport } from '../../Domain/Interfaces/IHealthService';

export class GetReadyUseCase {
  constructor(private readonly healthService: IHealthService) {}

  public async Execute(): Promise<ReadyReport> {
    return await this.healthService.Ready();
  }
}
