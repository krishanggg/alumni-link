export interface SearchFilters {
  q?: string;
  graduation_year?: number[];
  section?: string[];
  gender?: string;
  school_id?: number;
  sort_by?: 'name_asc' | 'name_desc' | 'year_asc' | 'year_desc' | 'date_asc' | 'date_desc';
  page?: number;
  status?: 'active' | 'archived' | 'all';
}

export interface FilterOptions {
  graduation_years: number[];
  sections: string[];
  genders: string[];
}

export interface SearchSuggestion {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  graduation_year: number;
  student_id?: string;
  section_strand?: string | null;
}
