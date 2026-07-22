import { GetPagination, PagedResult, ToPagedResult } from '@common/Helpers/Pagination';
import { RoleDto } from '@modules/AccessControl/Application/DTOs/RoleDto';
import { IRoleRepository } from '@modules/AccessControl/Application/Interfaces/IRoleRepository';
import { RoleDtoMapper } from '@modules/AccessControl/Application/Mappers/RoleDtoMapper';
import {
  CompleteRoleCatalogPageDto,
  ListRolesInput,
  ROLE_CATALOG_DEFAULT_PAGE_SIZE,
  ROLE_CATALOG_MAX_PAGE_SIZE,
  ROLE_CATALOG_ORDER,
  RoleCatalogTokenPayload,
} from '@modules/AccessControl/Application/DTOs/RoleCatalogDto';
import { IRoleCatalogRepository } from '@modules/AccessControl/Application/Interfaces/IRoleCatalogRepository';
import { IRoleCatalogTokenCodec } from '@modules/AccessControl/Application/Interfaces/IRoleCatalogTokenCodec';
import {
  CatalogMetadataRangeException,
  CatalogVersionUnavailableException,
  ConflictException,
  ValidationAppException,
} from '@common/Exceptions/AppException';

export class ListRolesUseCase {
  constructor(
    private readonly roleRepository: IRoleRepository,
    private readonly catalogRepository?: IRoleCatalogRepository,
    private readonly tokenCodec?: IRoleCatalogTokenCodec,
  ) {}

  public async Execute(query: ListRolesInput & { CompleteCatalog: true }): Promise<CompleteRoleCatalogPageDto>;
  public async Execute(query: ListRolesInput & { CompleteCatalog?: false }): Promise<PagedResult<RoleDto>>;
  public async Execute(query: ListRolesInput): Promise<PagedResult<RoleDto> | CompleteRoleCatalogPageDto>;
  public async Execute(query: ListRolesInput): Promise<PagedResult<RoleDto> | CompleteRoleCatalogPageDto> {
    if (query.CompleteCatalog) return this.ExecuteComplete(query);
    if (query.CatalogToken !== undefined || this.HasUnsupportedShape(query)) {
      throw new ValidationAppException('CompleteCatalog is required for catalog cursor/filter parameters', {
        Reason: 'CATALOG_SHAPE_UNSUPPORTED',
      });
    }
    const paging = GetPagination({ Page: query.Page, PageSize: query.PageSize });
    const result = await this.roleRepository.List(paging.Skip, paging.Take);
    return ToPagedResult(
      result.Items.map((role) => RoleDtoMapper.ToDto(role)),
      result.TotalItems,
      paging.Page,
      paging.PageSize,
    );
  }

  private async ExecuteComplete(query: ListRolesInput): Promise<CompleteRoleCatalogPageDto> {
    if (!this.catalogRepository || !this.tokenCodec || !this.tokenCodec.IsAvailable()) {
      throw new CatalogVersionUnavailableException();
    }
    if (this.HasUnsupportedShape(query)) {
      throw new ValidationAppException('Role catalog filter/sort shape is unsupported', {
        Reason: 'CATALOG_SHAPE_UNSUPPORTED',
      });
    }

    const page = query.Page ?? 1;
    const pageSize = query.PageSize ?? ROLE_CATALOG_DEFAULT_PAGE_SIZE;
    if (!Number.isInteger(page) || page < 1) {
      throw new ValidationAppException('Role catalog page is outside the supported range', {
        Reason: 'CATALOG_PAGE_OUT_OF_RANGE',
      });
    }
    if (!Number.isSafeInteger(page)) throw new CatalogMetadataRangeException();
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > ROLE_CATALOG_MAX_PAGE_SIZE) {
      throw new ValidationAppException('Role catalog page size is unsupported', {
        Reason: 'CATALOG_SHAPE_UNSUPPORTED',
      });
    }
    // Page itself may be a safe integer while the SQL offset derived from it is not. Reject the
    // unsafe metadata before opening a DB snapshot; otherwise JavaScript would round the offset
    // and could read/sign the wrong page.
    if (!Number.isSafeInteger((page - 1) * pageSize)) throw new CatalogMetadataRangeException();

