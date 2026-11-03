export type UserRole = 'super_admin' | 'school_admin' | 'alumni';
export type EmploymentStatus = 'student' | 'self_employed' | 'unemployed' | 'employed' | 'retired';

export interface UserAlumniFields {
  id: number;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  graduation_year: number | null;
  section_strand: string | null;
  gender: 'male' | 'female' | null;
  birthdate: string | null;
  address: string | null;
  student_id: string | null;
  contact_number: string | null;
  employment_status?: EmploymentStatus | null;
  company_name?: string | null;
  position_in_company?: string | null;
  // Null until an admin confirms the submitted alumni record. Gates visibility
  // of the linked account beyond login/access.
  confirmed_at: string | null;
  school: { id: number; name: string } | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  role: UserRole | null;
  account_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  school_id: number | null;
  school?: { id: number; name: string } | null;
  alumni_id: number | null;
  // True when an admin archived this alumnus's linked record. `alumni_id` stays
  // populated (so a restore re-links cleanly), so this is the only signal that
  // separates an archived/deactivated alumnus from an active one.
  alumni_archived: boolean;
  alumni: UserAlumniFields | null;
  photo_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
}

export interface LoginPayload {
  login: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token?: string;
  status?: 'pending' | 'rejected';
}

export interface RegisterPayload {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  email: string;
  username: string;
  password: string;
  password_confirmation: string;
  school_id: number;
  graduation_year: number;
  section_strand: string;
  gender: 'male' | 'female';
  birthdate: string;
  address?: string;
  student_id?: string;
  contact_number?: string;
  employment_status?: EmploymentStatus | null;
  company_name?: string | null;
  position_in_company?: string | null;
}

export interface ResubmitPayload {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  email?: string;
  username?: string;
  school_id?: number;
  graduation_year?: number;
  section_strand?: string;
  gender?: 'male' | 'female';
  birthdate?: string;
  address?: string;
  student_id?: string;
  contact_number?: string;
  employment_status?: EmploymentStatus | null;
  company_name?: string | null;
  position_in_company?: string | null;
}

export interface CompleteProfilePayload {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  school_id: number;
  graduation_year: number;
  section_strand: string;
  gender: 'male' | 'female';
  birthdate: string;
  address?: string;
  student_id?: string;
  contact_number?: string;
  employment_status?: EmploymentStatus | null;
  company_name?: string | null;
  position_in_company?: string | null;
}
