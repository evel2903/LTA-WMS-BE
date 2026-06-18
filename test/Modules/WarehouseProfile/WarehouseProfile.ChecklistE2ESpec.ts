import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { LoggingService } from '@common/Logging/LoggingService';
import { VerifyWarehouseProfileChecklistUseCase } from '@modules/WarehouseProfile/Application/UseCases/VerifyWarehouseProfileChecklistUseCase';
import { WarehouseProfileChecklistService } from '@modules/WarehouseProfile/Application/Services/WarehouseProfileChecklistService';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { RuleResolver } from '@modules/WarehouseProfile/Application/Services/RuleResolver';
import { ConditionEvaluator } from '@modules/WarehouseProfile/Domain/Services/ConditionEvaluator';
import { ProfileChecklistItemStatus } from '@modules/WarehouseProfile/Domain/Enums/ProfileChecklistItemStatus';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RuleGroupCatalogState } from '@modules/WarehouseProfile/Domain/Enums/RuleGroupCatalogState';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleGroupEntity } from '@modules/WarehouseProfile/Domain/Entities/RuleGroupEntity';
import { WarehouseProfileChecklistController } from '@modules/WarehouseProfile/Presentation/Controllers/WarehouseProfileChecklistController';
import { InMemoryWarehouseProfileRepository } from '@modules/WarehouseProfile/Test/WarehouseProfileTestDoubles';
import {
  InMemoryRuleDefinitionRepository,
  InMemoryRuleGroupRepository,
  InMemoryWarehouseProfileRuleRepository,
} from '@modules/WarehouseProfile/Test/RuleTestDoubles';
import {
  BuildBinding,
  BuildProfile,
  BuildRule,
  At,
} from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

/**
 * B7 AC1/AC5: the read-only checklist endpoint over the real HTTP boundary
 * (controller -> use case -> ResponseInterceptor / GlobalExceptionFilter). No DB.
 */
describe('E2E WarehouseProfile checklist (real controller + use case, no DB)', () => {
  let app: INestApplication;
  let profiles: InMemoryWarehouseProfileRepository;
  let activeProfileId: string;

  beforeAll(async () => {
    profiles = new InMemoryWarehouseProfileRepository();
    const groups = new InMemoryRuleGroupRepository();
    const definitions = new InMemoryRuleDefinitionRepository();
    const bindings = new InMemoryWarehouseProfileRuleRepository();

    await groups.Create(
      new RuleGroupEntity({
        Id: 'group-active',
        GroupCode: 'R-COM',
        GroupName: 'Compliance',
        CatalogState: RuleGroupCatalogState.Active,
        CreatedAt: At,
        UpdatedAt: At,
      }),
    );
    const profile = BuildProfile({ WarehouseTypeCode: 'TIER_1' });
    activeProfileId = profile.Id;
    await profiles.Create(profile);
    const rule = BuildRule({
      RuleCode: 'OP-OK',
      RuleGroupId: 'group-active',
      PrecedenceTier: RulePrecedenceTier.Operation,
      ControlMode: RuleControlMode.SoftWarning,
      WarehouseTypeCode: 'TIER_1',
    });
    await definitions.Create(rule);
    await bindings.Create(BuildBinding(profile.Id, rule.Id));

    const resolver = new RuleResolver(profiles, definitions, bindings, groups, new ConditionEvaluator());
    const preview = new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());
    const service = new WarehouseProfileChecklistService(profiles, groups, definitions, bindings, preview);
    const useCase = new VerifyWarehouseProfileChecklistUseCase(profiles, resolver, service);

    const moduleRef = await Test.createTestingModule({
      controllers: [WarehouseProfileChecklistController],
      providers: [{ provide: VerifyWarehouseProfileChecklistUseCase, useValue: useCase }],
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

  it('AC1/AC5: GET :id/checklist returns a success envelope with an Items array', async () => {
    const response = await request(app.getHttpServer())
      .get(`/warehouse-profiles/${activeProfileId}/checklist`)
      .expect(200);

    expect(response.body.Success).toBe(true);
    expect(response.body.Data.ProfileId).toBe(activeProfileId);
    expect(response.body.Data.OverallStatus).toBe(ProfileChecklistItemStatus.Pass);
    expect(Array.isArray(response.body.Data.Items)).toBe(true);
    expect(response.body.Data.Items.length).toBeGreaterThan(0);
  });

  it('AC1: GET checklist for a missing profile -> 404 NOT_FOUND envelope', async () => {
    const response = await request(app.getHttpServer()).get('/warehouse-profiles/does-not-exist/checklist').expect(404);

    expect(response.body.Success).toBe(false);
    expect(response.body.Errors[0].Code).toBe('NOT_FOUND');
  });

  it('AC1: the checklist route is read-only (no POST mutation)', async () => {
    await request(app.getHttpServer()).post(`/warehouse-profiles/${activeProfileId}/checklist`).send({}).expect(404);
  });
});
