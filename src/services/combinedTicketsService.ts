import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { Issue } from '@/types/issue';

type TicketStatus = Issue['status'];
type IssueCategory = Issue['issueCategory'];
type OtherTicketRow = Database['public']['Tables']['other_tickets']['Row'];

export type CombinedTicketSource = 'tickets' | 'other_tickets';

/**
 * One source line-item under an Other ticket (exam/shift/role details, etc.).
 * Source `other_tickets` rows are never deleted; these are in-memory only.
 */
export type TicketOccurrence = {
  sourceRowId: string;
  examDate?: string | null;
  typeOfExam?: string | null;
  shift?: string | null;
  role?: string | null;
  issueDescription?: string | null;
  attendanceCopyAvailable?: string | null;
  attendanceCopyLink?: string | null;
  assignee?: string | null;
  tcCode?: string | null;
  internalRemark1?: string | null;
  internalRemark2?: string | null;
  /** Raw source CX Status (actual business status label from sheet). */
  cxStatus?: string | null;
  /** Raw source assignee-side status label. */
  assigneeStatus?: string | null;
  /** Normalized status on this source row (ticket_status_new). */
  status?: TicketStatus | null;
  issueCategory?: IssueCategory | null;
  resourceId?: string | null;
  createdAt?: string | null;
};

export type CombinedConflictField =
  | 'status'
  | 'issueCategory'
  | 'createdAt'
  | 'resourceId'
  | 'resolver'
  | 'description';

/**
 * Ticket-level row for the Combined Tickets dashboard.
 * Portal: one row per tickets.id
 * Other: one row per distinct ticket_number (source line-items in occurrences)
 */
export interface CombinedTicketRow {
  id: string;
  ticketNumber: string;
  issueCategory: IssueCategory;
  description: string;
  status: TicketStatus;
  createdAt: Date;
  source: CombinedTicketSource;
  resourceId?: string | null;
  resolver?: string | null;
  /** All resolver labels (portal: assignee names; other: assignee text). Used for filtering. */
  resolvers: string[];
  /** All resource IDs across source rows (for filtering when ticket-level resourceId is ambiguous). */
  resourceIds: string[];
  /** All statuses across source rows (filter matches if selected status is in this list). */
  statuses: TicketStatus[];
  /** All categories across source rows (filter matches if selected category is in this list). */
  issueCategories: IssueCategory[];
  /** Underlying DB row ids — never deleted at source. */
  sourceRowIds: string[];
  /** Per-line source details for Other tickets (exam date, type, shift, …). */
  occurrences?: TicketOccurrence[];
  hasFieldConflicts: boolean;
  conflictFields: CombinedConflictField[];
  category?: string | null;
  cxOwner?: string | null;
  userName?: string | null;
  cxStatus?: string | null;
  assigneeStatus?: string | null;
}

export interface CombinedTicketFilters {
  searchQuery?: string;
  resourceIdFilter?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: TicketStatus | 'all';
  category?: IssueCategory | 'all';
  resolver?: string | 'all';
}

export interface CombinedOverviewStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byCategoryStatus: Record<string, Record<string, number>>;
  /** Unique tickets excluded from single-status buckets due to conflicting status values. */
  ticketsWithStatusConflict: number;
  /** Unique tickets excluded from single-category buckets due to conflicting category values. */
  ticketsWithCategoryConflict: number;
}

const BATCH_SIZE = 1000;
const OTHER_TICKET_ID_PREFIX = 'other:';

function isTicketStatus(value: string): value is TicketStatus {
  return (
    value === 'open' ||
    value === 'in_progress' ||
    value === 'ops_input_required' ||
    value === 'user_dependency' ||
    value === 'ops_user_dependency' ||
    value === 'send_for_approval' ||
    value === 'approved' ||
    value === 'resolved'
  );
}

function isIssueCategory(value: string): value is IssueCategory {
  return (
    value === 'payment_delay' ||
    value === 'partial_payment' ||
    value === 'behavioral_complaint' ||
    value === 'improvement_request' ||
    value === 'facility_issue' ||
    value === 'penalty_issue' ||
    value === 'malpractice' ||
    value === 'app_issue' ||
    value === 'noc' ||
    value === 'posh' ||
    value === 'workplace_misconduct' ||
    value === 'other'
  );
}

