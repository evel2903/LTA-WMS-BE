import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { LoggingService } from '@common/Logging/LoggingService';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { ActivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/ActivateWarehouseProfileUseCase';
import { DeactivateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/DeactivateWarehouseProfileUseCase';
import { CreateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileUseCase';
import { GetWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/GetWarehouseProfileUseCase';
import { ListWarehouseProfilesUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfilesUseCase';
import { UpdateWarehouseProfileUseCase } from '@modules/WarehouseProfile/Application/UseCases/UpdateWarehouseProfileUseCase';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { ProfileActivationGuard } from '@modules/WarehouseProfile/Application/Services/ProfileActivationGuard';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { ScopeKeyService } from '@modules/WarehouseProfile/Application/Services/ScopeKeyService';
import { WarehouseProfilePolicyValidator } from '@modules/WarehouseProfile/Application/Services/WarehouseProfilePolicyValidator';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';
import { WarehouseProfileController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileController';
import {
  InMemoryWarehouseProfileRepository,
  MasterDataReferenceStub,
} from '@modules/WarehouseProfile/Test/WarehouseProfileTestDoubles';
import { StubRuleResolver } from '@modules/WarehouseProfile/Test/RuleTestDoubles';
import { BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

/**
 * Drives the activate/deactivate endpoints over the real HTTP boundary
 * (ValidationPipe -> controller -> use case -> ResponseInterceptor / GlobalExceptionFilter).
 * The resolver is faked so the preview gate is deterministic without a DB.
 */
function CleanPreview(): PreviewRuleResolutionUseCase {
  const winner = BuildRule({
    RuleCode: 'OP-CLEAN',
    PrecedenceTier: RulePrecedenceTier.Operation,
    ControlMode: RuleControlMode.SoftWarning,
    WarehouseTypeCode: 'TIER_1',
  });
  const resolver = new StubRuleResolver({
    Winner: winner,
    Allowed: true,
    ApprovalRequired: false,
    OrderedCandidates: [winner],
    EffectivePriorities: { [winner.Id]: winner.Priority },
    ReasonReadiness: { RequiresReason: false, RequiresEvidence: false, AllowOverride: false },
  });
  return new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());
}

describe('E2E WarehouseProfile activation (real controller + use cases, faked resolver, no DB)', () => {
  let app: INestApplication;
  let profiles: IWarehouseProfileRepository;
  let refs: MasterDataReferenceStub;

  beforeAll(async () => {
    profiles = new InMemoryWarehouseProfileRepository();
    refs = new MasterDataReferenceStub();

    const createUseCase = new CreateWarehouseProfileUseCase(
      profiles,
      refs.Warehouses,
      refs.Zones,
      refs.Owners,
      refs.Skus,
      new ScopeKeyService(),
      new WarehouseProfilePolicyValidator(),
    );
    const guard = new ProfileActivationGuard(profiles, CleanPreview());
    const activateUseCase = new ActivateWarehouseProfileUseCase(profiles, new WarehouseProfilePolicyValidator(), guard);
    const deactivateUseCase = new DeactivateWarehouseProfileUseCase(profiles);

    const moduleRef = await Test.createTestingModule({
      controllers: [WarehouseProfileController],
      providers: [
        { provide: CreateWarehouseProfileUseCase, useValue: createUseCase },
        { provide: GetWarehouseProfileUseCase, useValue: new GetWarehouseProfileUseCase(profiles) },
        { provide: ListWarehouseProfilesUseCase, useValue: new ListWarehouseProfilesUseCase(profiles) },
        {
          provide: UpdateWarehouseProfileUseCase,
          useValue: new UpdateWarehouseProfileUseCase(
            profiles,
            refs.Warehouses,
            refs.Zones,
            refs.Owners,
            refs.Skus,
            new ScopeKeyService(),
            new WarehouseProfilePolicyValidator(),
          ),
        },
        { provide: ActivateWarehouseProfileUseCase, useValue: activateUseCase },
        { provide: DeactivateWarehouseProfileUseCase, useValue: deactivateUseCase },
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

  let counter = 0;
  const CreateDraft = async (warehouseId?: string) => {
    counter += 1;
    const response = await request(app.getHttpServer())
      .post('/warehouse-profiles')
      .send({
        ProfileCode: `WP-E2E-${counter}`,
        ProfileName: 'Draft',
        WarehouseTypeCode: 'TIER_1',
        EffectiveFrom: '2026-01-01',
        ...(warehouseId ? { WarehouseId: warehouseId } : {}),
      })
      .expect(201);
    return response.body.Data.Id as string;
  };

  it('AC1/AC4: POST :id/activate returns a success envelope with Status=ACTIVE and echoes actor/reason context', async () => {
    refs.AddWarehouse('wh-act-1', MasterDataStatus.Active);
    const id = await CreateDraft('wh-act-1');

    const response = await request(app.getHttpServer())
      .post(`/warehouse-profiles/${id}/activate`)
      .send({ ActorUserId: 'admin-1', ReasonCode: 'GO_LIVE', ReasonNote: 'launch' })
      .expect(201);

    expect(response.body.Success).toBe(true);
    expect(response.body.Data.Status).toBe(WarehouseProfileStatus.Active);
    expect(response.body.Data.AuditPolicy.LastActivation.ActorUserId).toBe('admin-1');
    expect(response.body.Data.AuditPolicy.LastActivation.ReasonCode).toBe('GO_LIVE');
  });

  it('AC1: activate a missing profile -> 404 NOT_FOUND envelope', async () => {
    const response = await request(app.getHttpServer())
      .post('/warehouse-profiles/does-not-exist/activate')
      .send({})
      .expect(404);

    expect(response.body.Success).toBe(false);
    expect(response.body.Errors[0].Code).toBe('NOT_FOUND');
  });

  it('AC1: activating an overlapping same-scope profile -> 409 CONFLICT envelope', async () => {
    refs.AddWarehouse('wh-ovl', MasterDataStatus.Active);
    const first = await CreateDraft('wh-ovl');
    await request(app.getHttpServer()).post(`/warehouse-profiles/${first}/activate`).send({}).expect(201);

    const second = await CreateDraft('wh-ovl');
    const response = await request(app.getHttpServer())
      .post(`/warehouse-profiles/${second}/activate`)
      .send({})
      .expect(409);

    expect(response.body.Success).toBe(false);
    expect(response.body.Errors[0].Code).toBe('CONFLICT');
  });

  it('AC1: re-activating an ACTIVE profile -> 400 BUSINESS_RULE envelope (invalid transition)', async () => {
    refs.AddWarehouse('wh-twice', MasterDataStatus.Active);
    const id = await CreateDraft('wh-twice');
    await request(app.getHttpServer()).post(`/warehouse-profiles/${id}/activate`).send({}).expect(201);

    const response = await request(app.getHttpServer()).post(`/warehouse-profiles/${id}/activate`).send({}).expect(400);

    expect(response.body.Success).toBe(false);
    expect(response.body.Errors[0].Code).toBe('BUSINESS_RULE');
  });

  it('AC1/AC4: POST :id/deactivate transitions ACTIVE -> RETIRED with a success envelope', async () => {
    refs.AddWarehouse('wh-deact', MasterDataStatus.Active);
    const id = await CreateDraft('wh-deact');
    await request(app.getHttpServer()).post(`/warehouse-profiles/${id}/activate`).send({}).expect(201);

    const response = await request(app.getHttpServer())
      .post(`/warehouse-profiles/${id}/deactivate`)
      .send({ ActorUserId: 'admin-2', ReasonCode: 'RETIRE' })
      .expect(201);

    expect(response.body.Success).toBe(true);
    expect(response.body.Data.Status).toBe(WarehouseProfileStatus.Retired);
    expect(response.body.Data.AuditPolicy.LastDeactivation.ActorUserId).toBe('admin-2');
  });

  it('AC1: deactivating a DRAFT profile -> 400 BUSINESS_RULE envelope', async () => {
    refs.AddWarehouse('wh-draft', MasterDataStatus.Active);
    const id = await CreateDraft('wh-draft');

    const response = await request(app.getHttpServer())
      .post(`/warehouse-profiles/${id}/deactivate`)
      .send({})
      .expect(400);

    expect(response.body.Success).toBe(false);
    expect(response.body.Errors[0].Code).toBe('BUSINESS_RULE');
  });
});
