import { useQuery } from '@tanstack/react-query';

import * as schoolService from '../services/schoolService';
import { schoolKeys } from '../services/schoolService';

import { STALE_TIME_REFERENCE_MS } from '../lib/queryClient';

/**
 * Active schools for the registration dropdown.
 *
 * Reference data, so the long staleTime tier: several auth screens mount a
 * `SchoolPicker`, and moving between them should not re-fetch a list that
 * only changes when an admin creates a school.
 */
export function useActiveSchools() {
  const { data, isPending, isError } = useQuery({
    queryKey: schoolKeys.active(),
    queryFn: schoolService.getActiveSchools,
    staleTime: STALE_TIME_REFERENCE_MS,
  });

  return { schools: data ?? [], isLoading: isPending, isError };
}
