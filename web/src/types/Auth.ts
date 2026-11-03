import type { EmploymentStatus } from './Alumni';

export type UserRole = 'super_admin' | 'school_admin' | 'alumni';

export type Gender = 'male' | 'female';

/** Form-state variant of {@link Gender}: '' is the not-yet-chosen state. */
export type GenderSelection = Gender | '';

export function isAdminRole(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'school_admin';
}

/** The nested alumni identity/details a user's linked alumni record carries — present (even unconfirmed) so approval-review screens can show what was submitted. */
export interface UserAlumniSummary {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  graduation_year: number;
  section_strand: string | null;
  gender: Gender | null;
  birthdate: string | null;
  address: string | null;
  student_id: string | null;
  contact_number: string | null;
  employment_status?: EmploymentStatus | null;
  company_name?: string | null;
  position_in_company?: string | null;
  /** NULL = provisional (only visible via Pending Approvals review); set = confirmed. */
  confirmed_at: string | null;
  school?: { id: number; name: string } | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  // Null represents a disabled account with no role, e.g. a former Super
  // Admin immediately after transferring the role to another user.
  role: UserRole | null;
  account_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  school_id: number | null;
  school?: { id: number; name: string } | null;
  alumni_id: number | null;
  alumni_archived?: boolean;
  alumni: UserAlumniSummary | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

/** The nested alumni summary carried on a user-list row — a narrower field set than {@link UserAlumniSummary}. */
export interface UserListAlumniSummary {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  graduation_year: number;
  section_strand: string | null;
  student_id: string | null;
  contact_number: string | null;
  confirmed_at: string | null;
}

export interface UserListItem {
  id: number;
  name: string;
  email: string;
  username: string;
  role: UserRole | null;
  account_status: 'pending' | 'approved' | 'rejected';
  school_id: number | null;
  school?: { id: number; name: string } | null;
  alumni_id: number | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  alumni: UserListAlumniSummary | null;
}

/** Counts across the whole filtered set, not just the page being displayed. */
export interface UserListStats {
  total: number;
  active: number;
  admins: number;
  alumni: number;
}

export type UserListResponse = { data: UserListItem[]; total: number; stats: UserListStats };

export interface UserFormInput {
  email: string;
  username: string;
  role: UserRole;
  password?: string;
  school_id?: number;
  account_status?: 'pending' | 'approved' | 'rejected';
  /** Consumed by the page as a follow-up `linkAlumni` call after creation; harmless if it reaches the create-user request since the backend's validated() whitelist ignores unknown fields. */
  alumni_id?: number;
}

export interface LoginPayload {
  login: string;
  password: string;
  remember?: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
  token?: string;
}

export interface School {
  id: number;
  name: string;
  address: string | null;
  contact_number: string | null;
  email: string | null;
  website: string | null;
  is_active: boolean;
  logo_url: string | null;
  alumni_count?: number;
  created_at: string;
  updated_at: string;
}
