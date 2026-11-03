export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'employed', label: 'Employed' },
  { value: 'retired', label: 'Retired' },
] as const;

export type EmploymentStatus = typeof EMPLOYMENT_STATUS_OPTIONS[number]['value'];

export interface AlumniRecord {
  id: number;
  student_id: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  gender: string | null;
  birthdate: string | null;
  graduation_year: number;
  section_strand: string | null;
  contact_number: string | null;
  contact_email: string | null;
  address: string | null;
  employment_status?: EmploymentStatus | null;
  company_name?: string | null;
  position_in_company?: string | null;
  privacy: string;
  profile_photo_url: string | null;
  school: { id: number; name: string } | null;
  created_by: string | null;
  updated_by: string | null;
  /** NULL = provisional (only visible via Pending Approvals review); set = confirmed. */
  confirmed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlumniListItem {
  id: number;
  student_id: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix?: string | null;
  graduation_year: number;
  section_strand: string | null;
  contact_number: string | null;
  contact_email: string | null;
  school: { id: number; name: string } | null;
  deleted_at: string | null;
}

export interface AlumniFormInput {
  first_name: string;
  last_name: string;
  middle_name?: string;
  suffix?: string;
  school_id?: number;
  student_id?: string;
  graduation_year: number;
  section_strand?: string;
  gender?: string;
  birthdate?: string;
  contact_number?: string;
  contact_email?: string;
  address?: string;
  employment_status?: EmploymentStatus | null;
  company_name?: string | null;
  position_in_company?: string | null;
  privacy?: string;
}
