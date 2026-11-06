import type { DateRange } from 'react-day-picker';
import type { Issue } from '@/types/issue';

export type RoleTicketRole = 'resolver' | 'approver' | 'super_admin';

export type ResolverStatusTab =
  | 'all'
  | 'in_progress'
  | 'user_dependency'
  | 'ops_input_required'
  | 'ops_user_dependency'
  | 'send_for_approval'
  | 'approved'
  | 'resolved';

export type ApproverStatusTab =
  | 'all'
  | 'approval_pending'
  | 'approved'
  | 'resolved';

export interface RoleTicketListFilters {
  searchQuery?: string;
  severityFilter?: string; // 'all' or sev1|sev2|sev3
  categoryFilter?: string;
  cityFilter?: string;
  resourceIdFilter?: string[];
  dateRange?: DateRange;
  /** Optional: ticket IDs pre-resolved for last-status / last-comment / recently-sent */
  constrainToTicketIds?: string[] | null;
}

export type ResolverStatusCountMap = Record<ResolverStatusTab, number>;
export type ApproverStatusCountMap = {
  all: number;
  approval_pending: number;
  approved: number;
  resolved: number;
};

export function pageRange(page: number, limit: number): { from: number; to: number } {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * limit;
  return { from, to: from + limit - 1 };
}

export function emptyResolverCounts(): ResolverStatusCountMap {
  return {
    all: 0,
    in_progress: 0,
    user_dependency: 0,
    ops_input_required: 0,
    ops_user_dependency: 0,
    send_for_approval: 0,
    approved: 0,
    resolved: 0,
  };
}

export function emptyApproverCounts(): ApproverStatusCountMap {
  return { all: 0, approval_pending: 0, approved: 0, resolved: 0 };
}

export function resolverTabToStatus(tab: ResolverStatusTab): Issue['status'] | 'all' {
  if (tab === 'all') return 'all';
  return tab;
}

export function approverTabToStatus(tab: ApproverStatusTab): Issue['status'] | 'all' {
  if (tab === 'all') return 'all';
  if (tab === 'approval_pending') return 'send_for_approval';
  return tab;
}

export function clampPage(page: number, total: number, limit: number): number {
  if (total <= 0) return 1;
  const maxPage = Math.max(1, Math.ceil(total / limit));
  return Math.min(Math.max(1, page), maxPage);
}
