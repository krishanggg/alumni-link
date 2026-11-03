import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { School } from '../types/Auth';

import { SchoolService, schoolKeys } from '../services/SchoolService';

interface SchoolFormInput {
  name: string;
  address?: string;
  contact_number?: string;
  email?: string;
  website?: string;
}

export function useSchools(enabled = true) {
  const queryClient = useQueryClient();

  const { data, isPending: isLoading, error: queryError } = useQuery({
    queryKey: schoolKeys.list(),
    queryFn: () => SchoolService.listSchools(),
    enabled,
  });

  const error = queryError instanceof Error ? queryError.message : null;

  // Invalidating the domain root also covers the active-schools reference
  // cache (registration dropdown, school-scope selectors), which any school
  // create/update/delete/toggle can affect.
  const invalidateSchools = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: schoolKeys.all });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (input: SchoolFormInput) => SchoolService.createSchool(input),
    onSuccess: invalidateSchools,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: SchoolFormInput }) => SchoolService.updateSchool(id, input),
    onSuccess: invalidateSchools,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => SchoolService.toggleSchoolStatus(id),
    // Single-row toggle: the response contains the updated row, so patch the
    // cached list instead of refetching it (spec 14 Phase 3). The active-schools
    // reference cache changes membership on toggle, so invalidate only that key;
    // it refetches lazily when next observed.
    onSuccess: (updatedSchool, id) => {
      queryClient.setQueryData<{ data: School[] }>(schoolKeys.list(), (old) => {
        if (!old) {
          return old;
        }

        return { ...old, data: old.data.map((s) => (s.id === id ? { ...s, ...updatedSchool } : s)) };
      });
      queryClient.invalidateQueries({ queryKey: schoolKeys.active() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => SchoolService.deleteSchool(id),
    onSuccess: invalidateSchools,
  });

  const uploadLogoMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => SchoolService.uploadSchoolLogo(id, file),
    onSuccess: invalidateSchools,
  });

  async function fetchSchools() {
    return queryClient.fetchQuery({
      queryKey: schoolKeys.list(),
      queryFn: () => SchoolService.listSchools(),
      staleTime: 0,
    });
  }

  async function createSchool(input: SchoolFormInput) {
    return createMutation.mutateAsync(input);
  }

  async function updateSchool(id: number, input: SchoolFormInput) {
    return updateMutation.mutateAsync({ id, input });
  }

  async function toggleStatus(id: number) {
    return toggleMutation.mutateAsync(id);
  }

  async function deleteSchool(id: number) {
    await deleteMutation.mutateAsync(id);
  }

  async function uploadLogo(id: number, file: File) {
    return uploadLogoMutation.mutateAsync({ id, file });
  }

  return {
    schools: data?.data ?? [],
    isLoading,
    error,
    fetchSchools,
    createSchool,
    updateSchool,
    toggleStatus,
    deleteSchool,
    uploadLogo,
  };
}
