import { ForbiddenException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { CreatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/CreatePartnerUseCase';
import { DeactivatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/DeactivatePartnerUseCase';
import { GetPartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/GetPartnerUseCase';
import { ListPartnersUseCase } from '@modules/PartnerMaster/Application/UseCases/ListPartnersUseCase';
import { ResolvePartnerByReferenceUseCase } from '@modules/PartnerMaster/Application/UseCases/ResolvePartnerByReferenceUseCase';
import { UpdatePartnerUseCase } from '@modules/PartnerMaster/Application/UseCases/UpdatePartnerUseCase';
import { PartnerType } from '@modules/PartnerMaster/Domain/Enums/PartnerType';
import { PartnerController } from '@modules/PartnerMaster/Presentation/Controllers/PartnerController';

describe('E2E PartnerController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const resolveExecute = jest.fn();
  const updateExecute = jest.fn();
  const deactivateExecute = jest.fn();

  const buildModule = () =>
    Test.createTestingModule({
      controllers: [PartnerController],
      providers: [
        { provide: CreatePartnerUseCase, useValue: { Execute: createExecute } },
        { provide: GetPartnerUseCase, useValue: { Execute: getExecute } },
        { provide: ListPartnersUseCase, useValue: { Execute: listExecute } },
        { provide: ResolvePartnerByReferenceUseCase, useValue: { Execute: resolveExecute } },
        { provide: UpdatePartnerUseCase, useValue: { Execute: updateExecute } },
        { provide: DeactivatePartnerUseCase, useValue: { Execute: deactivateExecute } },
      ],
    });

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(buildModule()).compile();
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
    resolveExecute.mockReset();
    updateExecute.mockReset();
    deactivateExecute.mockReset();
  });

  it('POST /partners validates partner type, required external reference and non-whitelisted fields', async () => {
    await request(app.getHttpServer())
      .post('/partners')
      .send({ PartnerCode: 'SUP-A', PartnerType: 'Vendor', Unknown: true })
      .expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /partners calls use case and preserves envelope', async () => {
    createExecute.mockResolvedValue({ Id: 'partner-1', PartnerCode: 'SUP-A' });

    const response = await request(app.getHttpServer())
      .post('/partners')
      .send({
        PartnerCode: 'SUP-A',
        PartnerName: 'Supplier A',
        PartnerType: PartnerType.Supplier,
        SourceSystem: 'ERP',
        ExternalReference: 'ERP-SUP-A',
        ReferenceText: 'PO supplier',
      })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith(
      {
        PartnerCode: 'SUP-A',
        PartnerName: 'Supplier A',
        PartnerType: PartnerType.Supplier,
        SourceSystem: 'ERP',
        ExternalReference: 'ERP-SUP-A',
        ReferenceText: 'PO supplier',
      },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(response.body.Success).toBe(true);
    expect(response.body.Data.PartnerCode).toBe('SUP-A');
  });

  it('GET /partners accepts PageSize above 100 and forwards filters for use-case clamp', async () => {
    listExecute.mockResolvedValue({ Items: [], Meta: { Page: 1, PageSize: 100, TotalItems: 0, TotalPages: 1 } });

    await request(app.getHttpServer())
      .get(
        '/partners?Page=1&PageSize=500&PartnerType=Supplier&Status=Active&PartnerCode=SUP&PartnerName=Supplier&SourceSystem=ERP&ExternalReference=ERP-SUP-A',
      )
      .expect(200);

    expect(listExecute).toHaveBeenCalledWith({
      Page: 1,
      PageSize: 500,
      PartnerType: PartnerType.Supplier,
      Status: 'Active',
      PartnerCode: 'SUP',
      PartnerName: 'Supplier',
      SourceSystem: 'ERP',
      ExternalReference: 'ERP-SUP-A',
    });
  });

  it('GET /partners/resolve and PATCH endpoints call use cases', async () => {
    resolveExecute.mockResolvedValue({ Id: 'partner-1' });
    updateExecute.mockResolvedValue({ Id: 'partner-1', PartnerName: 'Updated' });
    deactivateExecute.mockResolvedValue({ Id: 'partner-1', Status: 'Inactive' });

    await request(app.getHttpServer())
      .get('/partners/resolve?PartnerType=Supplier&SourceSystem=ERP&ExternalReference=ERP-SUP-A')
      .expect(200);
    await request(app.getHttpServer()).patch('/partners/partner-1').send({ PartnerName: 'Updated' }).expect(200);
    await request(app.getHttpServer())
      .patch('/partners/partner-1/deactivate')
      .send({ ReasonCode: 'RC-V1-CANCEL' })
      .expect(200);

    expect(resolveExecute).toHaveBeenCalledWith({
      PartnerType: PartnerType.Supplier,
      SourceSystem: 'ERP',
      ExternalReference: 'ERP-SUP-A',
    });
    expect(updateExecute).toHaveBeenCalledWith(
      { Id: 'partner-1', PartnerName: 'Updated' },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
    expect(deactivateExecute).toHaveBeenCalledWith(
      { Id: 'partner-1', ReasonCode: 'RC-V1-CANCEL' },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });

  it('PATCH /partners/:id/deactivate rejects missing reason code', async () => {
    await request(app.getHttpServer()).patch('/partners/partner-1/deactivate').send({}).expect(400);
    expect(deactivateExecute).not.toHaveBeenCalled();
  });

  it('denies mutation before use case when permission guard rejects', async () => {
    const moduleRef = await overrideAccessGuards(buildModule())
      .overrideGuard(PermissionGuard)
      .useValue({
        canActivate: () => {
          throw new ForbiddenException('denied');
        },
      })
      .compile();
    const deniedApp = moduleRef.createNestApplication();
    deniedApp.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await deniedApp.init();

    await request(deniedApp.getHttpServer()).patch('/partners/partner-1').send({ PartnerName: 'Updated' }).expect(403);

    expect(updateExecute).not.toHaveBeenCalled();
    await deniedApp.close();
  });
});
