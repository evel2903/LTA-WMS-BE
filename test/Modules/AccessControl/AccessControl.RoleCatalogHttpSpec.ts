import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { ResponseInterceptor } from '@common/Interceptors/ResponseInterceptor';
import { CatalogMetadataRangeException, CatalogVersionExhaustedException } from '@common/Exceptions/AppException';
import { LoggingService } from '@common/Logging/LoggingService';
import { ListRolesUseCase } from '@modules/AccessControl/Application/UseCases/ListRolesUseCase';
import { GetRoleUseCase } from '@modules/AccessControl/Application/UseCases/GetRoleUseCase';
import { CreateRoleUseCase } from '@modules/AccessControl/Application/UseCases/CreateRoleUseCase';
import { UpdateRoleUseCase } from '@modules/AccessControl/Application/UseCases/UpdateRoleUseCase';
import { SetRolePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/SetRolePermissionsUseCase';
import { ResetRolePermissionsUseCase } from '@modules/AccessControl/Application/UseCases/ResetRolePermissionsUseCase';
import type {
  IRoleCatalogRepository,
  RoleCatalogSnapshot,
} from '@modules/AccessControl/Application/Interfaces/IRoleCatalogRepository';
import { RoleCatalogTokenCodec } from '@modules/AccessControl/Infrastructure/Crypto/RoleCatalogTokenCodec';
import { RoleController } from '@modules/AccessControl/Presentation/Controllers/RoleController';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { InMemoryRoleRepository } from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

class FakeCatalogRepository implements IRoleCatalogRepository {
  public Calls = 0;
  public Current: RoleCatalogSnapshot = { Version: '7', Items: [], TotalItems: 0 };

  public async ReadPage(): Promise<RoleCatalogSnapshot> {
    this.Calls += 1;
    return this.Current;
  }

  public async Bump(): Promise<string> {
    return '8';
  }

  public async CreateIfAbsentAndBump(): Promise<boolean> {
    return false;
  }

  public async DeleteUnassigned(): Promise<null> {
    return null;
  }
}

describe('RH-05 role catalog HTTP contract', () => {
  let app: INestApplication;
  let catalog: FakeCatalogRepository;
  let codec: RoleCatalogTokenCodec;
  let execute: (query: Parameters<ListRolesUseCase['Execute']>[0]) => Promise<unknown>;

  const error = (code: string, reason?: string) => ({
    Success: false,
    Errors: [
      expect.objectContaining({
        Code: code,
        ...(reason ? { Details: { Reason: reason } } : {}),
      }),
    ],
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: ListRolesUseCase,
          useValue: { Execute: (query: Parameters<ListRolesUseCase['Execute']>[0]) => execute(query) },
        },
        { provide: GetRoleUseCase, useValue: { Execute: jest.fn() } },
        { provide: CreateRoleUseCase, useValue: { Execute: jest.fn() } },
        { provide: UpdateRoleUseCase, useValue: { Execute: jest.fn() } },
        { provide: SetRolePermissionsUseCase, useValue: { Execute: jest.fn() } },
        { provide: ResetRolePermissionsUseCase, useValue: { Execute: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter({ LogError: jest.fn() } as unknown as LoggingService));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    catalog = new FakeCatalogRepository();
    codec = new RoleCatalogTokenCodec({
      ActiveKid: 'k1',
      Keys: { k1: 'catalog-secret-32-bytes-aaaaaaaaa' },
    });
    const useCase = new ListRolesUseCase(new InMemoryRoleRepository(), catalog, codec);
    execute = (query) => useCase.Execute(query);
  });

  it('returns the complete flat page inside the standard success envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/access-control/roles?CompleteCatalog=true&Page=1&PageSize=100')
      .expect(200);

    expect(response.body).toEqual({
      Success: true,
      Data: {
        Items: [],
        Page: 1,
        PageSize: 100,
        TotalItems: 0,
        TotalPages: 1,
        CatalogToken: null,
        CrawlShape: { PageSize: 100, Order: 'ROLE_CODE_C_ASC' },
      },
    });
  });

  it.each([
    ['page one token', '?CompleteCatalog=true&Page=1&CatalogToken=bad', 'CATALOG_TOKEN_INVALID'],
    ['missing successor token', '?CompleteCatalog=true&Page=2', 'CATALOG_TOKEN_INVALID'],
    ['unsupported shape', '?CompleteCatalog=true&Page=1&SortBy=RoleName', 'CATALOG_SHAPE_UNSUPPORTED'],
  ])('maps %s to its exact 400 reason before data access', async (_case, query, reason) => {
    const response = await request(app.getHttpServer()).get(`/access-control/roles${query}`).expect(400);
    expect(response.body).toEqual(error('VALIDATION', reason));
    expect(catalog.Calls).toBe(0);
  });

  it('maps repeated CatalogToken parameters to CATALOG_TOKEN_INVALID before data access', async () => {
    const response = await request(app.getHttpServer())
      .get('/access-control/roles?CompleteCatalog=true&Page=1&CatalogToken=a&CatalogToken=b')
      .expect(400);
    expect(response.body).toEqual(error('VALIDATION', 'CATALOG_TOKEN_INVALID'));
    expect(catalog.Calls).toBe(0);
  });

  it('maps a valid cursor requested out of sequence to CATALOG_PAGE_OUT_OF_RANGE before data access', async () => {
    const token = codec.Sign({
      v: 1,
      kid: 'k1',
      catalogVersion: '7',
      pageSize: 100,
      order: 'ROLE_CODE_C_ASC',
      nextPage: 2,
      totalItems: 101,
      totalPages: 2,
    });
    const response = await request(app.getHttpServer())
      .get(`/access-control/roles?CompleteCatalog=true&Page=3&PageSize=100&CatalogToken=${encodeURIComponent(token)}`)
      .expect(400);
    expect(response.body).toEqual(error('VALIDATION', 'CATALOG_PAGE_OUT_OF_RANGE'));
    expect(catalog.Calls).toBe(0);
  });

  it('maps version drift to the exact 409 envelope', async () => {
    const token = codec.Sign({
      v: 1,
      kid: 'k1',
      catalogVersion: '6',
      pageSize: 100,
      order: 'ROLE_CODE_C_ASC',
      nextPage: 2,
      totalItems: 101,
      totalPages: 2,
    });
    catalog.Current = { Version: '7', Items: [], TotalItems: 101 };
    const response = await request(app.getHttpServer())
      .get(`/access-control/roles?CompleteCatalog=true&Page=2&PageSize=100&CatalogToken=${encodeURIComponent(token)}`)
      .expect(409);
    expect(response.body).toEqual(error('CONFLICT', 'CATALOG_TOKEN_MISMATCH'));
  });

  it.each([
    ['CATALOG_VERSION_UNAVAILABLE', () => new ListRolesUseCase(new InMemoryRoleRepository(), catalog)],
    [
      'CATALOG_VERSION_EXHAUSTED',
      () => ({
        Execute: async () => {
          throw new CatalogVersionExhaustedException();
        },
      }),
    ],
    [
      'CATALOG_METADATA_RANGE',
      () => ({
        Execute: async () => {
          throw new CatalogMetadataRangeException();
        },
      }),
    ],
  ])('maps %s to an exact 503 code', async (code, factory) => {
    const target = factory();
    execute = (query) => target.Execute(query);
    const response = await request(app.getHttpServer())
      .get('/access-control/roles?CompleteCatalog=true&Page=1')
      .expect(503);
    expect(response.body).toEqual(error(code));
  });
});
