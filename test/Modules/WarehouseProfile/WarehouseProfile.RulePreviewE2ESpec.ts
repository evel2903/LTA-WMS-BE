import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { LoggingService } from '@common/Logging/LoggingService';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { RuleConflictDetector } from '@modules/WarehouseProfile/Application/Services/RuleConflictDetector';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { RuleControlMode } from '@modules/WarehouseProfile/Domain/Enums/RuleControlMode';
import { RulePrecedenceTier } from '@modules/WarehouseProfile/Domain/Enums/RulePrecedenceTier';
import { RuleDecision } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleDecision';
import { RuleEvaluationContext } from '@modules/WarehouseProfile/Domain/ValueObjects/RuleEvaluationContext';
import { RulePreviewController } from '@modules/WarehouseProfile/Presentation/Controllers/RulePreviewController';
import { BuildRule } from '@test/Modules/WarehouseProfile/WarehouseProfile.RuleResolverTestHelpers';

/**
 * Drives the preview endpoint over the real HTTP boundary
 * (ValidationPipe -> controller -> use case -> ResponseInterceptor / GlobalExceptionFilter).
 * The resolver is faked so the decision is deterministic without a DB.
 */
class StubRuleResolver implements IRuleResolver {
  public LastContext: RuleEvaluationContext | null = null;

  constructor(private readonly decision: RuleDecision) {}

  public async Resolve(context: RuleEvaluationContext): Promise<RuleDecision> {
    this.LastContext = context;
    return this.decision;
  }
}

// Context matches a Compliance hard block winner plus two divergent same-scope Owner/Contract rules.
const winner = BuildRule({
  RuleCode: 'COM-1',
  PrecedenceTier: RulePrecedenceTier.Compliance,
  ControlMode: RuleControlMode.HardBlock,
  WarehouseTypeCode: 'TIER_1',
  RequiresReason: true,
});
const ownerApproval = BuildRule({
  RuleCode: 'OWN-APPROVAL',
  PrecedenceTier: RulePrecedenceTier.OwnerContract,
  ControlMode: RuleControlMode.ApprovalRequired,
  WarehouseTypeCode: 'TIER_1',
  OwnerId: 'owner-1',
});
const ownerWarning = BuildRule({
  RuleCode: 'OWN-WARNING',
  PrecedenceTier: RulePrecedenceTier.OwnerContract,
  ControlMode: RuleControlMode.SoftWarning,
  WarehouseTypeCode: 'TIER_1',
  OwnerId: 'owner-1',
});

const decision: RuleDecision = {
  Winner: winner,
  Allowed: false,
  ApprovalRequired: false,
  OrderedCandidates: [winner, ownerApproval, ownerWarning],
  EffectivePriorities: {
    [winner.Id]: winner.Priority,
    [ownerApproval.Id]: ownerApproval.Priority,
    [ownerWarning.Id]: ownerWarning.Priority,
  },
  ReasonReadiness: { RequiresReason: true, RequiresEvidence: false, AllowOverride: false },
};

describe('E2E rule preview endpoint (real controller + use case, faked resolver, no DB)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const resolver = new StubRuleResolver(decision);
    const useCase = new PreviewRuleResolutionUseCase(resolver, new RuleConflictDetector());

    const moduleRef = await Test.createTestingModule({
      controllers: [RulePreviewController],
      providers: [{ provide: PreviewRuleResolutionUseCase, useValue: useCase }],
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

  it('AC1/AC2/AC3/AC4: POST /rules/preview returns a success envelope with winner/skipped/conflict/control mode', async () => {
    const response = await request(app.getHttpServer())
      .post('/rules/preview')
      .send({
        WarehouseTypeCode: 'TIER_1',
        OwnerId: 'owner-1',
        ActorUserId: 'user-1',
        ReasonCode: 'OVERRIDE_APPROVED',
        Attributes: { Weight: 5 },
      })
      .expect(201);

    expect(response.body.Success).toBe(true);
    const data = response.body.Data;

    // AC2: winner.
    expect(data.Winner.RuleCode).toBe('COM-1');
    expect(data.Winner.ControlMode).toBe('HARD_BLOCK');

    // AC4: hard block.
    expect(data.Allowed).toBe(false);
    expect(data.ControlMode.IsHardBlock).toBe(true);
    expect(data.ReasonReadiness.RequiresReason).toBe(true);
    expect(data.ActorContext.ActorUserId).toBe('user-1');
    expect(data.ActorContext.ReasonCode).toBe('OVERRIDE_APPROVED');

    // AC2: skipped.
    expect(data.SkippedRules.map((rule: { RuleCode: string }) => rule.RuleCode)).toEqual([
      'OWN-APPROVAL',
      'OWN-WARNING',
    ]);

    // AC3: conflict surfaced as data, not an error.
    expect(data.Conflicts).toHaveLength(1);
    expect(data.Conflicts[0].PrecedenceTier).toBe('OWNER_CONTRACT');
    expect(data.Conflicts[0].WinnerRuleCode).toBe('OWN-APPROVAL');
  });

  it('AC1/AC5: missing WarehouseTypeCode -> VALIDATION error envelope (400) at the ValidationPipe', async () => {
    // Over HTTP the request DTO's @IsString()/@IsNotEmpty() on WarehouseTypeCode means the global
    // ValidationPipe rejects FIRST with VALIDATION, before the use case's BusinessRuleException can
    // run. So the precise HTTP contract here is VALIDATION. The BUSINESS_RULE branch (the use case
    // guard) is proven at the use-case layer in PreviewRuleResolutionUseCaseSpec, where it is the
    // reachable path.
    const response = await request(app.getHttpServer()).post('/rules/preview').send({ OwnerId: 'owner-1' }).expect(400);

    expect(response.body.Success).toBe(false);
    expect(response.body.Errors[0].Code).toBe('VALIDATION');
  });

  it('AC1: rejects unknown fields via forbidNonWhitelisted (VALIDATION 400)', async () => {
    const response = await request(app.getHttpServer())
      .post('/rules/preview')
      .send({ WarehouseTypeCode: 'TIER_1', Bogus: 'x' })
      .expect(400);

    expect(response.body.Success).toBe(false);
    expect(response.body.Errors[0].Code).toBe('VALIDATION');
  });
});