function parseCommaSeparatedTerms(input?: string): string[] {
  if (!input || !input.trim()) return [];
  return input
    .split(',')
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function uniqueSortedStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((v) => (v ?? '').trim()).filter((v) => v.length > 0))
  ).sort((a, b) => a.localeCompare(b));
}

function otherTicketLevelId(ticketNumber: string): string {
  return `${OTHER_TICKET_ID_PREFIX}${ticketNumber}`;
}

function formatExamDateLabel(examDate: string | null | undefined): string | null {
  if (!examDate || !String(examDate).trim()) return null;
  const raw = String(examDate).trim();
  // DATE columns often come as YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return raw;
}

function buildOccurrenceExamBullet(occurrence: TicketOccurrence): string | null {
  const dateLabel = formatExamDateLabel(occurrence.examDate);
  const typeLabel = occurrence.typeOfExam?.trim() || null;
  if (dateLabel && typeLabel) return `• ${dateLabel} — ${typeLabel}`;
  if (dateLabel) return `• ${dateLabel}`;
  if (typeLabel) return `• ${typeLabel}`;
  return null;
}

/**
 * Readable ticket-level description: distinct issue texts + Exam Details list.
 * Does not invent content; only uses values present on source rows.
 */
function buildAggregatedDescription(
  distinctDescriptions: string[],
  occurrences: TicketOccurrence[]
): string {
  const examBullets = occurrences
    .map(buildOccurrenceExamBullet)
    .filter((b): b is string => Boolean(b));
  // Keep exam bullet order stable: by examDate then typeOfExam
  const uniqueBullets = Array.from(new Set(examBullets));

  const parts: string[] = [];
  if (distinctDescriptions.length > 0) {
    parts.push(distinctDescriptions.join('\n\n'));
  }
  if (uniqueBullets.length > 0) {
    parts.push(`Exam Details:\n${uniqueBullets.join('\n')}`);
  }
  return parts.join('\n\n');
}

function toOccurrence(row: OtherTicketRow): TicketOccurrence {
  return {
    sourceRowId: row.id,
    examDate: row.exam_date,
    typeOfExam: row.type_of_exam,
    shift: row.shift,
    role: row.role,
    issueDescription: row.description,
    attendanceCopyAvailable: row.attendance_copy_available,
    attendanceCopyLink: row.link_to_attendance_copy,
    assignee: row.assignee,
    tcCode: row.tc_code,
    internalRemark1: row.internal_remark_1,
    internalRemark2: row.internal_remark_2,
    cxStatus: row.cx_status,
    assigneeStatus: row.assignee_status,
    status: isTicketStatus(row.status) ? row.status : null,
    issueCategory: isIssueCategory(row.issue_category) ? row.issue_category : null,
    resourceId: row.resource_id,
    createdAt: row.created_at,
  };
}

async function fetchAllPortalTickets(): Promise<
  Array<{
    id: string;
    ticket_number: string;
    issue_category: string;
    issue_description: string;
    status: string;
    created_at: string;
    resource_id: string;
  }>
> {
  const all: Array<{
    id: string;
    ticket_number: string;
    issue_category: string;
    issue_description: string;
    status: string;
    created_at: string;
    resource_id: string;
  }> = [];

  let page = 0;
  while (true) {
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;
    const { data, error } = await supabase
      .from('tickets')
      .select('id, ticket_number, issue_category, issue_description, status, created_at, resource_id')
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[CombinedTicketsService] Error fetching tickets:', error);
      throw error;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < BATCH_SIZE) break;
    page += 1;
  }

  return all;
}

/**
 * Portal resolvers come from ticket_assignees where role = 'resolver',
 * resolved to users.name (same assignment model as Admin).
 */
