import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/navigation/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { TicketDetailsModal } from '@/components/TicketDetailsModal';
import { TicketFilters } from '@/components/TicketFilters';
import { TicketStatsCards } from '@/components/TicketStatsCards';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Issue } from '@/types/issue';
import { getStatusLabel } from '@/utils/status';
import { exportTicketsAsCSV, generateExportFilename } from '@/utils/ticketExport';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
  Eye,
  CheckCircle,
  MessageSquare,
  MapPin,
  FileText,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { TicketService } from '@/services/ticketService';
import {
  RoleTicketListFilters,
  ResolverStatusCountMap,
  ResolverStatusTab,
  clampPage,
  emptyResolverCounts
} from '@/services/roleTicketQuery';
import { resolveAdvancedTicketIds, TooManyAdvancedMatchesError, TOO_MANY_ADVANCED_MATCHES_MESSAGE } from '@/services/roleTicketAdvancedFilters';
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

const RESOLVER_TABS: { value: ResolverStatusTab; label: string; emptyTitle: string; emptyHint: string }[] = [
  { value: 'all', label: 'All', emptyTitle: 'No tickets found', emptyHint: 'No tickets assigned to you' },
  { value: 'in_progress', label: 'Pending on CX', emptyTitle: 'No in progress tickets', emptyHint: 'No tickets in progress' },
  { value: 'user_dependency', label: 'User Dependency', emptyTitle: 'No user dependency tickets', emptyHint: 'No tickets in user dependency' },
  { value: 'ops_input_required', label: 'Ops Dependency', emptyTitle: 'No ops dependency tickets', emptyHint: 'No tickets in ops dependency' },
  { value: 'ops_user_dependency', label: 'Ops + User Dependency', emptyTitle: 'No ops + user dependency tickets', emptyHint: 'No tickets in ops + user dependency' },
  { value: 'send_for_approval', label: 'Send for Approval', emptyTitle: 'No send for approval tickets', emptyHint: 'No tickets in send for approval' },
  { value: 'approved', label: 'Approved', emptyTitle: 'No approved tickets', emptyHint: 'No tickets in approved status' },
  { value: 'resolved', label: 'Closed', emptyTitle: 'No resolved tickets', emptyHint: 'No tickets in resolved status' },
];

const isResolverTab = (value: string): value is ResolverStatusTab =>
  RESOLVER_TABS.some(tab => tab.value === value);

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

