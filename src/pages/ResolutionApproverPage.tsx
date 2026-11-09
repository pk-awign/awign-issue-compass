import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { TicketDetailsModal } from '@/components/TicketDetailsModal';
import { TicketFilters } from '@/components/TicketFilters';
import { TicketStatsCards } from '@/components/TicketStatsCards';
import { Header } from '@/components/navigation/Header';
import { BrandLogo } from '@/components/BrandLogo';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Issue } from '@/types/issue';
import { getStatusLabel } from '@/utils/status';
import { exportTicketsAsCSV, generateExportFilename } from '@/utils/ticketExport';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
  Eye,
  Clock,
  CheckCircle,
  MessageSquare,
  MapPin,
  FileText,
  Calendar,
  User,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { TicketService } from '@/services/ticketService';
import {
  ApproverStatusCountMap,
  ApproverStatusTab,
  RoleTicketListFilters,
  approverTabToStatus,
  clampPage,
  emptyApproverCounts
} from '@/services/roleTicketQuery';
import {
  assertWithinAdvancedFilterLimit,
  fetchScopedTicketIds,
  resolveAdvancedTicketIds,
  TooManyAdvancedMatchesError,
  TOO_MANY_ADVANCED_MATCHES_MESSAGE
} from '@/services/roleTicketAdvancedFilters';
import { PageShell } from '@/components/layout/PageShell';
import {
  cardMetaRowClass,
  cardTitleMobileClass,
  pageFooterClass,
  tabTriggerClass,
  tabsListClass,
} from '@/components/layout/mobileLayout';
import { cn } from '@/lib/utils';

const PAGE_LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 400;
const SEVERITY_OPTIONS = ['sev1', 'sev2', 'sev3'];

const APPROVER_TABS: { value: ApproverStatusTab; label: string; emptyTitle: string; emptyHint: string }[] = [
  { value: 'all', label: 'All', emptyTitle: 'No tickets found', emptyHint: 'No tickets assigned to you' },
  { value: 'approval_pending', label: 'Approval Pending', emptyTitle: 'No approval pending tickets', emptyHint: 'All tickets have been reviewed!' },
  { value: 'approved', label: 'Approved', emptyTitle: 'No approved tickets', emptyHint: 'No tickets in approved status' },
  { value: 'resolved', label: 'Closed', emptyTitle: 'No resolved tickets', emptyHint: 'No tickets in resolved status' },
];

const isApproverTab = (value: string): value is ApproverStatusTab =>
  APPROVER_TABS.some(tab => tab.value === value);

/** Maps a ticket status to the approver tab that shows it (null = no tab, e.g. open / in_progress). */
const statusToApproverTab = (status: Issue['status']): ApproverStatusTab | null => {
  if (status === 'send_for_approval') return 'approval_pending';
  if (status === 'approved' || status === 'resolved') return status;
  return null;
};

/**
 * Tickets hydrated by TicketService.getTicketByNumber carry comments oldest-first and no
 * `isFromInvigilator` flag; this page's cards and modal expect newest-first with the flag.
 */
const normalizeTicketComments = (ticket: Issue): Issue => ({
  ...ticket,
  comments: [...(ticket.comments || [])]
    .map(comment => ({
      ...comment,
      isFromInvigilator:
        comment.isFromInvigilator ??
        (comment.author === 'anonymous' || comment.author === 'Anonymous' || comment.authorRole === 'invigilator'),
    }))
    .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)),
});

