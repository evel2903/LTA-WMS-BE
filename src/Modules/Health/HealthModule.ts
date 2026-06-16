import { Module } from '@nestjs/common';
import { HEALTH_SERVICE, IHealthService } from './Domain/Interfaces/IHealthService';
import { GetLiveUseCase } from './Application/UseCases/GetLiveUseCase';
import { GetReadyUseCase } from './Application/UseCases/GetReadyUseCase';
import { HealthService } from './Infrastructure/Services/HealthService';
import { HealthController } from './Presentation/Controllers/HealthController';

@Module({
  controllers: [HealthController],
  providers: [
    { provide: HEALTH_SERVICE, useClass: HealthService },
    {
      provide: GetLiveUseCase,
      useFactory: (service: IHealthService) => new GetLiveUseCase(service),
      inject: [HEALTH_SERVICE],
    },
    {
      provide: GetReadyUseCase,
      useFactory: (service: IHealthService) => new GetReadyUseCase(service),
      inject: [HEALTH_SERVICE],
    },
  ],
})
export class HealthModule {}
