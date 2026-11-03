export interface AlumniDashboardData {
  profile: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    suffix: string | null;
    profile_photo_url: string;
    school: string;
    graduation_year: number;
    section_strand: string;
    contact_number: string | null;
    contact_email: string | null;
    privacy: 'public' | 'private' | null;
  } | null;
  batch_summary: {
    graduation_year: number;
    total_graduates: number;
    registration_progress: number;
    profile_completeness: number;
  } | null;
}
