import { Knex } from 'knex';

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  searchFields?: string[];
  filters?: Record<string, unknown>;
}

export function applyQueryOptions(
  query: Knex.QueryBuilder,
  tableName: string,
  options: QueryOptions
): { dataQuery: Knex.QueryBuilder; countQuery: Knex.QueryBuilder } {
  const countQuery = query.clone().clearSelect().clearOrder().count('* as total').first();

  // Filters
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        query.whereIn(`${tableName}.${key}`, value);
        countQuery.whereIn(`${tableName}.${key}`, value);
      } else {
        query.where(`${tableName}.${key}`, value);
        countQuery.where(`${tableName}.${key}`, value);
      }
    }
  }

  // Search
  if (options.search && options.searchFields?.length) {
    const search = `%${options.search}%`;
    query.where(function () {
      for (const field of options.searchFields!) {
        this.orWhereILike(`${tableName}.${field}`, search);
      }
    });
    countQuery.where(function () {
      for (const field of options.searchFields!) {
        this.orWhereILike(`${tableName}.${field}`, search);
      }
    });
  }

  // Sorting
  const sortBy = options.sortBy || 'created_at';
  const sortOrder = options.sortOrder || 'desc';
  query.orderBy(`${tableName}.${sortBy}`, sortOrder);

  // Pagination
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
  query.offset((page - 1) * pageSize).limit(pageSize);

  return { dataQuery: query, countQuery };
}

export function parseQueryParams(query: Record<string, unknown>): QueryOptions {
  const { page, pageSize, sortBy, sortOrder, search, ...rest } = query;
  return {
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
    sortBy: sortBy as string | undefined,
    sortOrder: (sortOrder as 'asc' | 'desc') || undefined,
    search: search as string | undefined,
    filters: rest as Record<string, unknown>,
  };
}
