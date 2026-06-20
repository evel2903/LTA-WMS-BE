import { BusinessRuleException } from '@common/Exceptions/AppException';
import { CatalogImplementationStatus } from '@modules/AccessControl/Domain/Enums/CatalogImplementationStatus';
import { ControlExceptionCategory } from '@modules/AccessControl/Domain/Enums/ControlExceptionCategory';
import { ControlExceptionAction } from '@modules/AccessControl/Domain/Enums/ControlExceptionAction';
import { ControlExceptionDefaultState } from '@modules/AccessControl/Domain/Enums/ControlExceptionDefaultState';
import { ControlExceptionSeverity } from '@modules/AccessControl/Domain/Enums/ControlExceptionSeverity';
import {
  ControlExceptionCatalogEntries,
  SeedControlExceptionCatalog,
} from '@modules/AccessControl/Application/Services/ControlExceptionCatalogSeed';
import {
  ValidationRuleCatalogEntries,
  SeedValidationRuleCatalog,
} from '@modules/AccessControl/Application/Services/ValidationRuleCatalogSeed';
import { ControlExceptionCatalog } from '@modules/AccessControl/Application/Services/ControlExceptionCatalog';
import {
  InMemoryControlExceptionCatalogRepository,
  InMemoryValidationRuleCatalogRepository,
} from '@modules/AccessControl/Test/AccessControlTestDoubles';

const REQUIRED_EX_CODES = ['CTRL-EX-01', 'CTRL-EX-02', 'CTRL-EX-03', 'CTRL-EX-04', 'CTRL-EX-05', 'CTRL-EX-08'];
const DEFERRED_V1PLUS_EX_CODES = ['CTRL-EX-06', 'CTRL-EX-07', 'CTRL-EX-09'];
const ALL_EX_CODES = [...REQUIRED_EX_CODES, ...DEFERRED_V1PLUS_EX_CODES];
const ALL_VAL_CODES = Array.from({ length: 10 }, (_, i) => `RBAC-VAL-${String(i + 1).padStart(2, '0')}`);

