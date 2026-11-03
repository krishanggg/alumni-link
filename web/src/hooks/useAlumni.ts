import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useEntitySearch } from './useSearchHook';
import { ApiError } from '../services/api';
import { AlumniService, alumniKeys } from '../services/AlumniService';
import { batchKeys } from '../services/BatchService';
import { directoryKeys } from '../services/DirectoryService';
import type { PaginatedResponse } from '../types/Common';

export type { AlumniRecord, AlumniFormInput, AlumniListItem } from '../types/Alumni';
import type { AlumniRecord, AlumniListItem, AlumniFormInput } from '../types/Alumni';
import type { SearchFilters } from '../types/Search';

interface UpdateAlumniInput {
  id: number;
  formData: AlumniFormInput;
}

interface UploadAlumniPhotoInput {
  id: number;
  photo: File;
}

export function useAlumniMutations() {
  const queryClient = useQueryClient();

  // Creates, updates, and deletes change which rows (and how many pages) the
  // alumni list contains, so per spec 14 Phase 3 invalidation is the correct
  // fix here, not setQueryData patching. Directory queries render the same
  // underlying records, and batch lists/stats are aggregations of them, so
  // all three domains are invalidated together.
  function invalidateAlumniData() {
    queryClient.invalidateQueries({ queryKey: alumniKeys.all });
    queryClient.invalidateQueries({ queryKey: directoryKeys.all });
    queryClient.invalidateQueries({ queryKey: batchKeys.all });
  }

  const createMutation = useMutation({
    mutationFn: (formData: AlumniFormInput) => AlumniService.createAlumni(formData),
    onSuccess: invalidateAlumniData,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: UpdateAlumniInput) => AlumniService.updateAlumni(id, formData),
    onSuccess: invalidateAlumniData,
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: ({ id, photo }: UploadAlumniPhotoInput) => AlumniService.uploadAlumniPhoto(id, photo),
    onSuccess: invalidateAlumniData,
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (id: number) => AlumniService.deleteAlumniPhoto(id),
    onSuccess: invalidateAlumniData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => AlumniService.deleteAlumni(id),
    onSuccess: invalidateAlumniData,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => AlumniService.restoreAlumni(id),
    onSuccess: invalidateAlumniData,
  });

  const forceDeleteMutation = useMutation({
    mutationFn: (id: number) => AlumniService.forceDeleteAlumni(id),
    onSuccess: invalidateAlumniData,
  });

  async function createAlumni(formData: AlumniFormInput): Promise<AlumniRecord> {
    try {
      return await createMutation.mutateAsync(formData);
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError('Failed to create alumni', 500);
    }
  }

  async function updateAlumni(id: number, formData: AlumniFormInput): Promise<AlumniRecord> {
    try {
      return await updateMutation.mutateAsync({ id, formData });
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError('Failed to update alumni', 500);
    }
  }

  async function uploadAlumniPhoto(id: number, photo: File): Promise<AlumniRecord> {
    try {
      return await uploadPhotoMutation.mutateAsync({ id, photo });
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError('Failed to upload profile photo', 500);
    }
  }

  async function deleteAlumniPhoto(id: number): Promise<AlumniRecord> {
    try {
      return await deletePhotoMutation.mutateAsync(id);
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError('Failed to remove profile photo', 500);
    }
  }

  async function deleteAlumni(id: number) {
    await deleteMutation.mutateAsync(id);
  }

  async function restoreAlumni(id: number) {
    await restoreMutation.mutateAsync(id);
  }

  async function forceDeleteAlumni(id: number) {
    await forceDeleteMutation.mutateAsync(id);
  }

  return { createAlumni, updateAlumni, uploadAlumniPhoto, deleteAlumniPhoto, deleteAlumni, restoreAlumni, forceDeleteAlumni };
}

export function useAlumni(
  initialStatus: 'active' | 'archived' | 'all' = 'active',
  initialFilters: Partial<SearchFilters> = {},
) {
  const {
    data,
    currentPage,
    lastPage,
    total,
    isLoading,
    isFetching,
    error,
    filters,
    filterOptions,
    suggestions,
    applyFilters,
    setPage,
    loadSuggestions,
    clearSuggestions,
  } = useEntitySearch<AlumniListItem>('admin', { ...initialFilters, status: initialStatus }, 15, true);

  const { createAlumni, updateAlumni, uploadAlumniPhoto, deleteAlumni, restoreAlumni, forceDeleteAlumni } = useAlumniMutations();

  const alumni: PaginatedResponse<AlumniListItem> = {
    data,
    current_page: currentPage,
    last_page: lastPage,
    per_page: 15,
    total,
  };

  return {
    alumni,
    isLoading,
    isFetching,
    error,
    filters,
    filterOptions,
    suggestions,
    applyFilters,
    setPage,
    loadSuggestions,
    clearSuggestions,
    createAlumni,
    updateAlumni,
    uploadAlumniPhoto,
    deleteAlumni,
    restoreAlumni,
    forceDeleteAlumni,
  };
}
