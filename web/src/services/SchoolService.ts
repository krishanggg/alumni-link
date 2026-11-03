import { SchoolRepository } from '../repositories/SchoolRepository';
import type { School } from '../types/Auth';

export const schoolKeys = {
  all: ['schools'] as const,
  active: () => [...schoolKeys.all, 'active'] as const,
  list: () => [...schoolKeys.all, 'list'] as const,
};

export const SchoolService = {
  listSchools(): Promise<{ data: School[] }> {
    return SchoolRepository.listSchools();
  },
  listActiveSchools(): Promise<{ schools: School[] }> {
    return SchoolRepository.listActiveSchools();
  },
  createSchool(data: { name: string; address?: string; contact_number?: string; email?: string; website?: string }): Promise<School> {
    return SchoolRepository.createSchool(data);
  },
  updateSchool(id: number, data: { name: string; address?: string; contact_number?: string; email?: string; website?: string }): Promise<School> {
    return SchoolRepository.updateSchool(id, data);
  },
  toggleSchoolStatus(id: number): Promise<School> {
    return SchoolRepository.toggleSchoolStatus(id);
  },
  deleteSchool(id: number): Promise<void> {
    return SchoolRepository.deleteSchool(id);
  },
  uploadSchoolLogo(id: number, file: File): Promise<School> {
    return SchoolRepository.uploadSchoolLogo(id, file);
  },
};
