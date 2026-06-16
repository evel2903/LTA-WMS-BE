import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JobsController } from '../../../src/Modules/Jobs/Presentation/Controllers/JobsController';
import { EnqueueExampleJobUseCase } from '../../../src/Modules/Jobs/Application/UseCases/EnqueueExampleJobUseCase';

describe('E2E JobsController (no Redis)', () => {
  let app: INestApplication;
  const enqueueExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [{ provide: EnqueueExampleJobUseCase, useValue: { Execute: enqueueExecute } }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    enqueueExecute.mockReset();
  });

  it('POST /jobs/example returns 400 on invalid body', async () => {
    await request(app.getHttpServer()).post('/jobs/example').send({}).expect(400);
    expect(enqueueExecute).not.toHaveBeenCalled();
  });

  it('POST /jobs/example calls use case on valid body', async () => {
    enqueueExecute.mockResolvedValue({ JobId: 'j1' });
    await request(app.getHttpServer()).post('/jobs/example').send({ Message: 'hi' }).expect(201);
    expect(enqueueExecute).toHaveBeenCalledWith({ Message: 'hi' });
  });
});