    let cursor: RoleCatalogTokenPayload | null = null;
    if (page === 1 && query.CatalogToken !== undefined) {
      throw new ValidationAppException('Page one must not include a role catalog token', {
        Reason: 'CATALOG_TOKEN_INVALID',
      });
    }
    if (page > 1) {
      if (!query.CatalogToken) {
        throw new ValidationAppException('A role catalog token is required after page one', {
          Reason: 'CATALOG_TOKEN_INVALID',
        });
      }
      cursor = this.tokenCodec.Verify(query.CatalogToken);
      if (cursor.nextPage !== page) {
        throw new ValidationAppException('Role catalog page does not match the signed cursor', {
          Reason: 'CATALOG_PAGE_OUT_OF_RANGE',
        });
      }
      if (cursor.pageSize !== pageSize || cursor.order !== ROLE_CATALOG_ORDER) {
        throw new ConflictException('Role catalog request shape does not match the signed cursor', {
          Reason: 'CATALOG_TOKEN_MISMATCH',
        });
      }
    }

    const snapshot = await this.catalogRepository.ReadPage(page, pageSize);
    if (!/^(0|[1-9][0-9]*)$/.test(snapshot.Version)) throw new CatalogVersionUnavailableException();
    if (!Number.isSafeInteger(snapshot.TotalItems) || snapshot.TotalItems < 0) {
      throw new CatalogMetadataRangeException();
    }
    const totalPages = Math.max(1, Math.ceil(snapshot.TotalItems / pageSize));
    if (!Number.isSafeInteger(totalPages)) throw new CatalogMetadataRangeException();
    if (
      cursor &&
      (cursor.catalogVersion !== snapshot.Version ||
        cursor.totalItems !== snapshot.TotalItems ||
        cursor.totalPages !== totalPages)
    ) {
      throw new ConflictException('Role catalog changed during traversal', { Reason: 'CATALOG_TOKEN_MISMATCH' });
    }
    if (page > totalPages) {
      throw new ValidationAppException('Role catalog page is outside the signed range', {
        Reason: 'CATALOG_PAGE_OUT_OF_RANGE',
      });
    }

    const expectedCount =
      snapshot.TotalItems === 0 ? 0 : page < totalPages ? pageSize : snapshot.TotalItems - (page - 1) * pageSize;
    if (snapshot.Items.length !== expectedCount)
      throw new CatalogMetadataRangeException('Role catalog page geometry is invalid');
    const seen = new Set<string>();
    for (let index = 0; index < snapshot.Items.length; index += 1) {
      const code = snapshot.Items[index].RoleCode;
      if (!/^[A-Z][A-Z0-9_]{1,49}$/.test(code)) {
        throw new CatalogMetadataRangeException('Role catalog contains a non-canonical role code');
      }
      if (seen.has(code)) throw new CatalogMetadataRangeException('Role catalog contains duplicate role codes');
      seen.add(code);
      if (
        index > 0 &&
        Buffer.compare(Buffer.from(snapshot.Items[index - 1].RoleCode, 'utf8'), Buffer.from(code, 'utf8')) >= 0
      ) {
        throw new CatalogMetadataRangeException('Role catalog order is invalid');
      }
    }

    const catalogToken =
      page < totalPages
        ? this.tokenCodec.Sign({
            v: 1,
            kid: this.tokenCodec.ActiveKid(),
            catalogVersion: snapshot.Version,
            pageSize,
            order: ROLE_CATALOG_ORDER,
            nextPage: page + 1,
            totalItems: snapshot.TotalItems,
            totalPages,
          })
        : null;

    return {
      Items: snapshot.Items.map((role) => RoleDtoMapper.ToDto(role)),
      Page: page,
      PageSize: pageSize,
      TotalItems: snapshot.TotalItems,
      TotalPages: totalPages,
      CatalogToken: catalogToken,
      CrawlShape: { PageSize: pageSize, Order: ROLE_CATALOG_ORDER },
    };
  }

  private HasUnsupportedShape(query: ListRolesInput): boolean {
    return [query.Search, query.Status, query.SortBy, query.SortDirection].some((value) => value !== undefined);
  }
}
