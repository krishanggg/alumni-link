import { request } from './api';

export interface ActiveSchool {
  id: number;
  name: string;
}

export const schoolKeys = {
  all: ['schools'] as const,
  active: () => [...schoolKeys.all, 'active'] as const,
};

/**
 * The registration school dropdown's options.
 *
 * Hooks and components call services, never raw transport directly, per
 * `docs/REACT_CODING_GUIDELINES.md`.
 */
export async function getActiveSchools(): Promise<ActiveSchool[]> {
  const data = await request<{ schools: ActiveSchool[] }>('/schools/active');

  return data.schools ?? [];
}