async function fetchPortalResolverNamesByTicketId(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  const assignmentRows: Array<{ ticket_id: string; user_id: string }> = [];

  let page = 0;
  while (true) {
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;
    const { data, error } = await supabase
      .from('ticket_assignees')
      .select('ticket_id, user_id')
      .eq('role', 'resolver')
      .range(from, to);

    if (error) {
      console.error('[CombinedTicketsService] Error fetching ticket_assignees:', error);
      throw error;
    }
    if (!data || data.length === 0) break;
    assignmentRows.push(...data);
    if (data.length < BATCH_SIZE) break;
    page += 1;
  }

  if (assignmentRows.length === 0) return map;

  const userIds = Array.from(new Set(assignmentRows.map((r) => r.user_id)));
  const nameByUserId = new Map<string, string>();

  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const chunk = userIds.slice(i, i + BATCH_SIZE);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', chunk);

    if (usersError) {
      console.error('[CombinedTicketsService] Error fetching resolver users:', usersError);
      throw usersError;
    }
    (users || []).forEach((u) => {
      if (u.name?.trim()) nameByUserId.set(u.id, u.name.trim());
    });
  }

  for (const row of assignmentRows) {
    const name = nameByUserId.get(row.user_id);
    if (!name) continue;
    const existing = map.get(row.ticket_id) || [];
    if (!existing.includes(name)) existing.push(name);
    map.set(row.ticket_id, existing);
  }

  for (const [ticketId, names] of map) {
    map.set(ticketId, names.sort((a, b) => a.localeCompare(b)));
  }

  return map;
}

async function fetchAllOtherTickets(): Promise<OtherTicketRow[]> {
  const all: OtherTicketRow[] = [];
  let page = 0;

  while (true) {
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;
    const { data, error } = await supabase
      .from('other_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[CombinedTicketsService] Error fetching other_tickets:', error);
      throw error;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as OtherTicketRow[]));
    if (data.length < BATCH_SIZE) break;
    page += 1;
  }

  return all;
}

function mapPortalTicket(
  row: {
    id: string;
    ticket_number: string;
    issue_category: string;
    issue_description: string;
    status: string;
    created_at: string;
    resource_id: string;
  },
  resolverNames: string[]
): CombinedTicketRow | null {
  if (!isTicketStatus(row.status) || !isIssueCategory(row.issue_category)) {
    console.warn('[CombinedTicketsService] Skipping portal ticket with invalid status/category', row.id);
    return null;
  }

  const resolvers = resolverNames;
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    issueCategory: row.issue_category,
    description: row.issue_description ?? '',
    status: row.status,
    createdAt: new Date(row.created_at),
    source: 'tickets',
    resourceId: row.resource_id ?? '',
    resolver: resolvers.length > 0 ? resolvers.join(', ') : null,
    resolvers,
    resourceIds: row.resource_id?.trim() ? [row.resource_id.trim()] : [],
    statuses: [row.status],
    issueCategories: [row.issue_category],
    sourceRowIds: [row.id],
    occurrences: undefined,
    hasFieldConflicts: false,
    conflictFields: [],
  };
}

/**
 * Aggregate other_tickets to ONE CombinedTicketRow per ticket_number.
 *
 * - Source rows are never deleted/modified in the database.
 * - Varying exam/shift/role/description details live in `occurrences`.
 * - Ticket-level status / category / resourceId / resolver / createdAt are set
 *   ONLY when all source rows agree. Conflicts are reported (not first/last-row).
 * - createdAt uses `created_at` (ticket Created Date), NEVER exam_date.
 * - When created_at values conflict, conflict is reported; earliest created_at is
 *   kept only so the required Date field remains defined for sorting/filters,
 *   and hasFieldConflicts.createdAt marks the ambiguity.
 */
