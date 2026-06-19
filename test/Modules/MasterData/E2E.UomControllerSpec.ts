import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { CreateUomUseCase } from '@modules/MasterData/Application/UseCases/CreateUomUseCase';
import { GetUomUseCase } from '@modules/MasterData/Application/UseCases/GetUomUseCase';
import { ListUomsUseCase } from '@modules/MasterData/Application/UseCases/ListUomsUseCase';
import { UpdateUomUseCase } from '@modules/MasterData/Application/UseCases/UpdateUomUseCase';
import { UomController } from '@modules/MasterData/Presentation/Controllers/UomController';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

describe('E2E UomController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [UomController],
        providers: [
          { provide: CreateUomUseCase, useValue: { Execute: createExecute } },
          { provide: GetUomUseCase, useValue: { Execute: getExecute } },
          { provide: ListUomsUseCase, useValue: { Execute: listExecute } },
          { provide: UpdateUomUseCase, useValue: { Execute: updateExecute } },
        ],
      }),
    ).compile();

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

  it('POST /uoms rejects missing fields and invalid DecimalPrecision', async () => {
    await request(app.getHttpServer())
      .post('/uoms')
      .send({ UomCode: 'EA', UomName: 'Each', Status: MasterDataStatus.Active, DecimalPrecision: 7 })
      .expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /uoms calls use case and preserves envelope', async () => {
    createExecute.mockResolvedValue({ Id: 'uom-1', UomCode: 'EA' });

    const response = await request(app.getHttpServer())
      .post('/uoms')
      .send({
        UomCode: 'EA',
        UomName: 'Each',
        UomType: 'Quantity',
        DecimalPrecision: 0,
        Status: MasterDataStatus.Active,
      })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith({
      UomCode: 'EA',
      UomName: 'Each',
      UomType: 'Quantity',
      DecimalPrecision: 0,
      Status: MasterDataStatus.Active,
    });
    expect(response.body.Success).toBe(true);
  });

  it('GET /uoms validates pagination and forwards filters', async () => {
    await request(app.getHttpServer()).get('/uoms?PageSize=101').expect(400);

    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });
    await request(app.getHttpServer())
      .get('/uoms?Page=1&PageSize=20&Status=Active&UomCode=EA&UomName=Each&UomType=Quantity')
      .expect(200);

    expect(listExecute).toHaveBeenCalledWith({
      Page: 1,
      PageSize: 20,
      Status: MasterDataStatus.Active,
      UomCode: 'EA',
      UomName: 'Each',
      UomType: 'Quantity',
    });
  });

  it('GET /uoms/:id and PATCH /uoms/:id call use cases', async () => {
    getExecute.mockResolvedValue({ Id: 'uom-1' });
    updateExecute.mockResolvedValue({ Id: 'uom-1', UomName: 'Updated' });

    await request(app.getHttpServer()).get('/uoms/uom-1').expect(200);
    await request(app.getHttpServer()).patch('/uoms/uom-1').send({ UomName: 'Updated' }).expect(200);

    expect(getExecute).toHaveBeenCalledWith('uom-1');
    expect(updateExecute).toHaveBeenCalledWith({ Id: 'uom-1', UomName: 'Updated' });
  });

  it('PATCH /uoms/:id rejects empty required business fields', async () => {
    await request(app.getHttpServer()).patch('/uoms/uom-1').send({ UomCode: '' }).expect(400);
    await request(app.getHttpServer()).patch('/uoms/uom-1').send({ UomName: '' }).expect(400);
    await request(app.getHttpServer()).patch('/uoms/uom-1').send({ UomCode: null }).expect(400);
    await request(app.getHttpServer()).patch('/uoms/uom-1').send({ UomName: null }).expect(400);

    expect(updateExecute).not.toHaveBeenCalled();
  });
});