export const ResolutionApproverPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedTicket, setSelectedTicket] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ApproverStatusTab>('all');

  // Server-side list state (this page owns it)
  const [tickets, setTickets] = useState<Issue[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<ApproverStatusCountMap>(emptyApproverCounts());
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  // Resolved advanced / recently-sent ids, reused across page/tab changes that share the same inputs.
  const constrainIdsCacheRef = useRef<{ key: string; ids: string[] | null } | null>(null);

  // Status change states
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [resourceIdFilter, setResourceIdFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const [lastStatusFilter, setLastStatusFilter] = useState('all');
  const [lastCommentByInvigilator, setLastCommentByInvigilator] = useState(false);
  const [lastCommentMode, setLastCommentMode] = useState<'any' | 'by' | 'not_by'>('any');
  const [lastCommentAuthor, setLastCommentAuthor] = useState<string>('');
  const [recentlySentForApproval, setRecentlySentForApproval] = useState(false);
  const [recentlySentRange, setRecentlySentRange] = useState<DateRange | undefined>();
  const [approvedDates, setApprovedDates] = useState<Map<string, Date>>(new Map());

  const userId = user?.id;
  const userRole = user?.role;
  const queryRole = userRole === 'super_admin' ? 'super_admin' : 'approver';
  const dateFromMs = dateRange?.from?.getTime();
  const dateToMs = dateRange?.to?.getTime();
  const sentFromMs = recentlySentRange?.from?.getTime();
  const sentToMs = recentlySentRange?.to?.getTime();
  const resourceIdKey = resourceIdFilter.join('|');

  // Normalize assignees to array form for compatibility with both old (array) and new (object) shapes
  const getAllAssignees = (issue: Issue): { user_id: string; role: string }[] => {
    const raw: any = (issue as any).assignees;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.filter(Boolean);
    }
    if (typeof raw === 'object') {
      return Object.values(raw)
        .filter(Boolean)
        .map((a: any) => ({ user_id: a?.id ?? a?.user_id, role: a?.role }))
        .filter((a: any) => a?.user_id && a?.role);
    }
    return [];
  };

  const getResolverIdList = (ticket: Issue): string => {
    const ids = getAllAssignees(ticket)
      .filter(a => a.role === 'resolver')
      .map(a => a.user_id);
    return ids.length ? ids.join(', ') : 'Unassigned';
  };

  // Debounce free-text search so each keystroke does not hit the database.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const loadList = useCallback(async (options?: { invalidateConstrainCache?: boolean }) => {
    if (!userId) return;
    if (options?.invalidateConstrainCache) constrainIdsCacheRef.current = null;
    const requestId = ++requestIdRef.current;
    setListLoading(true);
    setListError(null);

    try {
      // Advanced filters (last status / last comment) and the recently-sent range are resolved to
      // ticket ids first; the list/count queries then intersect with them (capped at 500).
      // Cached by their inputs + user/role so Prev/Next and tab switches skip the full scan.
      const sentRangeActive = recentlySentForApproval && sentFromMs !== undefined;
      const constrainKey = JSON.stringify([
        userId, queryRole, lastStatusFilter, lastCommentMode, lastCommentAuthor, lastCommentByInvigilator,
        sentRangeActive, sentRangeActive ? sentFromMs : null, sentRangeActive ? (sentToMs ?? sentFromMs) : null,
      ]);
      let constrainToTicketIds: string[] | null;
      if (constrainIdsCacheRef.current?.key === constrainKey) {
        constrainToTicketIds = constrainIdsCacheRef.current.ids;
      } else {
        const advancedIds = await resolveAdvancedTicketIds({
          role: queryRole,
          userId,
          lastStatusFilter,
          lastCommentMode,
          lastCommentAuthor,
          lastCommentByInvigilator,
        });
        if (requestId !== requestIdRef.current) return;

        constrainToTicketIds = advancedIds;
        if (sentRangeActive && recentlySentRange?.from) {
          const from = recentlySentRange.from;
          const to = recentlySentRange.to || recentlySentRange.from;
          const sentIds = Array.from(new Set(await TicketService.getTicketsSentForApprovalInRange(from, to)));
          if (requestId !== requestIdRef.current) return;
          // Narrow by advanced filters and assignee scope first; the 500-id cap applies to the result,
          // not to the raw global list of tickets ever sent for approval in the range.
          let narrowed = sentIds;
          if (advancedIds !== null) {
            const allowed = new Set(advancedIds);
            narrowed = narrowed.filter(id => allowed.has(id));
          } else if (queryRole !== 'super_admin') {
            const scoped = new Set(await fetchScopedTicketIds(queryRole, userId));
            if (requestId !== requestIdRef.current) return;
            narrowed = narrowed.filter(id => scoped.has(id));
          }
          assertWithinAdvancedFilterLimit(narrowed);
          constrainToTicketIds = narrowed;
        }
        constrainIdsCacheRef.current = { key: constrainKey, ids: constrainToTicketIds };
      }

      const filters: RoleTicketListFilters = {
        searchQuery: debouncedSearch || undefined,
        severityFilter,
        categoryFilter,
        cityFilter,
        resourceIdFilter,
        dateRange,
        constrainToTicketIds,
      };

      // The status dropdown and "recently sent" (only sent-for-approval tickets) are ANDed with the
      // active tab: they can only narrow the tab, never widen it.
      // Statuses without a tab (open / in_progress / ops_* / user_dependency) are applied as an exact status.
      const pins: Issue['status'][] = [];
      if (statusFilter !== 'all') pins.push(statusFilter as Issue['status']);
      if (recentlySentForApproval) pins.push('send_for_approval');
      const pinsConflict = new Set(pins).size > 1;
      const pinStatus = !pinsConflict && pins.length > 0 ? pins[0] : null;
      const pinnedTab = pinStatus ? statusToApproverTab(pinStatus) : null;
      const tabConflictsWithPin = pinsConflict
        || (pinStatus !== null && activeTab !== 'all' && approverTabToStatus(activeTab) !== pinStatus);

      const [pageResult, rawCounts] = await Promise.all([
        tabConflictsWithPin
          ? Promise.resolve({ tickets: [] as Issue[], total: 0 })
          : TicketService.getRoleTicketPage({ role: queryRole, userId, statusTab: activeTab, exactStatus: pinStatus ?? undefined, filters, page, limit: PAGE_LIMIT }),
        TicketService.getRoleTicketStatusCounts({ role: queryRole, userId, panel: 'approver', filters }),
      ]);
      if (requestId !== requestIdRef.current) return; // a newer request superseded this one

      let counts = rawCounts as ApproverStatusCountMap;
      if (pins.length > 0) {
        const pinnedCount = pinnedTab ? counts[pinnedTab] : pageResult.total;
        const masked = emptyApproverCounts();
        if (pinnedTab) masked[pinnedTab] = pinnedCount;
        masked.all = pinnedCount;
        counts = masked;
      }

      setStatusCounts(counts);
      setTotal(pageResult.total);
      const clamped = clampPage(page, pageResult.total, PAGE_LIMIT);
      if (clamped !== page) {
        // Page ran past the end (e.g. last ticket on it was approved); the page effect reloads.
        setPage(clamped);
        return;
      }
      setTickets(pageResult.tickets.map(normalizeTicketComments));
      setListLoading(false);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (error instanceof TooManyAdvancedMatchesError) {
        setListError(TOO_MANY_ADVANCED_MATCHES_MESSAGE);
        setTickets([]);
        setTotal(0);
        setStatusCounts(emptyApproverCounts());
      } else {
        // Keep the previously loaded list/counts so a transient failure does not blank the panel.
        console.error('Failed to load approver tickets:', error);
        const message = `Failed to load tickets: ${error instanceof Error && error.message ? error.message : 'unknown error'}. Showing the last loaded list.`;
        setListError(message);
        toast.error(message);
      }
      setListLoading(false);
    }
  }, [
    userId, queryRole, activeTab, page, statusFilter, severityFilter, categoryFilter, cityFilter,
    resourceIdFilter, dateRange, debouncedSearch, lastStatusFilter, lastCommentMode,
    lastCommentAuthor, lastCommentByInvigilator, recentlySentForApproval, recentlySentRange, sentFromMs, sentToMs,
  ]);

  // Any filter / tab change goes back to page 1 without firing a wasted fetch for the old page.
  const resetKey = JSON.stringify([
    userId, queryRole, activeTab, debouncedSearch, statusFilter, severityFilter, categoryFilter, cityFilter,
    resourceIdKey, dateFromMs, dateToMs, lastStatusFilter, lastCommentMode, lastCommentAuthor,
    lastCommentByInvigilator, recentlySentForApproval, sentFromMs, sentToMs,
  ]);
  const lastResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (lastResetKeyRef.current !== resetKey) {
      lastResetKeyRef.current = resetKey;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, page]);

  // Approved dates are looked up only for approved tickets on the current page.
  useEffect(() => {
    let cancelled = false;
    const approvedTickets = tickets.filter(ticket => ticket.status === 'approved');
    if (approvedTickets.length === 0) {
      setApprovedDates(new Map());
      return;
    }
    Promise.all(
      approvedTickets.map(async ticket => [ticket.id, await TicketService.getApprovedDate(ticket.id)] as const)
    ).then(entries => {
      if (cancelled) return;
      const map = new Map<string, Date>();
      entries.forEach(([id, date]) => {
        if (date) map.set(id, date);
      });
      setApprovedDates(map);
    });
    return () => {
      cancelled = true;
    };
  }, [tickets]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    loadList({ invalidateConstrainCache: true }); // Reload current page + counts after a possible update
  };

  const handleExportTickets = async () => {
    if (!tickets.length) {
      toast.info('No tickets to export');
      return;
    }

    setIsExporting(true);
    try {
      const filename = generateExportFilename('approver_tickets', {
        statusFilter,
        severityFilter,
        categoryFilter,
        cityFilter,
        searchTerm
      });
      // Only the currently loaded page is exported (the list is paginated server-side).
      exportTicketsAsCSV(tickets, filename);
      toast.success(`Exported ${tickets.length} tickets from this page successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export tickets. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: Issue['status'], notes?: string) => {
    if (!user) return;

    setIsUpdating(true);
    try {
      const success = await TicketService.updateTicketStatus(
        ticketId,
        newStatus,
        user.id,
        notes,
        user.role
      );

      if (success) {
        toast.success(`Ticket status updated to ${newStatus}`);
        loadList({ invalidateConstrainCache: true }); // Reload current page + counts
      } else {
        toast.error('Failed to update ticket status');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewTicket = (ticket: Issue) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const activeFiltersCount = [searchTerm, statusFilter, severityFilter, categoryFilter, cityFilter, lastStatusFilter]
    .filter(filter => filter && filter !== 'all').length +
    resourceIdFilter.length +
    (dateRange ? 1 : 0) +
    ((lastCommentMode !== 'any' || lastCommentByInvigilator) ? 1 : 0) +
    (recentlySentForApproval ? 1 : 0);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setCategoryFilter('all');
    setCityFilter('all');
    setResourceIdFilter([]);
    setDateRange(undefined);
    setLastStatusFilter('all');
    setLastCommentByInvigilator(false);
    setLastCommentMode('any');
    setLastCommentAuthor('');
    setRecentlySentForApproval(false);
    setRecentlySentRange(undefined);
  };

  // Filter options: severity is a fixed enum; city/category/resource id come from the loaded
  // page plus any currently selected value so the dropdowns never lose their selection (MVP).
  const uniqueCities = Array.from(new Set([
    ...tickets.map(ticket => ticket.city),
    ...(cityFilter !== 'all' ? [cityFilter] : []),
  ])).filter(Boolean);

  const uniqueCategories = Array.from(new Set([
    ...tickets.map(ticket => ticket.issueCategory),
    ...(categoryFilter !== 'all' ? [categoryFilter] : []),
  ])).filter(Boolean);

  const uniqueResourceIds = Array.from(new Set([
    ...tickets.map(ticket => ticket.resourceId),
    ...resourceIdFilter,
  ]))
    .filter(id => id && typeof id === 'string' && id.trim() !== '')
    .sort()
    .map(id => ({ value: id, label: id }));

  const uniqueCommentAuthors = [...new Set(tickets
    .map(t => t.comments?.[0]?.author)
    .filter((a): a is string => typeof a === 'string' && a.trim() !== '' && a.toLowerCase() !== 'anonymous'))].sort();


  const getSeverityColor = (severity: Issue['severity']) => {
    switch (severity) {
      case 'sev1': return 'bg-red-100 text-red-800';
      case 'sev2': return 'bg-orange-100 text-orange-800';
      case 'sev3': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: Issue['status']) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'ops_input_required': return 'bg-purple-100 text-purple-800';
      case 'user_dependency': return 'bg-orange-100 text-orange-800';
      case 'send_for_approval': return 'bg-indigo-100 text-indigo-800';
      case 'approved': return 'bg-teal-100 text-teal-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getResolutionTime = (ticket: Issue) => {
    if (!ticket.resolvedAt) return null;
    const hours = Math.round((ticket.resolvedAt.getTime() - ticket.submittedAt.getTime()) / (1000 * 60 * 60));
    return hours;
  };

  const getApprovedDate = (ticket: Issue) => {
    // For approved tickets, first try to get from fetched approved dates
    if (ticket.status === 'approved') {
      const fetchedDate = approvedDates.get(ticket.id);
      if (fetchedDate) {
        return fetchedDate;
      }
      
      // Fallback to statusChangedAt if available
      if (ticket.statusChangedAt) {
        return ticket.statusChangedAt;
      }
    }
    return null;
  };

  const getClosedDate = (ticket: Issue) => {
    // For resolved/closed tickets, use resolvedAt
    if (ticket.status === 'resolved' && ticket.resolvedAt) {
      return ticket.resolvedAt;
    }
    return null;
  };

  const renderApprovalCard = (ticket: Issue) => {
    const resolutionTime = getResolutionTime(ticket);

    return (
      <Card
        key={ticket.id}
        className="min-w-0 border-l-4 border-l-orange-400 transition-shadow hover:shadow-md"
      >
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="truncate font-mono text-sm font-semibold" title={ticket.ticketNumber}>
                  {ticket.ticketNumber}
                </span>
                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                  <Badge className={getSeverityColor(ticket.severity)}>
                    {ticket.severity.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(ticket.status)}>
                    {getStatusLabel(ticket.status)}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewTicket(ticket)}
                className="h-8 shrink-0 gap-1 px-2"
              >
                <Eye className="h-3 w-3" />
                <span className="hidden sm:inline">Review</span>
              </Button>
            </div>

            <div className="min-w-0">
              <h3 className={cn(cardTitleMobileClass, 'mb-1 text-sm')}>
                {formatCategory(ticket.issueCategory)}
              </h3>
              <p className="line-clamp-2 text-xs text-muted-foreground">{ticket.issueDescription}</p>
            </div>

            {ticket.resolutionNotes && (
              <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                <div className="mb-1 flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="text-xs font-medium">Resolution Provided</span>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{ticket.resolutionNotes}</p>
              </div>
            )}

            {user?.role !== 'approver' && (
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 sm:gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <UserCheck className="h-3 w-3 shrink-0" />
                    <span>Resolved by</span>
                  </div>
                  <div className="truncate" title={getResolverIdList(ticket)}>
                    {getResolverIdList(ticket)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>Resolution Time</span>
                  </div>
                  <p className="font-medium tabular-nums">
                    {resolutionTime ? `${resolutionTime}h` : 'N/A'}
                    {resolutionTime && resolutionTime > 24 && (
                      <Badge variant="destructive" className="ml-1 text-xs">
                        SLA Breach
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
            )}

            {user?.role === 'approver' && ticket.status === 'send_for_approval' && (
              <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleStatusChange(ticket.id, 'approved')}
                  disabled={isUpdating}
                  className="flex-1 text-xs"
                >
                  <ThumbsUp className="mr-1 h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                  disabled={isUpdating}
                  className="flex-1 text-xs"
                >
                  <ThumbsDown className="mr-1 h-3 w-3" />
                  Send back to CX
                </Button>
              </div>
            )}

            <div
              className={cn(
                cardMetaRowClass,
                'justify-between border-t pt-2 text-xs text-muted-foreground'
              )}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <div className="flex min-w-0 items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{ticket.city}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {ticket.centreCode}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {ticket.status === 'approved' && getApprovedDate(ticket) ? (
                    <>Approved: {format(getApprovedDate(ticket)!, 'MMM dd, HH:mm')}</>
                  ) : ticket.status === 'resolved' && getClosedDate(ticket) ? (
                    <>Closed: {format(getClosedDate(ticket)!, 'MMM dd, HH:mm')}</>
                  ) : (
                    <>Resolved: {ticket.resolvedAt ? format(ticket.resolvedAt, 'MMM dd, HH:mm') : 'N/A'}</>
                  )}
                </div>
              </div>
              {ticket.comments.length > 0 && (
                <div className="flex shrink-0 items-center gap-1 tabular-nums">
                  <MessageSquare className="h-3 w-3" />
                  {ticket.comments.length}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTicketCard = (ticket: Issue) => (
    <Card key={ticket.id} className="min-w-0 transition-shadow hover:shadow-md">
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-2 sm:space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="truncate font-mono text-sm font-semibold" title={ticket.ticketNumber}>
                  {ticket.ticketNumber}
                </span>
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                  <Badge className={getSeverityColor(ticket.severity)}>
                    {ticket.severity.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(ticket.status)}>
                    {getStatusLabel(ticket.status)}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewTicket(ticket)}
              className="h-8 shrink-0 gap-1 px-2"
            >
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </div>

          {/* Issue Info */}
          <div className="min-w-0">
            <h3 className={cn(cardTitleMobileClass, 'mb-1 text-sm')}>{formatCategory(ticket.issueCategory)}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{ticket.issueDescription}</p>
          </div>

          {/* Assignment Info */}
          {user?.role !== 'approver' && (
            <div className="bg-gray-50 p-2 rounded text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Assigned to: {getResolverIdList(ticket)}</span>
                </div>
                {ticket.status === 'resolved' && (
                  <ArrowRight className="h-3 w-3 text-orange-500" />
                )}
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className={cn(cardMetaRowClass, 'justify-between text-xs text-muted-foreground')}>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <div className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{ticket.city}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {ticket.centreCode}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {ticket.status === 'approved' && getApprovedDate(ticket) ? (
                  <>Approved: {format(getApprovedDate(ticket)!, 'MMM dd')}</>
                ) : ticket.status === 'resolved' && getClosedDate(ticket) ? (
                  <>Closed: {format(getClosedDate(ticket)!, 'MMM dd')}</>
                ) : (
                  format(ticket.submittedAt, 'MMM dd')
                )}
              </div>
            </div>
            {ticket.comments.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {ticket.comments.length}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-3 py-3 sm:px-6 sm:py-4">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <BrandLogo />
                <div className="flex min-w-0 flex-col items-start">
                  <span className="text-sm sm:text-xl font-semibold text-gray-900">ESCALATION MANAGEMENT</span>
                  <span className="text-xs sm:text-sm text-gray-600 mt-1">Approver Panel</span>
                </div>
              </div>
              {user && (
                <button onClick={handleLogout} className="ml-2 shrink-0" aria-label="Log out">
                  <LogOut className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </header>
        <PageShell>
          <Card>
            <CardContent className="py-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Please login to access the approver dashboard</p>
            </CardContent>
          </Card>
        </PageShell>
      </div>
    );
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const rangeEnd = Math.min(page * PAGE_LIMIT, total);
  const hasPrev = page > 1;
  const hasNext = page * PAGE_LIMIT < total;

  const renderTabBody = (tab: (typeof APPROVER_TABS)[number]) => {
    if (listLoading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading tickets...</p>
        </div>
      );
    }
    if (listError && tickets.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-lg font-medium text-red-600">{listError}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => loadList({ invalidateConstrainCache: true })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }
    if (tickets.length === 0) {
      const EmptyIcon = tab.value === 'all' ? Clock : CheckCircle;
      return (
        <Card>
          <CardContent className="text-center py-8">
            <EmptyIcon className={`h-12 w-12 mx-auto mb-4 ${tab.value === 'all' ? 'text-gray-400' : 'text-green-500'}`} />
            <p className="text-lg font-medium">{tab.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">
              {tab.value === 'all' && activeFiltersCount > 0 ? 'Try adjusting your filters' : tab.emptyHint}
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <>
        {listError && (
          <div className="mb-4 flex flex-col items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center">
            <p className="text-sm text-red-700">{listError}</p>
            <Button variant="outline" size="sm" onClick={() => loadList({ invalidateConstrainCache: true })}>
              Retry
            </Button>
          </div>
        )}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map(tab.value === 'approval_pending' ? renderApprovalCard : renderTicketCard)}
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => setPage(p => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage(p => p + 1)}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={handleLogout} panelName="Approver Panel" />

      <PageShell>
          {/* Page Header hidden per request (keeping only the top header) */}
          {/* Hidden stats and header summary */}
          <div className="hidden" />
          <div className="hidden">
            <TicketStatsCards
              userRole="approver"
              summary={{
                total: statusCounts.all,
                open: 0,
                pendingOrInProgress: statusCounts.approval_pending,
                resolved: statusCounts.resolved,
              }}
            />
          </div>

          {/* Filters */}
          <TicketFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            severityFilter={severityFilter}
            setSeverityFilter={setSeverityFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            cityFilter={cityFilter}
            setCityFilter={setCityFilter}
            resourceIdFilter={resourceIdFilter}
            setResourceIdFilter={setResourceIdFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            lastStatusFilter={lastStatusFilter}
            setLastStatusFilter={setLastStatusFilter}
            lastCommentByInvigilator={lastCommentByInvigilator}
            setLastCommentByInvigilator={setLastCommentByInvigilator}
            advancedLastCommentFilter={true}
            lastCommentMode={lastCommentMode}
            setLastCommentMode={setLastCommentMode}
            lastCommentAuthor={lastCommentAuthor}
            setLastCommentAuthor={setLastCommentAuthor}
            uniqueCommentAuthors={uniqueCommentAuthors}
            recentlySentForApproval={recentlySentForApproval}
            setRecentlySentForApproval={setRecentlySentForApproval}
            recentlySentRange={recentlySentRange}
            setRecentlySentRange={setRecentlySentRange}
            onClearFilters={clearFilters}
            activeFiltersCount={activeFiltersCount}
            uniqueCities={uniqueCities}
            uniqueResourceIds={uniqueResourceIds}
            uniqueSeverities={SEVERITY_OPTIONS}
            uniqueCategories={uniqueCategories}
            onExportTickets={handleExportTickets}
            isExporting={isExporting}
          />

          {/* Tickets Tabs */}
          <Tabs value={activeTab} onValueChange={value => { if (isApproverTab(value)) setActiveTab(value); }}>
            <TabsList className={cn(tabsListClass, 'z-10 md:grid-cols-4')}>
              {APPROVER_TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className={tabTriggerClass}>
                  {tab.label}
                  <Badge variant="secondary" className="ml-2">{statusCounts[tab.value] ?? 0}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Server already filters by the active tab; only that tab renders the page of tickets. */}
            {APPROVER_TABS.map(tab => (
              <TabsContent key={tab.value} value={tab.value} className="mt-6">
                {tab.value === activeTab ? renderTabBody(tab) : null}
              </TabsContent>
            ))}
          </Tabs>
      </PageShell>

      {/* Ticket Details Modal */}
      <TicketDetailsModal
        ticket={selectedTicket}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        userRole="approver"
        currentUser={user.name}
      />

      <footer className="border-t bg-muted/50 py-4 md:py-6 mt-8 md:mt-12">
        <div className={pageFooterClass}>
          <p>© 2025 Awign Enterprises Pvt. Ltd.</p>
          <p className="mt-1">Escalation Management System for TCS Examination Operations.</p>
        </div>
      </footer>
    </div>
  );
};