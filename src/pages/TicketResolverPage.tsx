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

const PAGE_LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 400;
const SEVERITY_OPTIONS = ['sev1', 'sev2', 'sev3'];

/**
 * Status tab styling shared by every trigger.
 *
 * Phones and tablets use a grid (2 then 4 columns) so labels wrap inside their
 * cell and every status stays visible. From xl up the triggers size to their
 * content on a single line, where eight labels fit without scrolling.
 */
const filterTabTriggerClass =
  "w-full shrink-0 rounded-lg py-3 text-center data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow xl:w-auto xl:flex-none xl:min-w-fit xl:whitespace-nowrap xl:px-2";

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
      } else {
        console.error('Failed to load resolver tickets:', error);
        setListError('Failed to load tickets. Please try again.');
      }
      setTickets([]);
      setTotal(0);
      setStatusCounts(emptyResolverCounts());
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
    <Card key={ticket.id} className={`hover:shadow-md transition-shadow ${ticket.comments[0]?.isFromInvigilator ? 'border border-green-400' : ''}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-mono font-semibold text-sm">{ticket.ticketNumber}</span>
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                <Badge className={getSeverityColor(ticket.severity)}>
                  {ticket.severity.toUpperCase()}
                </Badge>
                <Badge className={getStatusColor(ticket.status)}>
                  {getStatusLabel(ticket.status)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewTicket(ticket)}
                className="flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                View
              </Button>
            </div>
          </div>

          {/* Issue Info */}
          <div>
            <h3 className="font-medium text-sm mb-1">{formatCategory(ticket.issueCategory)}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{ticket.issueDescription}</p>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {ticket.city}
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {ticket.centreCode}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(ticket.submittedAt, 'MMM dd')}
              </div>
            </div>
            {ticket.comments.length > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {ticket.comments.length}
              </div>
            )}
          </div>

          {/* Last Comment Info */}
          {ticket.comments.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {(() => {
                const lastComment = ticket.comments[0];
                if (lastComment.isFromInvigilator) {
                  return "Last comment added by: Invigilator";
                } else if (lastComment.isInternal) {
                  return "Internal comment added";
                } else {
                  return `Last comment added by: ${lastComment.author || 'Unknown'}`;
                }
              })()}
            </div>
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
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Please login to access the resolver dashboard</p>
            </CardContent>
          </Card>
        </main>
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
    if (listError) {
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

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-6">
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
            <TabsList className="grid w-full grid-cols-2 gap-3 rounded-xl border bg-white p-2 shadow-md my-4 z-10 md:grid-cols-4 xl:flex xl:flex-row xl:flex-nowrap xl:gap-1 xl:overflow-x-auto">
              {RESOLVER_TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className={filterTabTriggerClass}>
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
        </div>
      </main>

      {/* Ticket Details Modal */}
      <TicketDetailsModal
        ticket={selectedTicket}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        userRole="resolver"
        currentUser={user.name}
      />

      <footer className="border-t bg-muted/50 py-4 md:py-6 mt-8 md:mt-12">
        <div className="container mx-auto px-4 text-center text-xs md:text-sm text-muted-foreground">
          <p>© 2025 Awign Enterprises Pvt. Ltd.</p>
          <p className="mt-1">Escalation Management System for TCS Examination Operations.</p>
        </div>
      </footer>
    </div>
  );
};
