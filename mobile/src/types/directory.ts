export interface DirectoryEntry {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix?: string | null;
  school: string;
  graduation_year: number;
  section_strand: string | null;
  profile_photo_url: string | null;
}

export interface PaginatedDirectoryResponse {
  data: DirectoryEntry[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface DirectoryStats {
  total_alumni: number;
  batch_count: number;
  most_recent_batch: number | null;
}

export interface DirectoryFilterOptions {
  graduation_years: number[];
  sections: string[];
}

export interface DirectorySearchParams {
  search?: string;
  graduation_year?: number;
  section?: string;
  sort_by?: string;
  page?: number;
  per_page?: number;
}

export interface SearchSuggestion {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  graduation_year: number;
  section_strand: string | null;
  profile_photo_url: string | null;
}

export interface SuggestResponse {
  data: SearchSuggestion[];
}
