import { supabase } from '@/integrations/supabase/client';
import { TicketService } from '@/services/ticketService';
import type { RoleTicketRole } from '@/services/roleTicketQuery';

export interface AdvancedTicketFilterParams {
  role: RoleTicketRole;
  userId: string;
  lastStatusFilter: string;
  lastCommentMode: 'any' | 'by' | 'not_by';
  lastCommentAuthor: string;
  /** Legacy toggle: last comment must be from an invigilator. */
  lastCommentByInvigilator: boolean;
}

const ID_BATCH = 1000;
/** Above this many matching ids we refuse to build a giant `.in()` list for the list/count queries. */
export const MAX_ADVANCED_FILTER_IDS = 500;
export const TOO_MANY_ADVANCED_MATCHES_MESSAGE = 'Too many matches for advanced filters — narrow your search';

export class TooManyAdvancedMatchesError extends Error {
  constructor() {
    super(TOO_MANY_ADVANCED_MATCHES_MESSAGE);
    this.name = 'TooManyAdvancedMatchesError';
  }
}
const COMMENT_ID_BATCH = 100;

export function hasAdvancedTicketFilters(p: Pick<AdvancedTicketFilterParams, 'lastStatusFilter' | 'lastCommentMode' | 'lastCommentByInvigilator'>): boolean {
  return p.lastStatusFilter !== 'all' || p.lastCommentMode !== 'any' || p.lastCommentByInvigilator;
}

/** Ids of tickets in the caller's scope (assignee-scoped for resolver, every non-deleted ticket for super admin). */
async function fetchScopedTicketIds(role: RoleTicketRole, userId: string): Promise<string[]> {
  const ids: string[] = [];
  for (let from = 0; ; from += ID_BATCH) {
    const query = role === 'super_admin'
      ? supabase.from('tickets').select('id').eq('deleted', false).order('id', { ascending: true })
      : supabase.from('ticket_assignees').select('ticket_id').eq('user_id', userId).eq('role', role).order('ticket_id', { ascending: true });
    const { data, error } = await query.range(from, from + ID_BATCH - 1);
    if (error) throw error;
    const rows = (data || []) as { id?: string; ticket_id?: string }[];
    rows.forEach(row => {
      const id = row.id ?? row.ticket_id;
      if (id) ids.push(id);
    });
    if (rows.length < ID_BATCH) break;
  }
  return Array.from(new Set(ids));
}

interface LastComment {
  author: string | null;
  isFromInvigilator: boolean;
}

/** Newest comment per ticket. Tickets without comments are absent from the map. */
async function fetchLastCommentByTicket(ticketIds: string[]): Promise<Map<string, LastComment>> {
  const result = new Map<string, LastComment>();
  for (let i = 0; i < ticketIds.length; i += COMMENT_ID_BATCH) {
    const batch = ticketIds.slice(i, i + COMMENT_ID_BATCH);
    for (let from = 0; ; from += ID_BATCH) {
      const { data, error } = await supabase
        .from('comments')
        .select('ticket_id, author, author_role, created_at')
        .in('ticket_id', batch)
        .order('created_at', { ascending: false })
        .range(from, from + ID_BATCH - 1);
      if (error) throw error;
      (data || []).forEach(row => {
        // Rows are newest-first, so the first row seen per ticket is its last comment.
        if (result.has(row.ticket_id)) return;
        const author = row.author as string | null;
        result.set(row.ticket_id, {
          author,
          isFromInvigilator: author === 'anonymous' || author === 'Anonymous' || row.author_role === 'invigilator',
        });
      });
      if (!data || data.length < ID_BATCH) break;
    }
  }
  return result;
}

/**
 * Resolve `constrainToTicketIds` for the last-status / last-comment filters.
 *
 * Works on the caller's scoped id set only (ids, never full ticket rows, and never the
 * IssueContext dump). Comment filter runs first to shrink the set before the heavier
 * ticket_history lookup for last status. Returns `null` when no advanced filter is active.
 */
export async function resolveAdvancedTicketIds(params: AdvancedTicketFilterParams): Promise<string[] | null> {
  if (!hasAdvancedTicketFilters(params)) return null;

  let ids = await fetchScopedTicketIds(params.role, params.userId);

  const commentFilterActive = params.lastCommentMode !== 'any' || params.lastCommentByInvigilator;
  if (commentFilterActive && ids.length > 0) {
    const lastComments = await fetchLastCommentByTicket(ids);
    ids = ids.filter(id => {
      const last = lastComments.get(id);
      if (params.lastCommentMode !== 'any') {
        if (!last) return params.lastCommentMode === 'not_by';
        if (params.lastCommentAuthor === 'invigilator') {
          return params.lastCommentMode === 'by' ? last.isFromInvigilator : !last.isFromInvigilator;
        }
        return params.lastCommentMode === 'by' ? last.author === params.lastCommentAuthor : last.author !== params.lastCommentAuthor;
      }
      return !!last && last.isFromInvigilator;
    });
  }

  if (params.lastStatusFilter !== 'all' && ids.length > 0) {
    const lastStatusMap = await TicketService.getLastStatusForTickets(ids);
    ids = ids.filter(id => lastStatusMap.get(id) === params.lastStatusFilter);
  }

  if (ids.length > MAX_ADVANCED_FILTER_IDS) throw new TooManyAdvancedMatchesError();

  return ids;
}
