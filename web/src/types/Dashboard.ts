export interface AdminDashboardData {
  stats: {
    total_alumni: number;
    total_batches: number;
    new_registrations: number;
    active_alumni: number;
    archived_alumni: number;
  };
  recent_alumni: Array<{ id: number; first_name: string; middle_name?: string | null; last_name: string; suffix?: string | null; graduation_year: number; school: string; updated_at: string }>;
  batch_chart: { labels: number[]; data: number[] };
  gender_chart: { labels: string[]; data: number[] };
  recent_activity: Array<{ action: string; description: string; user: string; timestamp: string }>;
  recent_reports: Array<{ id: number; title: string; report_type: string }>;
}
