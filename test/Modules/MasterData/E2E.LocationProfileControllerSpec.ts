import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { overrideAccessGuards } from '@test/Helpers/GuardOverrides';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { CreateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/CreateLocationProfileUseCase';
import { GetLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/GetLocationProfileUseCase';
import { ListLocationProfilesUseCase } from '@modules/MasterData/Application/UseCases/ListLocationProfilesUseCase';
import { UpdateLocationProfileUseCase } from '@modules/MasterData/Application/UseCases/UpdateLocationProfileUseCase';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { LocationProfileController } from '@modules/MasterData/Presentation/Controllers/LocationProfileController';

describe('E2E LocationProfileController (no DB)', () => {
  let app: INestApplication;

  const createExecute = jest.fn();
  const getExecute = jest.fn();
  const listExecute = jest.fn();
  const updateExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await overrideAccessGuards(
      Test.createTestingModule({
        controllers: [LocationProfileController],
        providers: [
          { provide: CreateLocationProfileUseCase, useValue: { Execute: createExecute } },
          { provide: GetLocationProfileUseCase, useValue: { Execute: getExecute } },
          { provide: ListLocationProfilesUseCase, useValue: { Execute: listExecute } },
          { provide: UpdateLocationProfileUseCase, useValue: { Execute: updateExecute } },
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
    getExecute.mockReset();
    listExecute.mockReset();
    updateExecute.mockReset();
  });

  it('POST /location-profiles rejects non-object policy fields', async () => {
    await request(app.getHttpServer())
      .post('/location-profiles')
      .send({
        ProfileCode: 'BIN-DRY',
        ProfileName: 'Dry Bin',
        LocationType: 'BIN',
        Status: MasterDataStatus.Active,
        CapacityPolicy: 'invalid',
      })
      .expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /location-profiles rejects an empty LocationType at request validation', async () => {
    await request(app.getHttpServer())
      .post('/location-profiles')
      .send({
        ProfileCode: 'BIN-DRY',
        ProfileName: 'Dry Bin',
        LocationType: '',
        Status: MasterDataStatus.Active,
      })
      .expect(400);

    expect(createExecute).not.toHaveBeenCalled();
  });

  it('POST /location-profiles calls use case on valid body', async () => {
    createExecute.mockResolvedValue({ Id: 'profile-1', ProfileCode: 'BIN-DRY' });

    await request(app.getHttpServer())
      .post('/location-profiles')
      .send({
        ProfileCode: 'BIN-DRY',
        ProfileName: 'Dry Bin',
        LocationType: 'BIN',
        Status: MasterDataStatus.Active,
        CapacityPolicy: { RequireCapacityQty: true },
        EligibilityPolicy: {},
        MixPolicy: {},
        CompliancePolicy: {},
        OperationPolicy: {},
      })
      .expect(201);

    expect(createExecute).toHaveBeenCalledWith(
      {
        ProfileCode: 'BIN-DRY',
        ProfileName: 'Dry Bin',
        LocationType: 'BIN',
        Status: MasterDataStatus.Active,
        CapacityPolicy: { RequireCapacityQty: true },
        EligibilityPolicy: {},
        MixPolicy: {},
        CompliancePolicy: {},
        OperationPolicy: {},
      },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });

  it('PATCH /location-profiles/:id rejects empty required business fields', async () => {
    await request(app.getHttpServer()).patch('/location-profiles/profile-1').send({ ProfileCode: '' }).expect(400);
    await request(app.getHttpServer()).patch('/location-profiles/profile-1').send({ ProfileName: '' }).expect(400);

    expect(updateExecute).not.toHaveBeenCalled();
  });

  it('PATCH /location-profiles/:id forwards the body + audit context to the update use case', async () => {
    updateExecute.mockResolvedValue({ Id: 'profile-1', ProfileName: 'Updated' });

    await request(app.getHttpServer())
      .patch('/location-profiles/profile-1')
      .send({ ProfileName: 'Updated' })
      .expect(200);

    expect(updateExecute).toHaveBeenCalledWith(
      { Id: 'profile-1', ProfileName: 'Updated' },
      expect.objectContaining({ ActorUserId: 'test-admin' }),
    );
  });
});