describe('SeedControlExceptionCatalog (C8 AC2 / AC4)', () => {
  it('seeds exactly the 9 CTRL-EX rows with the doc-09 fields', async () => {
    const repo = new InMemoryControlExceptionCatalogRepository();
    await SeedControlExceptionCatalog(repo);

    const items = await repo.List();
    expect(items).toHaveLength(9);
    expect(items.map((i) => i.Code).sort()).toEqual([...ALL_EX_CODES].sort());

    // Spot-check enum-typed fields land verbatim from doc 09.
    const ex01 = await repo.FindByCode('CTRL-EX-01');
    expect(ex01).not.toBeNull();
    expect(ex01!.Category).toBe(ControlExceptionCategory.AuthorizationDenied);
    expect(ex01!.Severity).toBe(ControlExceptionSeverity.High);
    expect(ex01!.DefaultState).toBe(ControlExceptionDefaultState.Blocked);
    expect(ex01!.ActionAllowed).toBe(ControlExceptionAction.Block);
    expect(ex01!.OwnerRoles).toEqual(['WMS_ADMIN']);
    expect(ex01!.ImplementationStatus).toBe(CatalogImplementationStatus.Implemented);

    // EX-04 = exception-closure rule (reason + evidence required), owned by C9.
    const ex04 = await repo.FindByCode('CTRL-EX-04');
    expect(ex04!.ReasonRequired).toBe(true);
    expect(ex04!.EvidenceRequired).toBe(true);
    expect(ex04!.ImplementationStatus).toBe(CatalogImplementationStatus.DeferredToC9);

    // EX-09 = manual data fix (reason + evidence + approval), deferred V1+.
    const ex09 = await repo.FindByCode('CTRL-EX-09');
    expect(ex09!.ApprovalRequired).toBe(true);
    expect(ex09!.ActionAllowed).toBe(ControlExceptionAction.RequireSpecialApproval);
    expect(ex09!.ImplementationStatus).toBe(CatalogImplementationStatus.DeferredV1Plus);
  });

  it('is idempotent (re-run keeps exactly 9 rows, no duplicates)', async () => {
    const repo = new InMemoryControlExceptionCatalogRepository();
    await SeedControlExceptionCatalog(repo);
    await SeedControlExceptionCatalog(repo);
    const items = await repo.List();
    expect(items).toHaveLength(9);
    expect(new Set(items.map((i) => i.Code)).size).toBe(9);
  });

  it('AC4: every required CTRL-EX item is present with all mandatory fields populated', async () => {
    const repo = new InMemoryControlExceptionCatalogRepository();
    await SeedControlExceptionCatalog(repo);

    for (const code of REQUIRED_EX_CODES) {
      const entry = await repo.FindByCode(code);
      expect(entry).not.toBeNull();
      expect(entry!.IsRequiredForV0()).toBe(true);
      expect(entry!.Scenario.length).toBeGreaterThan(0);
      expect(entry!.Category).toBeTruthy();
      expect(entry!.Severity).toBeTruthy();
      expect(entry!.DefaultState).toBeTruthy();
      expect(entry!.ActionAllowed).toBeTruthy();
      expect(entry!.OwnerRoles.length).toBeGreaterThan(0);
      expect(entry!.SourceDocRef).toBeTruthy();
    }
  });

  it('AC4: deferred-V1+ CTRL-EX items are flagged and not counted as required', async () => {
    const repo = new InMemoryControlExceptionCatalogRepository();
    await SeedControlExceptionCatalog(repo);
    for (const code of DEFERRED_V1PLUS_EX_CODES) {
      const entry = await repo.FindByCode(code);
      expect(entry!.IsDeferredV1Plus()).toBe(true);
      expect(entry!.IsRequiredForV0()).toBe(false);
    }
  });

  it('AC4: catalog entries constant exposes exactly 9 rows with unique codes', () => {
    expect(ControlExceptionCatalogEntries).toHaveLength(9);
    expect(new Set(ControlExceptionCatalogEntries.map((e) => e.Code)).size).toBe(9);
  });
});

