import { RoleDto } from '@modules/AccessControl/Application/DTOs/RoleDto';

export const ROLE_CATALOG_ORDER = 'ROLE_CODE_C_ASC' as const;
export const ROLE_CATALOG_DEFAULT_PAGE_SIZE = 20;
export const ROLE_CATALOG_MAX_PAGE_SIZE = 100;

export interface RoleCatalogTokenPayload {
  v: 1;
  kid: string;
  catalogVersion: string;
  pageSize: number;
  order: typeof ROLE_CATALOG_ORDER;
  nextPage: number;
  totalItems: number;
  totalPages: number;
}

export interface CompleteRoleCatalogPageDto {
  Items: RoleDto[];
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  CatalogToken: string | null;
  CrawlShape: {
    PageSize: number;
    Order: typeof ROLE_CATALOG_ORDER;
  };
}

export interface ListRolesInput {
  Page?: number;
  PageSize?: number;
  CompleteCatalog?: boolean;
  CatalogToken?: string;
  Search?: string;
  Status?: string;
  SortBy?: string;
  SortDirection?: string;
}
