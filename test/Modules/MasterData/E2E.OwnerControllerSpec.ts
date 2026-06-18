import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { CreateOwnerUseCase } from '@modules/MasterData/Application/UseCases/CreateOwnerUseCase';
import { GetOwnerUseCase } from '@modules/MasterData/Application/UseCases/GetOwnerUseCase';
import { ListOwnersUseCase } from '@modules/MasterData/Application/UseCases/ListOwnersUseCase';
import { UpdateOwnerUseCase } from '@modules/MasterData/Application/UseCases/UpdateOwnerUseCase';
import { OwnerController } from '@modules/MasterData/Presentation/Controllers/OwnerController';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

describe('E2E OwnerController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OwnerController],
      providers: [
        { provide: CreateOwnerUseCase, useValue: { Execute: createExecute } },
        { provide: GetOwnerUseCase, useValue: { Execute: getExecute } },
        { provide: ListOwnersUseCase, useValue: { Execute: listExecute } },
        { provide: UpdateOwnerUseCase, useValue: { Execute: updateExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createExecute.mockReset();
    getExecute.mockReset();
    listExecute.mockReset();
    updateExecute.mockReset();
  });

  it('POST /owners rejects missing required fields, bad policy type and non-whitelisted fields', async () => {
    await request(app.getHttpServer())
      .post('/owners')
      .send({ OwnerCode: 'OWNER-A', BillingPolicy: 'invalid', Unknown: true })
      .expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /owners calls use case and preserves envelope', async () => {
    createExecute.mockResolvedValue({ Id: 'owner-1', OwnerCode: 'OWNER-A' });

    const response = await request(app.getHttpServer())
      .post('/owners')
      .send({
        OwnerCode: 'OWNER-A',
        OwnerName: 'Owner A',
        Status: MasterDataStatus.Active,
        BillingPolicy: { BillingCycle: 'MONTHLY' },
        VisibilityScope: {},
      })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith({
      OwnerCode: 'OWNER-A',
      OwnerName: 'Owner A',
      Status: MasterDataStatus.Active,
      BillingPolicy: { BillingCycle: 'MONTHLY' },
      VisibilityScope: {},
    });
    expect(response.body.Success).toBe(true);
    expect(response.body.Data.OwnerCode).toBe('OWNER-A');
  });

  it('GET /owners validates pagination and forwards filters', async () => {
    await request(app.getHttpServer()).get('/owners?Page=0').expect(400);

    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });
    await request(app.getHttpServer())
      .get('/owners?Page=1&PageSize=20&Status=Active&OwnerCode=OWNER&OwnerName=Owner')
      .expect(200);

    expect(listExecute).toHaveBeenCalledWith({
      Page: 1,
      PageSize: 20,
      Status: MasterDataStatus.Active,
      OwnerCode: 'OWNER',
      OwnerName: 'Owner',
    });
  });

  it('GET /owners/:id and PATCH /owners/:id call use cases', async () => {
    getExecute.mockResolvedValue({ Id: 'owner-1' });
    updateExecute.mockResolvedValue({ Id: 'owner-1', OwnerName: 'Updated' });

    await request(app.getHttpServer()).get('/owners/owner-1').expect(200);
    await request(app.getHttpServer()).patch('/owners/owner-1').send({ OwnerName: 'Updated' }).expect(200);

    expect(getExecute).toHaveBeenCalledWith('owner-1');
    expect(updateExecute).toHaveBeenCalledWith({ Id: 'owner-1', OwnerName: 'Updated' });
  });

  it('PATCH /owners/:id rejects empty required business fields', async () => {
    await request(app.getHttpServer()).patch('/owners/owner-1').send({ OwnerCode: '' }).expect(400);
    await request(app.getHttpServer()).patch('/owners/owner-1').send({ OwnerName: '' }).expect(400);
    await request(app.getHttpServer()).patch('/owners/owner-1').send({ OwnerCode: null }).expect(400);
    await request(app.getHttpServer()).patch('/owners/owner-1').send({ OwnerName: null }).expect(400);

    expect(updateExecute).not.toHaveBeenCalled();
  });
});
