import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { SiteController } from '@modules/MasterData/Presentation/Controllers/SiteController';
import { CreateSiteUseCase } from '@modules/MasterData/Application/UseCases/CreateSiteUseCase';
import { GetSiteByIdUseCase } from '@modules/MasterData/Application/UseCases/GetSiteByIdUseCase';
import { ListSitesUseCase } from '@modules/MasterData/Application/UseCases/ListSitesUseCase';
import { UpdateSiteUseCase } from '@modules/MasterData/Application/UseCases/UpdateSiteUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

describe('E2E SiteController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getByIdExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [SiteController],
        providers: [
          { provide: CreateSiteUseCase, useValue: { Execute: createExecute } },
          { provide: GetSiteByIdUseCase, useValue: { Execute: getByIdExecute } },
          { provide: ListSitesUseCase, useValue: { Execute: listExecute } },
          { provide: UpdateSiteUseCase, useValue: { Execute: updateExecute } },
        ],
      }),
    ).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    createExecute.mockReset();
    getByIdExecute.mockReset();
    listExecute.mockReset();
    updateExecute.mockReset();
  });

  it('POST /sites rejects invalid body and non-whitelisted fields', async () => {
    await request(app.getHttpServer()).post('/sites').send({ SiteCode: 'SITE-HCM', UnknownField: true }).expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /sites calls use case and preserves response envelope', async () => {
    createExecute.mockResolvedValue({
      Id: 'site-1',
      SiteCode: 'SITE-HCM',
      SiteName: 'Ho Chi Minh Site',
      Status: MasterDataStatus.Active,
      SourceSystem: null,
      ReferenceId: null,
      CreatedAt: '2026-01-01T00:00:00.000Z',
      UpdatedAt: '2026-01-01T00:00:00.000Z',
      CreatedBy: null,
      UpdatedBy: null,
    });

    const response = await request(app.getHttpServer())
      .post('/sites')
      .send({ SiteCode: 'SITE-HCM', SiteName: 'Ho Chi Minh Site', Status: MasterDataStatus.Active })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith(
      {
        SiteCode: 'SITE-HCM',
        SiteName: 'Ho Chi Minh Site',
        Status: MasterDataStatus.Active,
      },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(response.body.Success).toBe(true);
    expect(response.body.Data.SiteCode).toBe('SITE-HCM');
  });

  it('GET /sites rejects invalid query and calls list use case for valid query', async () => {
    await request(app.getHttpServer()).get('/sites?Page=0').expect(400);

    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 20, TotalItems: 0, TotalPages: 1 } });
    await request(app.getHttpServer()).get('/sites?Page=1&PageSize=20&Status=Active&SiteCode=SITE').expect(200);

    expect(listExecute).toHaveBeenCalledWith({
      Page: 1,
      PageSize: 20,
      Status: MasterDataStatus.Active,
      SiteCode: 'SITE',
    });
  });

  it('GET /sites/:id and PATCH /sites/:id call use cases', async () => {
    getByIdExecute.mockResolvedValue({ Id: 'site-1' });
    updateExecute.mockResolvedValue({ Id: 'site-1', SiteName: 'Updated' });

    await request(app.getHttpServer()).get('/sites/site-1').expect(200);
    await request(app.getHttpServer()).patch('/sites/site-1').send({ SiteName: 'Updated' }).expect(200);

    expect(getByIdExecute).toHaveBeenCalledWith('site-1');
    expect(updateExecute).toHaveBeenCalledWith(
      { Id: 'site-1', SiteName: 'Updated' },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });

  it('PATCH /sites/:id rejects empty required fields when provided', async () => {
    await request(app.getHttpServer()).patch('/sites/site-1').send({ SiteName: '' }).expect(400);

    expect(updateExecute).not.toHaveBeenCalled();
  });
});
