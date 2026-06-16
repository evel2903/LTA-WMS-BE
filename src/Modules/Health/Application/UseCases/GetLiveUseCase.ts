import { IHealthService } from '../../Domain/Interfaces/IHealthService';

export class GetLiveUseCase {
  constructor(private readonly healthService: IHealthService) {}

  public async Execute(): Promise<{ Status: 'OK' }> {
    return await this.healthService.Live();
  }
}
