import { useQuery } from '@tanstack/react-query';

import type { School } from '../types/Auth';

import { SchoolService, schoolKeys } from '../services/SchoolService';

import { STALE_TIME_REFERENCE_MS } from '../lib/queryClient';

export function useActiveSchools(): { schools: School[]; isLoading: boolean } {
  const { data, isPending } = useQuery({
    queryKey: schoolKeys.active(),
    queryFn: () => SchoolService.listActiveSchools(),
    staleTime: STALE_TIME_REFERENCE_MS,
  });

  return { schools: data?.schools ?? [], isLoading: isPending };
}
