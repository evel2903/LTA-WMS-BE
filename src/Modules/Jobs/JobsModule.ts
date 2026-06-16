import { Module, type DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { CommonModule } from '../../Common/CommonModule';
import { EXAMPLE_JOB_QUEUE, IExampleJobQueue } from './Domain/Interfaces/IExampleJobQueue';
import { EnqueueExampleJobUseCase } from './Application/UseCases/EnqueueExampleJobUseCase';
import { BullMqExampleJobQueue } from './Infrastructure/Queues/BullMqExampleJobQueue';
import { NoopExampleJobQueue } from './Infrastructure/Queues/NoopExampleJobQueue';
import { ExampleJobProcessor } from './Infrastructure/Workers/ExampleJobProcessor';
import { JobsController } from './Presentation/Controllers/JobsController';

@Module({})
export class JobsModule {
  public static Register(): DynamicModule {
    const redisUrl = process.env.REDIS_URL?.trim();
    const enable = Boolean(redisUrl);

    if (!enable) {
      return {
        module: JobsModule,
        controllers: [],
        providers: [
          { provide: EXAMPLE_JOB_QUEUE, useClass: NoopExampleJobQueue },
          {
            provide: EnqueueExampleJobUseCase,
            useFactory: (queue: IExampleJobQueue) => new EnqueueExampleJobUseCase(queue),
            inject: [EXAMPLE_JOB_QUEUE],
          },
        ],
        exports: [EXAMPLE_JOB_QUEUE],
      };
    }

    return {
      module: JobsModule,
      imports: [
        CommonModule,
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const url = configService.get<string>('Redis.Url');
            const prefix = configService.get<string>('BULL_QUEUE_PREFIX') ?? 'appseed';
            return {
              connection: {
                url,
                enableOfflineQueue: false,
                maxRetriesPerRequest: 1,
                retryStrategy: (times: number) => (times < 3 ? 500 : null),
              },
              prefix,
            };
          },
        }),
        BullModule.registerQueue({ name: 'example' }),
      ],
      controllers: [JobsController],
      providers: [
        { provide: EXAMPLE_JOB_QUEUE, useClass: BullMqExampleJobQueue },
        ExampleJobProcessor,
        {
          provide: EnqueueExampleJobUseCase,
          useFactory: (queue: IExampleJobQueue) => new EnqueueExampleJobUseCase(queue),
          inject: [EXAMPLE_JOB_QUEUE],
        },
      ],
      exports: [EXAMPLE_JOB_QUEUE],
    };
  }
}
