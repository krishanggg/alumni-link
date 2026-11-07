import type { EmploymentStatus } from './Alumni';
export type { PaginatedResponse } from './Common';

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
  alumni?: AlumniProfile;
}

interface AlumniProfile {
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
  employment_status?: EmploymentStatus | null;
  company_name?: string | null;
  position_in_company?: string | null;
  birthdate: string | null;
  profile_photo_url: string | null;
  /** NULL = provisional (only visible via Pending Approvals review); set = confirmed. */
  confirmed_at: string | null;
  student_id?: string;
  school_id?: number;
  school?: string;
}

export interface ProfileFormInput {
  email?: string;
  username?: string;
  contact_number?: string | null;
  address?: string | null;
  privacy?: 'public' | 'private';
  gender?: 'male' | 'female' | null;
  contact_email?: string | null;
  birthdate?: string | null;
  employment_status?: EmploymentStatus | null;
  company_name?: string | null;
  position_in_company?: string | null;
}

export interface SessionItem {
  id: string;
  type: 'web' | 'mobile';
  device_name?: string;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  is_current: boolean;
}

export interface NotificationPreferences {
  account_activity: boolean;
  alumni_record_updates: boolean;
  system_announcements: boolean;
  report_completion: boolean;
  feedback: boolean;
  administrative_notices: boolean;
}

export interface RememberedDevice {
  id: string;
  device_name: string;
  ip_address: string | null;
  last_used_at: string | null;
}

export interface SystemInfo {
  application: {
    name: string;
    version: string;
    environment: string;
    frontend: string;
  };
  server: {
    php_version: string;
    laravel_version: string;
    os: string;
    web_server: string;
    time: string;
    status: string;
    uptime: string;
  };
  database: {
    name: string;
    version: string;
    size: string;
    table_count: number;
  };
  storage: {
    total: string;
    free: string;
    used: string;
  };
  cache: {
    driver: string;
    session_driver: string;
  };
  counts: {
    schools: number;
    active_schools: number;
    alumni: number;
    users: number;
  };
  last_backup: string;
}

export interface ActivityLogEntry {
  id: number;
  user: string;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}


export interface BackupItem {
  id: number;
  filename: string;
  file_size: number;
  created_by: string | null;
  created_at: string;
}

export interface RestoreResponse {
  message: string;
  redirect?: string;
}
