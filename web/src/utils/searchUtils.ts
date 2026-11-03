import type { SearchFilters } from '../types/Search';

const SHARED_URL_KEYS: (keyof SearchFilters)[] = ['q', 'graduation_year', 'section', 'sort_by'];
// `school_id` is deliberately absent: the admin school scope is owned by the
// app-wide ScopeProvider, not persisted per-page in the query string.
const ADMIN_EXTRA_KEYS: (keyof SearchFilters)[] = ['gender'];

export const ADMIN_URL_KEYS: (keyof SearchFilters)[] = [...SHARED_URL_KEYS, ...ADMIN_EXTRA_KEYS];
export const DIRECTORY_URL_KEYS: (keyof SearchFilters)[] = [...SHARED_URL_KEYS, 'school_id'];

const USER_FACING_KEYS: (keyof SearchFilters)[] = ['q', 'graduation_year', 'section', 'gender'];

export function getActiveUserFilterCount(filters: SearchFilters): number {
  return USER_FACING_KEYS.filter((key) => {
    const val = filters[key];
    return val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
  }).length;
}

export function parseFilters(params: URLSearchParams): SearchFilters {
  return parseFiltersForScope(params, [...SHARED_URL_KEYS, ...ADMIN_EXTRA_KEYS]);
}

export function parseFiltersForScope(params: URLSearchParams, urlKeys: (keyof SearchFilters)[]): SearchFilters {
  const filters: SearchFilters = {};

  if (urlKeys.includes('q')) {
    filters.q = params.get('q') || undefined;
  }
  if (urlKeys.includes('graduation_year')) {
    const years = params.getAll('graduation_year').map(Number).filter(Boolean);
    filters.graduation_year = years.length > 0 ? years : undefined;
  }
  if (urlKeys.includes('section')) {
    const sections = params.getAll('section');
    filters.section = sections.length > 0 ? sections : undefined;
  }
  if (urlKeys.includes('gender')) {
    filters.gender = params.get('gender') || undefined;
  }
  if (urlKeys.includes('sort_by')) {
    filters.sort_by = (params.get('sort_by') as SearchFilters['sort_by']) || undefined;
  }
  if (urlKeys.includes('school_id')) {
    const schoolId = Number(params.get('school_id'));
    filters.school_id = Number.isInteger(schoolId) && schoolId > 0 ? schoolId : undefined;
  }

  return filters;
}

export function buildSearchParams(filters: SearchFilters, urlKeys: (keyof SearchFilters)[]): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of urlKeys) {
    const value = filters[key];
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, String(entry));
      }
    } else {
      params.set(key, String(value));
    }
  }

  return params;
}
