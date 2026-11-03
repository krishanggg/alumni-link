export interface BatchSummary {
  graduation_year: number;
  total_graduates: number;
  registration_progress: number | null;
  profile_completeness: number | null;
}

interface BatchAlumniBase {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  section_strand: string | null;
  profile_photo_url: string | null;
}

export interface BatchAlumniAdminItem extends BatchAlumniBase {
  contact_number: string | null;
  gender: string | null;
  school?: { id: number; name: string } | null;
}

export interface BatchDetailFilters {
  section?: string;
  gender?: string;
  all?: 1;
}

export type BatchAlumniItem = BatchAlumniBase;

interface BatchDetailMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface BatchDetailResponse {
  data: BatchAlumniItem[];
  meta: BatchDetailMeta;
}

export interface BatchStats {
  total: number;
  registration_progress: number;
  profile_completeness: number;
  gender: Record<string, number>;
  sections: Record<string, number>;
}

export interface BatchComparisonEntry {
  graduation_year: number;
  total: number;
  registration_progress: number | null;
  profile_completeness: number | null;
  male_count: number;
  female_count: number;
}

export type BatchComparison = Record<string, BatchComparisonEntry>;
