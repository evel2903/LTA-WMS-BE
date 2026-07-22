import {
  BusinessRuleException,
  CatalogMetadataRangeException,
  CatalogVersionUnavailableException,
  ConflictException,
} from '@common/Exceptions/AppException';
import { RoleCatalogTokenCodec } from '@modules/AccessControl/Infrastructure/Crypto/RoleCatalogTokenCodec';
import { ListRolesUseCase } from '@modules/AccessControl/Application/UseCases/ListRolesUseCase';
import type {
  IRoleCatalogRepository,
  RoleCatalogSnapshot,
} from '@modules/AccessControl/Application/Interfaces/IRoleCatalogRepository';
import type { IRoleCatalogTokenCodec } from '@modules/AccessControl/Application/Interfaces/IRoleCatalogTokenCodec';
import { InMemoryRoleRepository } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import {
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  StubAuditedTransaction,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';
import { CreateRoleUseCase } from '@modules/AccessControl/Application/UseCases/CreateRoleUseCase';
import { UpdateRoleUseCase } from '@modules/AccessControl/Application/UseCases/UpdateRoleUseCase';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { RoleCatalogAppConfig } from '@shared/Config/AppConfig';

const snapshot = (overrides: Partial<RoleCatalogSnapshot> = {}): RoleCatalogSnapshot => ({
  Version: '9007199254740993',
  Items: [],
  TotalItems: 0,
  ...overrides,
});

class FakeCatalogRepository implements IRoleCatalogRepository {
  public Current = snapshot();
  public Calls = 0;
  public Bumps = 0;
  private readonly seeded = new Set<string>();

  public async ReadPage(): Promise<RoleCatalogSnapshot> {
    this.Calls += 1;
    return this.Current;
  }

  public async Bump(): Promise<string> {
    this.Bumps += 1;
    return String(this.Bumps);
  }

  public async CreateIfAbsentAndBump(role: RoleEntity): Promise<boolean> {
    if (this.seeded.has(role.RoleCode)) return false;
    this.seeded.add(role.RoleCode);
    this.Bumps += 1;
    return true;
  }

  public async DeleteUnassigned(): Promise<null> {
    return null;
  }
}

describe('RH-05 role catalog proof', () => {
  it('signs canonical decimal-string payloads, verifies old keys, and rejects tamper/unknown kid', () => {
    const oldCodec = new RoleCatalogTokenCodec({ ActiveKid: 'old', Keys: { old: 'old-secret-32-bytes-aaaaaaaaaaaa' } });
    const payload = {
      v: 1 as const,
      kid: 'old',
      catalogVersion: '9007199254740993',
      pageSize: 100,
      order: 'ROLE_CODE_C_ASC' as const,
      nextPage: 2,
      totalItems: 101,
      totalPages: 2,
    };
    const token = oldCodec.Sign(payload);
    expect(token).toBe(
      'eyJ2IjoxLCJraWQiOiJvbGQiLCJjYXRhbG9nVmVyc2lvbiI6IjkwMDcxOTkyNTQ3NDA5OTMiLCJwYWdlU2l6ZSI6MTAwLCJvcmRlciI6IlJPTEVfQ09ERV9DX0FTQyIsIm5leHRQYWdlIjoyLCJ0b3RhbEl0ZW1zIjoxMDEsInRvdGFsUGFnZXMiOjJ9.e5XgqjY4ZCgUjOScZk6qLDtBAniFhnBXSwbzQ5Yw4TI',
    );
    const rotated = new RoleCatalogTokenCodec({
      ActiveKid: 'new',
      Keys: {
        old: 'old-secret-32-bytes-aaaaaaaaaaaa',
        new: 'new-secret-32-bytes-bbbbbbbbbbbb',
      },
    });

    expect(rotated.Verify(token)).toEqual(payload);
    expect(() => rotated.Verify(`${token.slice(0, -1)}x`)).toThrow();
    expect(() =>
      new RoleCatalogTokenCodec({ ActiveKid: 'new', Keys: { new: 'new-secret-32-bytes-bbbbbbbbbbbb' } }).Verify(token),
    ).toThrow();

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const [encodedPayload, signature] = token.split('.');
    const signatureIndex = alphabet.indexOf(signature.charAt(signature.length - 1));
    const nonCanonicalSignature = `${signature.slice(0, -1)}${alphabet[signatureIndex + 1]}`;
    expect(Buffer.from(nonCanonicalSignature, 'base64url')).toEqual(Buffer.from(signature, 'base64url'));
    expect(() => rotated.Verify(`${encodedPayload}.${nonCanonicalSignature}`)).toThrow();
    expect(() => rotated.Verify(`${token}${'A'.repeat(5000)}`)).toThrow();
    expect(
      new RoleCatalogTokenCodec({
        ActiveKid: 'v1',
        Keys: {
          v1: 'first-secret-32-bytes-aaaaaaaaaaaa',
          ' v1 ': 'second-secret-32-bytes-bbbbbbbbbbb',
        },
      }).IsAvailable(),
    ).toBe(false);
    expect(
      new RoleCatalogTokenCodec({
        ActiveKid: 'v1',
        Keys: { v1: 'catalog-secret-32-bytes-aaaaaaaaa' },
        Valid: false,
      }).IsAvailable(),
    ).toBe(false);
  });

  it('rejects duplicate key-ring kids and reuse of JWT or refresh secrets', () => {
    const before = {
      active: process.env.ROLE_CATALOG_SIGNING_ACTIVE_KID,
      keys: process.env.ROLE_CATALOG_SIGNING_KEYS,
      jwt: process.env.JWT_SECRET,
      refresh: process.env.JWT_REFRESH_SECRET,
    };
    try {
      process.env.ROLE_CATALOG_SIGNING_ACTIVE_KID = 'v1';
      process.env.JWT_SECRET = 'jwt-secret-32-bytes-aaaaaaaaaaaaa';
      process.env.JWT_REFRESH_SECRET = 'refresh-secret-32-bytes-bbbbbbbbb';

      process.env.ROLE_CATALOG_SIGNING_KEYS =
        '{"v1":"first-catalog-secret-32-bytes-aaaa","v1":"second-catalog-secret-32-bytes-bbb"}';
      expect(RoleCatalogAppConfig().Valid).toBe(false);

      process.env.ROLE_CATALOG_SIGNING_KEYS = JSON.stringify({ v1: process.env.JWT_SECRET });
      expect(RoleCatalogAppConfig().Valid).toBe(false);

      process.env.ROLE_CATALOG_SIGNING_KEYS = JSON.stringify({ v1: process.env.JWT_REFRESH_SECRET });
      expect(RoleCatalogAppConfig().Valid).toBe(false);
    } finally {
      const restore = (key: string, value: string | undefined) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      };
      restore('ROLE_CATALOG_SIGNING_ACTIVE_KID', before.active);
      restore('ROLE_CATALOG_SIGNING_KEYS', before.keys);
      restore('JWT_SECRET', before.jwt);
      restore('JWT_REFRESH_SECRET', before.refresh);
    }
  });

  it('returns a flat empty complete page while preserving the tokenless response contract', async () => {
    const roles = new InMemoryRoleRepository();
    const catalog = new FakeCatalogRepository();
    const codec = new RoleCatalogTokenCodec({ ActiveKid: 'k1', Keys: { k1: 'catalog-secret-32-bytes-aaaaaaaaa' } });
    const useCase = new ListRolesUseCase(roles, catalog, codec);

    await expect(useCase.Execute({ Page: 1, PageSize: 20 })).resolves.toMatchObject({ Meta: { PageSize: 20 } });
    await expect(useCase.Execute({ CompleteCatalog: true, Page: 1, PageSize: 100 })).resolves.toEqual({
      Items: [],
      Page: 1,
      PageSize: 100,
      TotalItems: 0,
      TotalPages: 1,
      CatalogToken: null,
      CrawlShape: { PageSize: 100, Order: 'ROLE_CODE_C_ASC' },
    });
  });

  it('detects a valid cursor whose catalog version drifted and never mixes the page', async () => {
    const roles = new InMemoryRoleRepository();
    const catalog = new FakeCatalogRepository();
    const codec: IRoleCatalogTokenCodec = new RoleCatalogTokenCodec({
      ActiveKid: 'k1',
      Keys: { k1: 'catalog-secret-32-bytes-aaaaaaaaa' },
    });
    const token = codec.Sign({
      v: 1,
      kid: 'k1',
      catalogVersion: '4',
      pageSize: 100,
      order: 'ROLE_CODE_C_ASC',
      nextPage: 2,
      totalItems: 101,
      totalPages: 2,
    });
    catalog.Current = snapshot({ Version: '5', TotalItems: 101 });
    const useCase = new ListRolesUseCase(roles, catalog, codec);

    await expect(
      useCase.Execute({ CompleteCatalog: true, Page: 2, PageSize: 100, CatalogToken: token }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      Details: { Reason: 'CATALOG_TOKEN_MISMATCH' },
    });
    expect(catalog.Calls).toBe(1);
  });

  it('reports signed shape mismatch before reading data and catalog shrink as token drift', async () => {
    const roles = new InMemoryRoleRepository();
    const catalog = new FakeCatalogRepository();
    const codec: IRoleCatalogTokenCodec = new RoleCatalogTokenCodec({
      ActiveKid: 'k1',
      Keys: { k1: 'catalog-secret-32-bytes-aaaaaaaaa' },
    });
    const token = codec.Sign({
      v: 1,
      kid: 'k1',
      catalogVersion: '4',
      pageSize: 100,
      order: 'ROLE_CODE_C_ASC',
      nextPage: 2,
      totalItems: 101,
      totalPages: 2,
    });
    const useCase = new ListRolesUseCase(roles, catalog, codec);

    await expect(
      useCase.Execute({ CompleteCatalog: true, Page: 2, PageSize: 99, CatalogToken: token }),
    ).rejects.toMatchObject({ Details: { Reason: 'CATALOG_TOKEN_MISMATCH' } });
    expect(catalog.Calls).toBe(0);

    catalog.Current = snapshot({ Version: '4', TotalItems: 0 });
    await expect(
      useCase.Execute({ CompleteCatalog: true, Page: 2, PageSize: 100, CatalogToken: token }),
    ).rejects.toMatchObject({ Details: { Reason: 'CATALOG_TOKEN_MISMATCH' } });
    expect(catalog.Calls).toBe(1);
  });

  it('rejects token/shape/page errors before querying catalog data', async () => {
    const roles = new InMemoryRoleRepository();
    const catalog = new FakeCatalogRepository();
    const codec = new RoleCatalogTokenCodec({ ActiveKid: 'k1', Keys: { k1: 'catalog-secret-32-bytes-aaaaaaaaa' } });
    const useCase = new ListRolesUseCase(roles, catalog, codec);

    await expect(useCase.Execute({ CompleteCatalog: true, Page: 1, CatalogToken: 'bad' })).rejects.toMatchObject({
      Details: { Reason: 'CATALOG_TOKEN_INVALID' },
    });
    await expect(useCase.Execute({ CompleteCatalog: true, Page: 2 })).rejects.toMatchObject({
      Details: { Reason: 'CATALOG_TOKEN_INVALID' },
    });
    await expect(useCase.Execute({ CompleteCatalog: true, Page: 1, SortBy: 'RoleName' })).rejects.toMatchObject({
      Details: { Reason: 'CATALOG_SHAPE_UNSUPPORTED' },
    });
    await expect(useCase.Execute({ CompleteCatalog: true, Page: Number.MAX_SAFE_INTEGER + 1 })).rejects.toBeInstanceOf(
      CatalogMetadataRangeException,
    );
    expect(catalog.Calls).toBe(0);
  });

  it('replays the exact same signed page and rejects non-canonical stored role codes', async () => {
    const roles = new InMemoryRoleRepository();
    const catalog = new FakeCatalogRepository();
    const codec = new RoleCatalogTokenCodec({
      ActiveKid: 'k1',
      Keys: { k1: 'catalog-secret-32-bytes-aaaaaaaaa' },
    });
    const useCase = new ListRolesUseCase(roles, catalog, codec);
    const item = new RoleEntity({
      Id: 'role-z',
      RoleCode: 'ZZ',
      RoleName: 'Last role',
      CreatedAt: new Date('2026-07-23T00:00:00.000Z'),
      UpdatedAt: new Date('2026-07-23T00:00:00.000Z'),
    });
    catalog.Current = snapshot({ Version: '4', Items: [item], TotalItems: 101 });
    const token = codec.Sign({
      v: 1,
      kid: 'k1',
      catalogVersion: '4',
      pageSize: 100,
      order: 'ROLE_CODE_C_ASC',
      nextPage: 2,
      totalItems: 101,
      totalPages: 2,
    });
    const query = { CompleteCatalog: true as const, Page: 2, PageSize: 100, CatalogToken: token };
    const first = await useCase.Execute(query);
    const replay = await useCase.Execute(query);
    expect(replay).toEqual(first);

    catalog.Current = snapshot({
      Version: '4',
      Items: [new RoleEntity({ ...item, RoleCode: 'A' })],
      TotalItems: 101,
    });
    await expect(useCase.Execute(query)).rejects.toBeInstanceOf(CatalogMetadataRangeException);
  });

  it('bumps exactly for create/name/status changes, not description/no-op, and makes seed reruns idempotent', async () => {
    const roles = new InMemoryRoleRepository();
    const catalog = new FakeCatalogRepository();
    const audited = new StubAuditedTransaction();
    const created = await new CreateRoleUseCase(roles, audited as never, catalog).Execute({
      RoleCode: 'CUSTOM_ROLE',
      RoleName: 'Custom',
    });
    expect(catalog.Bumps).toBe(1);

    const update = new UpdateRoleUseCase(roles, audited as never, catalog);
    const descriptionOnly = await update.Execute({
      Id: created.Id,
      ExpectedUpdatedAt: created.UpdatedAt,
      Description: 'display only',
    });
    expect(catalog.Bumps).toBe(1);
    const renamed = await update.Execute({
      Id: created.Id,
      ExpectedUpdatedAt: descriptionOnly.UpdatedAt,
      RoleName: 'Renamed',
    });
    expect(catalog.Bumps).toBe(2);
    await update.Execute({
      Id: created.Id,
      ExpectedUpdatedAt: renamed.UpdatedAt,
      Status: RoleStatus.Inactive,
    });
    expect(catalog.Bumps).toBe(3);

    const seedCatalog = new FakeCatalogRepository();
    await SeedAccessControlRbac(
      new InMemoryRoleRepository(),
      new InMemoryPermissionRepository(),
      new InMemoryRolePermissionRepository(),
      seedCatalog,
    );
    expect(seedCatalog.Bumps).toBe(6);
    await SeedAccessControlRbac(
      new InMemoryRoleRepository(),
      new InMemoryPermissionRepository(),
      new InMemoryRolePermissionRepository(),
      seedCatalog,
    );
    expect(seedCatalog.Bumps).toBe(6);
  });

  it('fails closed before create, identity update, or seed can bypass a mandatory catalog seam', async () => {
    const roles = new InMemoryRoleRepository();
    const catalog = new FakeCatalogRepository();
    const audited = new StubAuditedTransaction();

    await expect(
      new CreateRoleUseCase(roles, undefined as never, catalog).Execute({
        RoleCode: 'NO_AUDIT',
        RoleName: 'No audit',
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(
      new CreateRoleUseCase(roles, audited as never, undefined as never).Execute({
        RoleCode: 'NO_CATALOG',
        RoleName: 'No catalog',
      }),
    ).rejects.toBeInstanceOf(CatalogVersionUnavailableException);
    await expect(roles.List(0, 100)).resolves.toMatchObject({ TotalItems: 0 });

    const created = await new CreateRoleUseCase(roles, audited as never, catalog).Execute({
      RoleCode: 'UPDATE_GUARD',
      RoleName: 'Before',
    });
    await expect(
      new UpdateRoleUseCase(roles, audited as never, undefined as never).Execute({
        Id: created.Id,
        ExpectedUpdatedAt: created.UpdatedAt,
        RoleName: 'After',
      }),
    ).rejects.toBeInstanceOf(CatalogVersionUnavailableException);
    await expect(roles.FindById(created.Id)).resolves.toMatchObject({ RoleName: 'Before' });

    await expect(
      SeedAccessControlRbac(
        new InMemoryRoleRepository(),
        new InMemoryPermissionRepository(),
        new InMemoryRolePermissionRepository(),
        undefined as never,
      ),
    ).rejects.toBeInstanceOf(CatalogVersionUnavailableException);
  });
});
