import { AlumniRepository } from '../repositories/AlumniRepository';
import type { PaginatedResponse } from '../types/Common';
import type { AlumniRecord, AlumniListItem, AlumniFormInput } from '../types/Alumni';
import type { SearchFilters, SearchSuggestion } from '../types/Search';

export const alumniKeys = {
  all: ['alumni'] as const,
  lists: () => [...alumniKeys.all, 'list'] as const,
  list: (filters: SearchFilters) => [...alumniKeys.lists(), filters] as const,
  filterOptions: () => [...alumniKeys.all, 'filter-options'] as const,
  suggestions: (query: string) => [...alumniKeys.all, 'suggest', query] as const,
};

export const AlumniService = {
  listAlumni(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<AlumniListItem>> {
    return AlumniRepository.listAlumni(params);
  },
  getAlumni(id: number): Promise<AlumniRecord> {
    return AlumniRepository.getAlumni(id);
  },
  createAlumni(data: AlumniFormInput): Promise<AlumniRecord> {
    return AlumniRepository.createAlumni(data);
  },
  updateAlumni(id: number, data: AlumniFormInput): Promise<AlumniRecord> {
    return AlumniRepository.updateAlumni(id, data);
  },
  uploadAlumniPhoto(id: number, photo: File): Promise<AlumniRecord> {
    return AlumniRepository.uploadAlumniPhoto(id, photo);
  },
  deleteAlumniPhoto(id: number): Promise<AlumniRecord> {
    return AlumniRepository.deleteAlumniPhoto(id);
  },
  deleteAlumni(id: number): Promise<void> {
    return AlumniRepository.deleteAlumni(id);
  },
  restoreAlumni(id: number): Promise<void> {
    return AlumniRepository.restoreAlumni(id);
  },
  forceDeleteAlumni(id: number): Promise<void> {
    return AlumniRepository.forceDeleteAlumni(id);
  },
  listAlumniDuplicates(params: Record<string, string | number>): Promise<Array<{ id: number; first_name: string; middle_name: string | null; last_name: string; suffix: string | null; graduation_year: number; school_id: number | null; section_strand: string | null; student_id: string | null }>> {
    return AlumniRepository.listAlumniDuplicates(params);
  },
  fetchAlumniSuggestions(query: string, options?: { unlinkedOnly?: boolean }): Promise<SearchSuggestion[]> {
    return AlumniRepository.fetchAlumniSuggestions(query, options);
  },
  searchAlumni(filters: SearchFilters): Promise<PaginatedResponse<AlumniListItem>> {
    return AlumniRepository.searchAlumni(filters);
  },
  fetchAlumniFilterOptions(): Promise<{ graduation_years: number[]; sections: string[]; genders: string[] }> {
    return AlumniRepository.fetchAlumniFilterOptions();
  },
  checkAlumniEmailAvailability(email: string, excludeId?: number): Promise<{ available: boolean }> {
    return AlumniRepository.checkAlumniEmailAvailability(email, excludeId);
  },
};
