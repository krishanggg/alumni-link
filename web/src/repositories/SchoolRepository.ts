import { request } from '../services/api';
import type { School } from '../types/Auth';

export const SchoolRepository = {
  listSchools(): Promise<{ data: School[] }> {
    return request<{ data: School[] }>('/schools');
  },

  listActiveSchools(): Promise<{ schools: School[] }> {
    return request<{ schools: School[] }>('/schools/active');
  },

  createSchool(data: { name: string; address?: string; contact_number?: string; email?: string; website?: string }): Promise<School> {
    return request<School>('/schools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSchool(id: number, data: { name: string; address?: string; contact_number?: string; email?: string; website?: string }): Promise<School> {
    return request<School>(`/schools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  toggleSchoolStatus(id: number): Promise<School> {
    return request<School>(`/schools/${id}/status`, { method: 'PATCH' });
  },

  deleteSchool(id: number): Promise<void> {
    return request<void>(`/schools/${id}`, { method: 'DELETE' });
  },

  uploadSchoolLogo(id: number, file: File): Promise<School> {
    const formData = new FormData();
    formData.append('logo', file);
    return request<School>(`/schools/${id}/logo`, {
      method: 'POST',
      body: formData,
    });
  },
};
