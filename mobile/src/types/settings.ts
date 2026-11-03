import type { EmploymentStatus } from './index';

export interface AlumniProfileFields {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  graduation_year: number;
  section_strand: string | null;
  contact_number: string | null;
  address: string | null;
  privacy: 'public' | 'private';
  gender: 'male' | 'female' | null;
  contact_email: string | null;
  employment_status: EmploymentStatus | null;
  company_name: string | null;
  position_in_company: string | null;
  birthdate: string | null;
  profile_photo_url: string | null;
}

export interface ProfileResponse {
  id: number;
  name: string;
  email: string;
  username: string;
  role: 'super_admin' | 'school_admin' | 'alumni';
  account_status: 'pending' | 'approved' | 'rejected';
  school_id: number | null;
  alumni_id: number | null;
  photo_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  alumni: AlumniProfileFields | null;
}

export interface UpdateProfilePayload {
  email?: string;
  username?: string;
  contact_number?: string | null;
  address?: string | null;
  gender?: 'male' | 'female' | null;
  birthdate?: string | null;
  contact_email?: string | null;
  employment_status?: EmploymentStatus | null;
  company_name?: string | null;
  position_in_company?: string | null;
  privacy?: 'public' | 'private';
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface NotificationPreferences {
  account_activity: boolean;
  alumni_record_updates: boolean;
  system_announcements: boolean;
  report_completion: boolean;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences;
}