export const TicketResolverPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedTicket, setSelectedTicket] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ResolverStatusTab>('all');

  // Server-side list state (this page owns it)
  const [tickets, setTickets] = useState<Issue[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<ResolverStatusCountMap>(emptyResolverCounts());
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  // Resolved advanced-filter ids, reused across page/tab changes that share the same inputs.
  const advancedIdsCacheRef = useRef<{ key: string; ids: string[] | null } | null>(null);

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

  const userId = user?.id;
  const userRole = user?.role;
  const queryRole = userRole === 'super_admin' ? 'super_admin' : 'resolver';
  const dateFromMs = dateRange?.from?.getTime();
  const dateToMs = dateRange?.to?.getTime();
  const resourceIdKey = resourceIdFilter.join('|');

  // Debounce free-text search so each keystroke does not hit the database.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const loadList = useCallback(async (options?: { invalidateAdvancedCache?: boolean }) => {
    if (!userId) return;
    if (options?.invalidateAdvancedCache) advancedIdsCacheRef.current = null;
    const requestId = ++requestIdRef.current;
    setListLoading(true);
    setListError(null);

    try {
      // Advanced filters (last status / last comment) are resolved to ticket ids on the
      // caller's assignee scope first; the list/count queries then intersect with them.
      // Cached by advanced-filter inputs + user/role so Prev/Next and tab switches skip the full scan.
      const advancedKey = JSON.stringify([
        userId, queryRole, lastStatusFilter, lastCommentMode, lastCommentAuthor, lastCommentByInvigilator,
      ]);
      let constrainToTicketIds: string[] | null;
      if (advancedIdsCacheRef.current?.key === advancedKey) {
        constrainToTicketIds = advancedIdsCacheRef.current.ids;
      } else {
        constrainToTicketIds = await resolveAdvancedTicketIds({
          role: queryRole,
          userId,
          lastStatusFilter,
          lastCommentMode,
          lastCommentAuthor,
          lastCommentByInvigilator,
        });
        if (requestId !== requestIdRef.current) return;
        advancedIdsCacheRef.current = { key: advancedKey, ids: constrainToTicketIds };
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

      // The status dropdown is ANDed with the active tab: it can only narrow the tab, never widen it.
      const statusPin = statusFilter !== 'all' ? statusFilter : null;
      const pinnedTab: ResolverStatusTab | null = statusPin && isResolverTab(statusPin) ? statusPin : null;
      // Statuses without a tab (e.g. OPEN) are applied as an exact status filter on the "All" tab.
      const exactStatus = statusPin && !pinnedTab ? (statusPin as Issue['status']) : undefined;
      const tabConflictsWithPin = statusPin !== null && activeTab !== 'all' && activeTab !== pinnedTab;
      const effectiveTab: ResolverStatusTab = activeTab === 'all' && pinnedTab ? pinnedTab : activeTab;

      const [pageResult, rawCounts] = await Promise.all([
        tabConflictsWithPin
          ? Promise.resolve({ tickets: [] as Issue[], total: 0 })
          : TicketService.getRoleTicketPage({ role: queryRole, userId, statusTab: effectiveTab, exactStatus, filters, page, limit: PAGE_LIMIT }),
        TicketService.getRoleTicketStatusCounts({ role: queryRole, userId, panel: 'resolver', filters }),
      ]);
      if (requestId !== requestIdRef.current) return; // a newer request superseded this one

      let counts = rawCounts as ResolverStatusCountMap;
      if (statusPin) {
        const pinnedCount = pinnedTab ? counts[pinnedTab] : pageResult.total;
        const masked = emptyResolverCounts();
        if (pinnedTab) masked[pinnedTab] = pinnedCount;
        masked.all = pinnedCount;
        counts = masked;
      }

      setStatusCounts(counts);
      setTotal(pageResult.total);
      const clamped = clampPage(page, pageResult.total, PAGE_LIMIT);
      if (clamped !== page) {
        // Page ran past the end (e.g. last ticket on it was updated); the page effect reloads.
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
        setStatusCounts(emptyResolverCounts());
      } else {
        // Keep the previously loaded list/counts so a transient failure does not blank the panel.
        console.error('Failed to load resolver tickets:', error);
        const message = `Failed to load tickets: ${error instanceof Error && error.message ? error.message : 'unknown error'}. Showing the last loaded list.`;
        setListError(message);
        toast.error(message);
      }
      setListLoading(false);
    }
  }, [
    userId, queryRole, activeTab, page, statusFilter, severityFilter, categoryFilter, cityFilter,
    resourceIdFilter, dateRange, debouncedSearch, lastStatusFilter, lastCommentMode,
    lastCommentAuthor, lastCommentByInvigilator,
  ]);

  // Any filter / tab change goes back to page 1 without firing a wasted fetch for the old page.
  const resetKey = JSON.stringify([
    userId, queryRole, activeTab, debouncedSearch, statusFilter, severityFilter, categoryFilter, cityFilter,
    resourceIdKey, dateFromMs, dateToMs, lastStatusFilter, lastCommentMode, lastCommentAuthor, lastCommentByInvigilator,
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

  const handleCloseTicket = async (ticketId: string) => {
    if (!user) return;
    try {
      const ok = await TicketService.updateTicketStatus(ticketId, 'resolved', user.id, undefined, user.role);
      if (ok) {
        toast.success('Ticket closed');
        loadList({ invalidateAdvancedCache: true });
      } else {
        toast.error('Failed to close ticket');
      }
    } catch (e) {
      toast.error('Failed to close ticket');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleViewTicket = (ticket: Issue) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleExportTickets = async () => {
    if (!tickets.length) {
      toast.info('No tickets to export');
      return;
    }

    setIsExporting(true);
    try {
      const filename = generateExportFilename('resolver_tickets', {
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

  const handleTicketClick = async (ticketId: string) => {
    const onPage = tickets.find(t => t.id === ticketId);
    if (onPage) {
      handleViewTicket(onPage);
      return;
    }
    // The ticket is not on the current page (paginated list): fetch it directly.
    try {
      const fetched = await TicketService.getTicketById(ticketId);
      if (!fetched) {
        toast.error('Ticket not found');
        return;
      }
      handleViewTicket(normalizeTicketComments(fetched));
    } catch (error) {
      console.error('Failed to open ticket from notification:', error);
      toast.error('Failed to open ticket. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    loadList({ invalidateAdvancedCache: true }); // Reload current page + counts after a possible update
  };

  const activeFiltersCount = [searchTerm, statusFilter, severityFilter, categoryFilter, cityFilter, lastStatusFilter]
    .filter(filter => filter && filter !== 'all').length + resourceIdFilter.length + (dateRange ? 1 : 0) + (lastCommentByInvigilator ? 1 : 0)
    + (lastCommentMode !== 'any' ? 1 : 0);

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
  };

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

  const renderTicketCard = (ticket: Issue) => (
    <Card
      key={ticket.id}
      className={cn(
        'min-w-0 p-3 transition-shadow hover:shadow-md sm:p-4',
        ticket.comments[0]?.isFromInvigilator ? 'border border-green-400' : ''
      )}
    >
      <CardContent className="p-0">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <span className="truncate font-mono text-sm font-semibold" title={ticket.ticketNumber}>
              {ticket.ticketNumber}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1 px-2"
              onClick={() => handleViewTicket(ticket)}
            >
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge className={getSeverityColor(ticket.severity)}>{ticket.severity.toUpperCase()}</Badge>
            <Badge className={getStatusColor(ticket.status)}>{getStatusLabel(ticket.status)}</Badge>
          </div>
          <h3 className={cn(cardTitleMobileClass, 'text-sm')}>{formatCategory(ticket.issueCategory)}</h3>
          <p className="line-clamp-2 text-xs text-muted-foreground">{ticket.issueDescription}</p>
          <div className={cn(cardMetaRowClass, 'justify-between text-xs text-muted-foreground')}>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{ticket.city}</span>
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3 shrink-0" />
                {ticket.centreCode}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                {format(ticket.submittedAt, 'MMM dd')}
              </span>
            </div>
            {ticket.comments.length > 0 && (
              <span className="flex shrink-0 items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {ticket.comments.length}
              </span>
            )}
          </div>
          {ticket.comments.length > 0 && (
            <p className="truncate text-xs text-muted-foreground">
              {(() => {
                const lastComment = ticket.comments[0];
                if (lastComment.isFromInvigilator) {
                  return 'Last comment added by: Invigilator';
                }
                if (lastComment.isInternal) {
                  return 'Internal comment added';
                }
                const author = lastComment.author || 'Unknown';
                return (
                  <>
                    Last comment added by:{' '}
                    <span className="font-medium" title={author}>
                      {author}
                    </span>
                  </>
                );
              })()}
            </p>
          )}

          {/* Resolution Notes Preview */}
          {ticket.resolutionNotes && (
            <div className="bg-green-50 p-2 rounded text-xs">
              <p className="text-green-700 font-medium">Resolution:</p>
              <p className="text-green-600 line-clamp-1">{ticket.resolutionNotes}</p>
            </div>
          )}

          {/* Close Button - Bottom Right */}
          {activeTab === 'approved' && ticket.status === 'approved' && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => handleCloseTicket(ticket.id)}
                className="text-xs"
              >
                Close the ticket
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header onLogout={handleLogout} />
        <PageShell>
          <Card>
            <CardContent className="py-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Please login to access the resolver dashboard</p>
            </CardContent>
          </Card>
        </PageShell>
      </div>
    );
  }

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
    .filter(id => id && id.trim() !== '')
    .sort()
    .map(id => ({ value: id, label: id }));

  const uniqueCommentAuthors = [...new Set(tickets
    .map(t => t.comments?.[0]?.author)
    .filter((a): a is string => typeof a === 'string' && a.trim() !== '' && a.toLowerCase() !== 'anonymous'))].sort();

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const rangeEnd = Math.min(page * PAGE_LIMIT, total);
  const hasPrev = page > 1;
  const hasNext = page * PAGE_LIMIT < total;

  const renderTabBody = (tab: (typeof RESOLVER_TABS)[number]) => {
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
            <Button variant="outline" size="sm" className="mt-4" onClick={() => loadList({ invalidateAdvancedCache: true })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }
    if (tickets.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium">{tab.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">{tab.emptyHint}</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <>
        {listError && (
          <div className="mb-4 flex flex-col items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center">
            <p className="text-sm text-red-700">{listError}</p>
            <Button variant="outline" size="sm" onClick={() => loadList({ invalidateAdvancedCache: true })}>
              Retry
            </Button>
          </div>
        )}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map(renderTicketCard)}
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
      <Header onLogout={handleLogout} onTicketClick={handleTicketClick} panelName="Resolver Panel" />

      <PageShell>
          {/* Hide page header and stats per request (keep top header only) */}
          <div className="hidden" />
          <div className="hidden">
            <TicketStatsCards
              userRole="resolver"
              summary={{
                total: statusCounts.all,
                open: 0,
                pendingOrInProgress: statusCounts.in_progress,
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
          <Tabs value={activeTab} onValueChange={value => { if (isResolverTab(value)) setActiveTab(value); }}>
            <TabsList
              className={cn(
                tabsListClass,
                'z-10 md:grid-cols-4 xl:flex xl:flex-row xl:flex-nowrap xl:gap-1 xl:overflow-x-auto'
              )}
            >
              {RESOLVER_TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className={tabTriggerClass}>
                  {tab.label}
                  <Badge variant="secondary" className="ml-2">
                    {statusCounts[tab.value] ?? 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Server already filters by the active tab; only that tab renders the page of tickets. */}
            {RESOLVER_TABS.map(tab => (
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
        userRole="resolver"
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
