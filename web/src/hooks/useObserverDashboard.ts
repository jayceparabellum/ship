import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export interface ObserverProgram {
  id: string;
  title: string;
  icon: string | null;
  color: string | null;
  active_project_count: number;
  active_week_count: number;
  open_issue_count: number;
  completed_issue_count: number;
  blocked_issue_count: number;
  recent_standup_count: number;
  reviewable_week_count: number;
  review_count: number;
  missing_review_count: number;
  review_completion_rate: number;
}

export interface ObserverAttentionItem {
  program_id: string;
  program_title: string;
  blocked_issue_count: number;
  missing_review_count: number;
}

export interface ObserverDashboardResponse {
  generated_at: string;
  current_week_number: number;
  review_window: {
    start_week_number: number;
    end_week_number: number;
  };
  totals: {
    programs: number;
    active_weeks: number;
    active_projects: number;
    open_issues: number;
    completed_issues: number;
    blocked_issues: number;
    recent_standups: number;
    reviewable_weeks: number;
    review_count: number;
    missing_reviews: number;
    review_completion_rate: number;
  };
  programs: ObserverProgram[];
  attention: ObserverAttentionItem[];
}

async function fetchObserverDashboard(): Promise<ObserverDashboardResponse> {
  const res = await apiGet('/api/dashboard/observer');
  if (!res.ok) {
    const error = new Error('Failed to fetch observer dashboard') as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export function useObserverDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'observer'],
    queryFn: fetchObserverDashboard,
    staleTime: 1000 * 60 * 5,
  });
}
