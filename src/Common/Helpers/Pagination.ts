export type PaginationQuery = {
  Page?: number;
  PageSize?: number;
};

export type PaginationMeta = {
  Page: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
};

export type PagedResult<T> = {
  Items: T[];
  Meta: PaginationMeta;
};

export type PaginationOptions = {
  DefaultPageSize?: number;
  MaxPageSize?: number;
};

export const GetPagination = (
  query: PaginationQuery,
  options: PaginationOptions = {},
): { Skip: number; Take: number; Page: number; PageSize: number } => {
  const defaultPageSize = options.DefaultPageSize ?? 20;
  const maxPageSize = options.MaxPageSize ?? 100;

  const rawPage = query.Page ?? 1;
  const rawPageSize = query.PageSize ?? defaultPageSize;

  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(maxPageSize, Math.max(1, Math.floor(rawPageSize)))
    : defaultPageSize;

  const skip = (page - 1) * pageSize;

  return { Skip: skip, Take: pageSize, Page: page, PageSize: pageSize };
};

export const ToPagedResult = <T>(items: T[], totalItems: number, page: number, pageSize: number): PagedResult<T> => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    Items: items,
    Meta: {
      Page: page,
      PageSize: pageSize,
      TotalItems: totalItems,
      TotalPages: totalPages,
    },
  };
};
