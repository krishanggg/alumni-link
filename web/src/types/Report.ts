// 'active' returns every non-archived report; 'admin_only'/'published' remain
// valid narrower filters the endpoint still accepts.
export type ReportListStatus = 'active' | 'admin_only' | 'published' | 'archived';

export type ReportVisibility = 'admin_only' | 'published';
export type ReportLifecycleStatus = 'active' | 'archived';

export interface ReportRecord {
  id: number;
  title: string;
  report_type: string;
  format: string;
  visibility: ReportVisibility;
  lifecycle_status: ReportLifecycleStatus;
  school_id?: number | null;
  school?: { id: number; name: string } | null;
  created_at: string;
  published_at: string | null;
}

export interface ReportDetail {
  report: {
    id: number;
    title: string;
    report_type: string;
    format: string;
    filters: Record<string, unknown> | null;
    created_at: string;
  };
  data: Record<string, unknown>;
  school: { id: number; name: string; logo_url: string | null } | null;
}

export interface ReportPreview {
  report: { title: string; report_type: string; filters: Record<string, unknown>; created_at: string };
  data: Record<string, unknown>;
}

export interface DirectoryPreviewEntry {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  school: string;
  graduation_year: number;
  section_strand: string | null;
  profile_photo_url: string | null;
  privacy?: string;
}
