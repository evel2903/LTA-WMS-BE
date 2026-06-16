import { Module } from '@nestjs/common';
import { HEALTH_SERVICE, IHealthService } from '@modules/Health/Application/Interfaces/IHealthService';
import { GetLiveUseCase } from '@modules/Health/Application/UseCases/GetLiveUseCase';
import { GetReadyUseCase } from '@modules/Health/Application/UseCases/GetReadyUseCase';
import { HealthService } from '@modules/Health/Infrastructure/Services/HealthService';
import { HealthController } from '@modules/Health/Presentation/Controllers/HealthController';

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
