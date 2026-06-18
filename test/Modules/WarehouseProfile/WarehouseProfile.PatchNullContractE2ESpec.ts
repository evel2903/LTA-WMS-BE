import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { LoggingService } from '@common/Logging/LoggingService';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { GetWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetWarehouseProfileUseCase';
import { ListWarehouseProfilesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfilesUseCase';
import { UpdateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/UpdateWarehouseProfileUseCase';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { WarehouseProfileController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileController';
import {
  InMemoryWarehouseProfileRepository,
  MasterDataReferenceStub,
} from '@modules/WarehouseProfile/Test/WarehouseProfileTestDoubles';

/**
 * Proves the documented PATCH OMIT/null contract is reachable over the real HTTP boundary
 * (ValidationPipe -> use case -> GlobalExceptionFilter), not just in isolated unit tests:
 *  - null for a business-required field reaches the use case and surfaces BUSINESS_RULE (400).
 *  - null for a scope axis reaches the use case and clears that axis.
 */
describe('E2E WarehouseProfile PATCH null contract (real use cases, no DB)', () => {
  let app: INestApplication;
  let profiles: InMemoryWarehouseProfileRepository;
  let refs: MasterDataReferenceStub;

  beforeAll(async () => {
    profiles = new InMemoryWarehouseProfileRepository();
    refs = new MasterDataReferenceStub();
    refs.AddWarehouse('warehouse-1', MasterDataStatus.Active);

    const createUseCase = new CreateWarehouseProfileUseCase(
      profiles,
      refs.Warehouses,
      refs.Zones,
      refs.Owners,
      refs.Skus,
      new ScopeKeyService(),
      new WarehouseProfilePolicyValidator(),
    );
    const updateUseCase = new UpdateWarehouseProfileUseCase(
      profiles,
      refs.Warehouses,
      refs.Zones,
      refs.Owners,
      refs.Skus,
      new ScopeKeyService(),
      new WarehouseProfilePolicyValidator(),
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [WarehouseProfileController],
      providers: [
        { provide: CreateWarehouseProfileUseCase, useValue: createUseCase },
        { provide: GetWarehouseProfileUseCase, useValue: new GetWarehouseProfileUseCase(profiles) },
        { provide: ListWarehouseProfilesUseCase, useValue: new ListWarehouseProfilesUseCase(profiles) },
        { provide: UpdateWarehouseProfileUseCase, useValue: updateUseCase },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter({ LogError: jest.fn() } as unknown as LoggingService));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const CreateDraft = async (profileCode: string) => {
    const response = await request(app.getHttpServer())
      .post('/warehouse-profiles')
      .send({
        ProfileCode: profileCode,
        ProfileName: 'Draft',
        WarehouseTypeCode: 'TIER_1',
        EffectiveFrom: '2026-01-01',
        WarehouseId: 'warehouse-1',
      })
      .expect(201);
    return response.body.Data.Id as string;
  };

  it('PATCH null on a business-required field surfaces BUSINESS_RULE (400) from the use case', async () => {
    const id = await CreateDraft('WP-NULL-REQ');

    const response = await request(app.getHttpServer())
      .patch(`/warehouse-profiles/${id}`)
      .send({ ProfileName: null })
      .expect(400);

    expect(response.body.Success).toBe(false);
    expect(response.body.Errors[0].Code).toBe('BUSINESS_RULE');
  });

  it('PATCH null on WarehouseTypeCode surfaces BUSINESS_RULE (400), not a class-validator VALIDATION error', async () => {
    const id = await CreateDraft('WP-NULL-TYPE');

    const response = await request(app.getHttpServer())
      .patch(`/warehouse-profiles/${id}`)
      .send({ WarehouseTypeCode: null })
      .expect(400);

    expect(response.body.Errors[0].Code).toBe('BUSINESS_RULE');
  });

  it('PATCH null on EffectiveFrom (business-required) surfaces BUSINESS_RULE (400)', async () => {
    const id = await CreateDraft('WP-NULL-EFF');

    const response = await request(app.getHttpServer())
      .patch(`/warehouse-profiles/${id}`)
      .send({ EffectiveFrom: null })
      .expect(400);

    expect(response.body.Errors[0].Code).toBe('BUSINESS_RULE');
  });

  it('PATCH null on a scope axis clears that axis through the use case', async () => {
    const id = await CreateDraft('WP-NULL-SCOPE');

    const response = await request(app.getHttpServer())
      .patch(`/warehouse-profiles/${id}`)
      .send({ WarehouseId: null })
      .expect(200);

    expect(response.body.Success).toBe(true);
    expect(response.body.Data.WarehouseId).toBeNull();
  });
});