function aggregateOtherTickets(rows: OtherTicketRow[]): CombinedTicketRow[] {
  const byTicketNumber = new Map<string, OtherTicketRow[]>();

  for (const row of rows) {
    const key = (row.ticket_number ?? '').trim();
    if (!key) continue;
    const list = byTicketNumber.get(key) || [];
    list.push(row);
    byTicketNumber.set(key, list);
  }

  const result: CombinedTicketRow[] = [];

  for (const [ticketNumber, group] of byTicketNumber) {
    const conflictFields: CombinedConflictField[] = [];

    const occurrences = group
      .map(toOccurrence)
      .sort((a, b) => {
        const da = a.examDate || '';
        const db = b.examDate || '';
        if (da !== db) return da.localeCompare(db);
        return (a.typeOfExam || '').localeCompare(b.typeOfExam || '');
      });

    const statuses = uniqueSortedStrings(group.map((r) => r.status)).filter(isTicketStatus);
    const categories = uniqueSortedStrings(group.map((r) => r.issue_category)).filter(
      isIssueCategory
    );
    const createdAtKeys = uniqueSortedStrings(
      group.map((r) => {
        const t = new Date(r.created_at).getTime();
        return Number.isNaN(t) ? '' : new Date(t).toISOString();
      })
    );
    const resourceIds = uniqueSortedStrings(group.map((r) => r.resource_id));
    const resolvers = uniqueSortedStrings(group.map((r) => r.assignee));
    const descriptions = uniqueSortedStrings(group.map((r) => r.description));

    if (statuses.length > 1) conflictFields.push('status');
    if (categories.length > 1) conflictFields.push('issueCategory');
    if (createdAtKeys.length > 1) conflictFields.push('createdAt');
    if (resourceIds.length > 1) conflictFields.push('resourceId');
    if (resolvers.length > 1) conflictFields.push('resolver');
    if (descriptions.length > 1) conflictFields.push('description');

    if (statuses.length === 0 || categories.length === 0 || createdAtKeys.length === 0) {
      console.warn(
        '[CombinedTicketsService] Skipping other ticket with invalid status/category/created_at',
        ticketNumber,
        { statuses, categories, createdAtKeys }
      );
      continue;
    }

    // Ticket-level scalars ONLY when unanimous (no first/last-row invention).
    const resourceUnanimous = resourceIds.length === 1;
    const resolverUnanimous = resolvers.length === 1;

    // Required TypeScript fields: when conflict, keep a non-authoritative placeholder
    // so the type stays satisfied; stats skip inventing status/category buckets.
    const ticketStatus = statuses[0];
    const ticketCategory = categories[0];

    // created_at is the source "Created Date" (ticket creation), never exam_date.
    // If multiple distinct created_at values exist, report conflict; earliest is
    // retained only to satisfy CombinedTicketRow.createdAt for sort/filter.
    const createdTimes = group
      .map((r) => new Date(r.created_at).getTime())
      .filter((t) => !Number.isNaN(t));
    const createdAt = new Date(Math.min(...createdTimes));

    if (conflictFields.length > 0) {
      console.warn(
        '[CombinedTicketsService] Field conflicts for other ticket',
        ticketNumber,
        { conflictFields, statuses, categories, resourceIds, resolvers, createdAtKeys }
      );
    }

    const unanimousText = (values: Array<string | null | undefined>): string | null => {
      const uniq = uniqueSortedStrings(values);
      return uniq.length === 1 ? uniq[0] : null;
    };

    result.push({
      id: otherTicketLevelId(ticketNumber),
      ticketNumber,
      issueCategory: ticketCategory,
      description: buildAggregatedDescription(descriptions, occurrences),
      status: ticketStatus,
      createdAt,
      source: 'other_tickets',
      resourceId: resourceUnanimous ? resourceIds[0] : null,
      resolver: resolverUnanimous ? resolvers[0] : null,
      resolvers,
      resourceIds,
      statuses,
      issueCategories: categories,
      sourceRowIds: group.map((r) => r.id),
      occurrences,
      hasFieldConflicts: conflictFields.length > 0,
      conflictFields,
      category: unanimousText(group.map((r) => r.category)),
      cxOwner: unanimousText(group.map((r) => r.cx_owner)),
      userName: unanimousText(group.map((r) => r.user_name)),
      // Business note: cx_status is the actual source status label; expose only if unanimous
      cxStatus: unanimousText(group.map((r) => r.cx_status)),
      assigneeStatus: unanimousText(group.map((r) => r.assignee_status)),
    });
  }

  return result;
}

export class CombinedTicketsService {
  /**
   * Fetch portal tickets (non-deleted) + other_tickets, normalize to ticket-level rows
   * (one row per unique Ticket ID for other_tickets), sort by createdAt descending.
   */
  static async getCombinedTickets(): Promise<CombinedTicketRow[]> {
    const [portalRows, resolverMap, otherRows] = await Promise.all([
      fetchAllPortalTickets(),
      fetchPortalResolverNamesByTicketId(),
      fetchAllOtherTickets().catch((error) => {
        console.warn(
          '[CombinedTicketsService] other_tickets unavailable; continuing with portal only',
          error
        );
        return [] as OtherTicketRow[];
      }),
    ]);

    const portalCombined = portalRows
      .map((row) => mapPortalTicket(row, resolverMap.get(row.id) || []))
      .filter((row): row is CombinedTicketRow => row !== null);

    const otherCombined = aggregateOtherTickets(otherRows);

    const combined = [...portalCombined, ...otherCombined];
    combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return combined;
  }

