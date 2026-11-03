import { request } from '../services/api';
import type { PaginatedResponse } from '../types/Common';
import type { AlumniRecord, AlumniListItem, AlumniFormInput } from '../types/Alumni';
import type { SearchFilters, SearchSuggestion } from '../types/Search';

export const AlumniRepository = {
  listAlumni(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<AlumniListItem>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return request<PaginatedResponse<AlumniListItem>>(`/alumni${query ? `?${query}` : ''}`);
  },

  getAlumni(id: number): Promise<AlumniRecord> {
    return request<AlumniRecord>(`/alumni/${id}`);
  },

  createAlumni(data: AlumniFormInput): Promise<AlumniRecord> {
    return request<AlumniRecord>('/alumni', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateAlumni(id: number, data: AlumniFormInput): Promise<AlumniRecord> {
    return request<AlumniRecord>(`/alumni/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  uploadAlumniPhoto(id: number, photo: File): Promise<AlumniRecord> {
    const formData = new FormData();
    formData.append('photo', photo);
    return request<AlumniRecord>(`/alumni/${id}/photo`, {
      method: 'POST',
      body: formData,
    });
  },

  deleteAlumniPhoto(id: number): Promise<AlumniRecord> {
    return request<AlumniRecord>(`/alumni/${id}/photo`, { method: 'DELETE' });
  },

  deleteAlumni(id: number): Promise<void> {
    return request<void>(`/alumni/${id}`, { method: 'DELETE' });
  },

  restoreAlumni(id: number): Promise<void> {
    return request<void>(`/alumni/${id}/restore`, { method: 'PATCH' });
  },

  forceDeleteAlumni(id: number): Promise<void> {
    return request<void>(`/alumni/${id}/force`, { method: 'DELETE' });
  },

  listAlumniDuplicates(params: Record<string, string | number>): Promise<Array<{ id: number; first_name: string; middle_name: string | null; last_name: string; suffix: string | null; graduation_year: number; school_id: number | null; section_strand: string | null; student_id: string | null }>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.set(key, String(value));
    });
    return request(`/alumni/duplicates?${searchParams.toString()}`);
  },

  fetchAlumniSuggestions(query: string, options?: { unlinkedOnly?: boolean }): Promise<SearchSuggestion[]> {
    const params = new URLSearchParams({ q: query });
    if (options?.unlinkedOnly) {
      params.set('unlinked_only', '1');
    }
    const response = request<{ data: SearchSuggestion[] }>(`/alumni/suggest?${params.toString()}`);
    return response.then((r) => r.data);
  },

  searchAlumni(filters: SearchFilters): Promise<PaginatedResponse<AlumniListItem>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(`${key}[]`, String(v)));
      } else {
        params.set(key, String(value));
      }
    });
    return request(`/alumni/search?${params.toString()}`);
  },

  fetchAlumniFilterOptions(): Promise<{ graduation_years: number[]; sections: string[]; genders: string[] }> {
    return request('/alumni/filters');
  },

  checkAlumniEmailAvailability(email: string, excludeId?: number): Promise<{ available: boolean }> {
    const searchParams = new URLSearchParams({ email });
    if (excludeId !== undefined) {
      searchParams.set('exclude_id', String(excludeId));
    }
    return request(`/alumni/email-availability?${searchParams.toString()}`);
  },
};
