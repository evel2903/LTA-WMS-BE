import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { HealthController } from '../../../src/Modules/Health/Presentation/Controllers/HealthController';
import { GetLiveUseCase } from '../../../src/Modules/Health/Application/UseCases/GetLiveUseCase';
import { GetReadyUseCase } from '../../../src/Modules/Health/Application/UseCases/GetReadyUseCase';

describe('E2E HealthController (no DB)', () => {
  let app: INestApplication;
  const liveExecute = jest.fn();
  const readyExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: GetLiveUseCase, useValue: { Execute: liveExecute } },
        { provide: GetReadyUseCase, useValue: { Execute: readyExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    liveExecute.mockReset();
    readyExecute.mockReset();
  });

  it('GET /health/live calls use case', async () => {
    liveExecute.mockResolvedValue({ Status: 'OK' });
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect(({ body }) => expect(body.Status).toBe('OK'));
    expect(liveExecute).toHaveBeenCalledTimes(1);
  });

  it('GET /health/ready calls use case', async () => {
    readyExecute.mockResolvedValue({ Status: 'ok', Info: {}, Error: {}, Details: {} });
    await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect(readyExecute).toHaveBeenCalledTimes(1);
  });
});