  /**
   * AND-combine all provided filters against the normalized ticket-level list
   * (never expands Other tickets back into multiple source rows).
   */
  static filterCombinedTickets(
    rows: CombinedTicketRow[],
    filters: CombinedTicketFilters = {}
  ): CombinedTicketRow[] {
    const searchTerms = parseCommaSeparatedTerms(filters.searchQuery);
    const resourceTerms = parseCommaSeparatedTerms(filters.resourceIdFilter);
    const dateFrom = filters.dateFrom ? startOfDay(filters.dateFrom) : undefined;
    const dateTo = filters.dateTo ? endOfDay(filters.dateTo) : undefined;
    const statusFilter = filters.status && filters.status !== 'all' ? filters.status : undefined;
    const categoryFilter =
      filters.category && filters.category !== 'all' ? filters.category : undefined;
    const resolverFilter =
      filters.resolver && filters.resolver !== 'all' ? filters.resolver.trim() : undefined;

    return rows.filter((row) => {
      if (searchTerms.length > 0) {
        const matchesSearch = searchTerms.some(
          (term) => row.ticketNumber.toLowerCase() === term.toLowerCase()
        );
        if (!matchesSearch) return false;
      }

      if (resourceTerms.length > 0) {
        const ids =
          row.resourceIds.length > 0
            ? row.resourceIds
            : row.resourceId
              ? [row.resourceId]
              : [];
        const matchesResource = resourceTerms.some((term) =>
          ids.some((id) => id.toLowerCase() === term.toLowerCase())
        );
        if (!matchesResource) return false;
      }

      if (dateFrom && row.createdAt < dateFrom) return false;
      if (dateTo && row.createdAt > dateTo) return false;

      if (statusFilter) {
        const statusList = row.statuses.length > 0 ? row.statuses : [row.status];
        if (!statusList.includes(statusFilter)) return false;
      }

      if (categoryFilter) {
        const categoryList =
          row.issueCategories.length > 0 ? row.issueCategories : [row.issueCategory];
        if (!categoryList.includes(categoryFilter)) return false;
      }

      if (resolverFilter) {
        if (!row.resolvers.some((name) => name === resolverFilter)) return false;
      }

      return true;
    });
  }

  static getResolverOptions(rows: CombinedTicketRow[]): string[] {
    const names = new Set<string>();
    for (const row of rows) {
      row.resolvers.forEach((name) => {
        if (name.trim()) names.add(name.trim());
      });
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Overview KPIs from an already-filtered unique-ticket list.
   * Does not count raw other_tickets line items.
   * Tickets with conflicting status/category are included in `total` but not
   * assigned to a single status/category bucket (no invented resolution).
   */
  static buildOverviewStats(rows: CombinedTicketRow[]): CombinedOverviewStats {
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byCategoryStatus: Record<string, Record<string, number>> = {};
    let ticketsWithStatusConflict = 0;
    let ticketsWithCategoryConflict = 0;

    for (const row of rows) {
      const statusConflict =
        row.conflictFields.includes('status') || row.statuses.length > 1;
      const categoryConflict =
        row.conflictFields.includes('issueCategory') || row.issueCategories.length > 1;

      if (statusConflict) {
        ticketsWithStatusConflict += 1;
      } else {
        byStatus[row.status] = (byStatus[row.status] || 0) + 1;
      }

      if (categoryConflict) {
        ticketsWithCategoryConflict += 1;
      } else {
        byCategory[row.issueCategory] = (byCategory[row.issueCategory] || 0) + 1;
      }

      if (!statusConflict && !categoryConflict) {
        if (!byCategoryStatus[row.issueCategory]) {
          byCategoryStatus[row.issueCategory] = {};
        }
        byCategoryStatus[row.issueCategory][row.status] =
          (byCategoryStatus[row.issueCategory][row.status] || 0) + 1;
      }
    }

    return {
      total: rows.length,
      byStatus,
      byCategory,
      byCategoryStatus,
      ticketsWithStatusConflict,
      ticketsWithCategoryConflict,
    };
  }
}