describe('SeedValidationRuleCatalog (C8 AC1 / AC4)', () => {
  it('seeds exactly the 10 RBAC-VAL rows with the doc-09 fields', async () => {
    const repo = new InMemoryValidationRuleCatalogRepository();
    await SeedValidationRuleCatalog(repo);

    const items = await repo.List();
    expect(items).toHaveLength(10);
    expect(items.map((i) => i.Code).sort()).toEqual([...ALL_VAL_CODES].sort());

    const val01 = await repo.FindByCode('RBAC-VAL-01');
    expect(val01!.OwnerModule).toBe('C2');
    expect(val01!.ControlExceptionCode).toBe('CTRL-EX-01');
    expect(val01!.ImplementationStatus).toBe(CatalogImplementationStatus.Implemented);

    // VAL-04/05 are exception-closure rules owned by C9.
    const val04 = await repo.FindByCode('RBAC-VAL-04');
    expect(val04!.ImplementationStatus).toBe(CatalogImplementationStatus.DeferredToC9);
    expect(val04!.ControlExceptionCode).toBe('CTRL-EX-04');

    // VAL-08 audit-in-tx and VAL-10 override-log have no 1-1 control-exception (null).
    const val08 = await repo.FindByCode('RBAC-VAL-08');
    expect(val08!.ControlExceptionCode).toBeNull();
    const val10 = await repo.FindByCode('RBAC-VAL-10');
    expect(val10!.ControlExceptionCode).toBeNull();
  });

  it('is idempotent (re-run keeps exactly 10 rows, no duplicates)', async () => {
    const repo = new InMemoryValidationRuleCatalogRepository();
    await SeedValidationRuleCatalog(repo);
    await SeedValidationRuleCatalog(repo);
    const items = await repo.List();
    expect(items).toHaveLength(10);
    expect(new Set(items.map((i) => i.Code)).size).toBe(10);
  });

  it('AC4: all 10 RBAC-VAL items are present with all mandatory fields populated', async () => {
    const repo = new InMemoryValidationRuleCatalogRepository();
    await SeedValidationRuleCatalog(repo);

    for (const code of ALL_VAL_CODES) {
      const entry = await repo.FindByCode(code);
      expect(entry).not.toBeNull();
      expect(entry!.Description.length).toBeGreaterThan(0);
      expect(entry!.Trigger.length).toBeGreaterThan(0);
      expect(entry!.ExpectedResult.length).toBeGreaterThan(0);
      expect(entry!.OwnerModule.length).toBeGreaterThan(0);
      expect(entry!.SourceDocRef).toBeTruthy();
      // Every RBAC-VAL is required for V0 (Implemented or DeferredToC9).
      expect(entry!.IsRequiredForV0()).toBe(true);
    }
  });

  it('AC4: catalog entries constant exposes exactly 10 rows with unique codes', () => {
    expect(ValidationRuleCatalogEntries).toHaveLength(10);
    expect(new Set(ValidationRuleCatalogEntries.map((e) => e.Code)).size).toBe(10);
  });

  it('AC1+AC2 link: every non-null VAL.ControlExceptionCode points at a seeded CTRL-EX', async () => {
    const exRepo = new InMemoryControlExceptionCatalogRepository();
    const valRepo = new InMemoryValidationRuleCatalogRepository();
    await SeedControlExceptionCatalog(exRepo);
    await SeedValidationRuleCatalog(valRepo);

    for (const val of await valRepo.List()) {
      if (val.ControlExceptionCode === null) continue;
      const ex = await exRepo.FindByCode(val.ControlExceptionCode);
      expect(ex).not.toBeNull();
      // A required (Implemented/DeferredToC9) validation rule must NOT link to a DeferredV1Plus
      // control exception — that rule claims V0 enforcement against a type V0 refuses to raise.
      if (val.IsRequiredForV0()) {
        expect(ex!.IsDeferredV1Plus()).toBe(false);
      }
    }
  });
});

describe('ControlExceptionCatalog.ValidateExceptionType (C8 AC5 — C9 contract)', () => {
  const buildCatalog = async () => {
    const repo = new InMemoryControlExceptionCatalogRepository();
    await SeedControlExceptionCatalog(repo);
    return new ControlExceptionCatalog(repo);
  };

  it('returns the entry for a valid (Implemented) code', async () => {
    const catalog = await buildCatalog();
    const entry = await catalog.ValidateExceptionType('CTRL-EX-01');
    expect(entry.Code).toBe('CTRL-EX-01');
    expect(entry.Category).toBe(ControlExceptionCategory.AuthorizationDenied);
  });

  it('returns the entry for a DeferredToC9 code (C9 reads reason/evidence requirements)', async () => {
    const catalog = await buildCatalog();
    const entry = await catalog.ValidateExceptionType('CTRL-EX-04');
    expect(entry.ReasonRequired).toBe(true);
    expect(entry.EvidenceRequired).toBe(true);
  });

  it('throws BusinessRuleException for an unknown code', async () => {
    const catalog = await buildCatalog();
    await expect(catalog.ValidateExceptionType('CTRL-EX-NOPE')).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('throws BusinessRuleException for a DeferredV1Plus code (not raisable in V0)', async () => {
    const catalog = await buildCatalog();
    await expect(catalog.ValidateExceptionType('CTRL-EX-06')).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(catalog.ValidateExceptionType('CTRL-EX-09')).rejects.toBeInstanceOf(BusinessRuleException);
  });

  it('FindByCode returns null for unknown, the entry otherwise (no throw)', async () => {
    const catalog = await buildCatalog();
    expect(await catalog.FindByCode('CTRL-EX-NOPE')).toBeNull();
    expect((await catalog.FindByCode('CTRL-EX-06'))!.Code).toBe('CTRL-EX-06');
    expect(await catalog.List()).toHaveLength(9);
  });
});
