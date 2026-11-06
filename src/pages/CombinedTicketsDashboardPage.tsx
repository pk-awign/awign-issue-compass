import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { differenceInCalendarDays, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
  Calendar as CalendarIcon,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  Settings,
  CheckCircle,
  CheckCircle2,
  Eye,
} from 'lucide-react';

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Header } from '@/components/navigation/Header';
import { TicketDetailsModal } from '@/components/admin/TicketDetailsModal';
import { OtherTicketDetailsModal } from '@/components/admin/OtherTicketDetailsModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelect } from '@/components/ui/multi-select';
import { useAuth } from '@/contexts/AuthContext';
import {
  CombinedTicketsService,
  type CombinedTicketRow,
} from '@/services/combinedTicketsService';
import { TicketService } from '@/services/ticketService';
import type { Issue } from '@/types/issue';
import { getStatusLabel } from '@/utils/status';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

type TicketStatus = Issue['status'];
type IssueCategory = Issue['issueCategory'];

/** Inclusive calendar-day span (same day = 1). Max allowed: 90. */
const MAX_DATE_RANGE_DAYS = 90;
const PAGE_SIZE = 50;
const EXCLUDED_STATUSES: TicketStatus[] = ['open', 'in_progress'];

/** Fixed status filter order for super-admin Ticket Center only. */
const SUPER_ADMIN_STATUS_FILTER_ORDER: TicketStatus[] = [
  'open',
  'in_progress',
  'user_dependency',
  'ops_input_required',
  'ops_user_dependency',
  'send_for_approval',
  'approved',
  'resolved',
];

function getInclusiveDayCount(from: Date, to: Date): number {
  return differenceInCalendarDays(to, from) + 1;
}

/** Default filter: previous calendar month. */
function getDefaultDateRange(): DateRange {
  const previousMonth = subMonths(new Date(), 1);
  return {
    from: startOfMonth(previousMonth),
    to: endOfMonth(previousMonth),
  };
}

function isDefaultDateRange(range: DateRange | undefined): boolean {
  if (!range?.from || !range?.to) return false;
  const def = getDefaultDateRange();
  if (!def.from || !def.to) return false;
  return (
    differenceInCalendarDays(range.from, def.from) === 0 &&
    differenceInCalendarDays(range.to, def.to) === 0
  );
}

function isExcludedStatus(status: TicketStatus): boolean {
  return EXCLUDED_STATUSES.includes(status);
}

/** Open / Pending on CX are visible only for tickets created in August 2026. */
const OPEN_PENDING_VISIBLE_YEAR = 2026;
const OPEN_PENDING_VISIBLE_MONTH_INDEX = 7; // August (0-based)

function isAugustOpenPendingVisible(createdAt: Date | string | null | undefined): boolean {
  if (!createdAt) return false;
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === OPEN_PENDING_VISIBLE_YEAR &&
    date.getMonth() === OPEN_PENDING_VISIBLE_MONTH_INDEX
  );
}

function isTicketVisibleInSuperAdminView(ticket: CombinedTicketRow): boolean {
  if (!isExcludedStatus(ticket.status)) return true;
  return isAugustOpenPendingVisible(ticket.createdAt);
}

/** Title-case labels for the super-admin status filter dropdown. */
function getSuperAdminStatusFilterLabel(status: TicketStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'Pending on CX';
    case 'user_dependency':
      return 'User Dependency';
    case 'ops_input_required':
      return 'Ops Dependency';
    case 'ops_user_dependency':
      return 'Ops + User Dependency';
    case 'send_for_approval':
      return 'Send for Approval';
    case 'approved':
      return 'Approved';
    case 'resolved':
      return 'Closed';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  payment_delay: '#3b82f6',
  partial_payment: '#f59e0b',
  behavioral_complaint: '#ef4444',
  improvement_request: '#8b5cf6',
  facility_issue: '#06b6d4',
  penalty_issue: '#f97316',
  malpractice: '#dc2626',
  app_issue: '#14b8a6',
  noc: '#6366f1',
  posh: '#ec4899',
  workplace_misconduct: '#84cc16',
  other: '#64748b',
};

const CATEGORY_COLOR_FALLBACK = [
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#ec4899',
  '#84cc16',
  '#64748b',
];

function getCategoryColor(categoryKey: string, index: number): string {
  return CATEGORY_COLORS[categoryKey] || CATEGORY_COLOR_FALLBACK[index % CATEGORY_COLOR_FALLBACK.length];
}

function formatCategory(category: string): string {
  if (category === 'noc') return 'NOC';
  if (category === 'posh') return 'POSH';
  if (category === 'workplace_misconduct') return 'Workplace Misconduct';
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'open':
      return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
    case 'ops_input_required':
      return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100';
    case 'user_dependency':
      return 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100';
    case 'ops_user_dependency':
      return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-100';
    case 'send_for_approval':
      return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100';
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100';
    case 'resolved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100';
  }
}

export const CombinedTicketsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();

  const [allTickets, setAllTickets] = useState<CombinedTicketRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPortalTicket, setSelectedPortalTicket] = useState<Issue | null>(null);
  const [showPortalTicketDetails, setShowPortalTicketDetails] = useState(false);
  const [selectedOtherTicket, setSelectedOtherTicket] = useState<CombinedTicketRow | null>(
    null
  );
  const [showOtherTicketDetails, setShowOtherTicketDetails] = useState(false);
  const [isOpeningView, setIsOpeningView] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [resourceIdFilter, setResourceIdFilter] = useState<string[]>([]);
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(
    getDefaultDateRange
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await CombinedTicketsService.getCombinedTickets();
      setAllTickets(rows);
    } catch (err) {
      console.error('[CombinedTicketsDashboard] Failed to load tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Ticket Center data');
      setAllTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      loadTickets();
    }
  }, [authLoading, user, loadTickets]);

  // Hide Open / Pending on CX except tickets created in August 2026.
  const scopedTickets = useMemo(
    () => allTickets.filter((ticket) => isTicketVisibleInSuperAdminView(ticket)),
    [allTickets]
  );

  const sharedNonStatusCategoryFilters = useMemo(
    () => ({
      searchQuery: searchQuery || undefined,
      resourceIdFilter:
        resourceIdFilter.length > 0 ? resourceIdFilter.join(',') : undefined,
      dateFrom: filterDateRange?.from,
      dateTo: filterDateRange?.to ?? filterDateRange?.from,
    }),
    [searchQuery, resourceIdFilter, filterDateRange]
  );

  const filteredTickets = useMemo(() => {
    return CombinedTicketsService.filterCombinedTickets(scopedTickets, {
      ...sharedNonStatusCategoryFilters,
      status: (statusFilter as TicketStatus | 'all') || 'all',
      category: (categoryFilter as IssueCategory | 'all') || 'all',
    });
  }, [scopedTickets, sharedNonStatusCategoryFilters, statusFilter, categoryFilter]);

  // Tickets used to build status/category dropdown options.
  const ticketsForFilterOptions = useMemo(() => {
    return CombinedTicketsService.filterCombinedTickets(
      scopedTickets,
      sharedNonStatusCategoryFilters
    );
  }, [scopedTickets, sharedNonStatusCategoryFilters]);

  const availableStatuses = useMemo(() => {
    let rows = ticketsForFilterOptions;
    if (categoryFilter !== 'all') {
      rows = CombinedTicketsService.filterCombinedTickets(rows, {
        category: categoryFilter as IssueCategory,
      });
    }
    const present = new Set<TicketStatus>();
    for (const row of rows) {
      const list = row.statuses.length > 0 ? row.statuses : [row.status];
      for (const status of list) {
        present.add(status);
      }
    }
    return SUPER_ADMIN_STATUS_FILTER_ORDER.filter((status) => present.has(status));
  }, [ticketsForFilterOptions, categoryFilter]);

  const availableCategories = useMemo(() => {
    let rows = ticketsForFilterOptions;
    if (statusFilter !== 'all') {
      rows = CombinedTicketsService.filterCombinedTickets(rows, {
        status: statusFilter as TicketStatus,
      });
    }
    const categories = new Set<IssueCategory>();
    for (const row of rows) {
      const list =
        row.issueCategories.length > 0 ? row.issueCategories : [row.issueCategory];
      for (const category of list) {
        categories.add(category);
      }
    }
    return Array.from(categories).sort((a, b) =>
      formatCategory(a).localeCompare(formatCategory(b))
    );
  }, [ticketsForFilterOptions, statusFilter]);

  useEffect(() => {
    if (statusFilter !== 'all' && !availableStatuses.includes(statusFilter as TicketStatus)) {
      setStatusFilter('all');
    }
  }, [availableStatuses, statusFilter]);

  useEffect(() => {
    if (
      categoryFilter !== 'all' &&
      !availableCategories.includes(categoryFilter as IssueCategory)
    ) {
      setCategoryFilter('all');
    }
  }, [availableCategories, categoryFilter]);

  // Overview cards/charts and the tickets table share the same visible set,
  // newest created_at first.
  const listTickets = useMemo(
    () =>
      [...filteredTickets].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
    [filteredTickets]
  );

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    resourceIdFilter,
    filterDateRange,
    statusFilter,
    categoryFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(listTickets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return listTickets.slice(start, start + PAGE_SIZE);
  }, [listTickets, currentPage]);

  const pageStart = listTickets.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, listTickets.length);

  const overviewStats = useMemo(
    () => CombinedTicketsService.buildOverviewStats(listTickets),
    [listTickets]
  );

  const categoryChartData = useMemo(() => {
    const total = Object.values(overviewStats.byCategory).reduce((sum, n) => sum + n, 0);
    return Object.entries(overviewStats.byCategory)
      .map(([categoryKey, count]) => ({
        categoryKey,
        category: formatCategory(categoryKey),
        count,
        percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [overviewStats.byCategory]);

  const createdByDateChartData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ticket of listTickets) {
      const created = ticket.createdAt;
      if (!created || Number.isNaN(new Date(created).getTime())) continue;
      const key = format(new Date(created), 'yyyy-MM-dd');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, count]) => ({
        dateKey,
        date: format(new Date(`${dateKey}T00:00:00`), 'dd MMM yyyy'),
        count,
      }));
  }, [listTickets]);

  const peakCreatedDate = useMemo(() => {
    if (createdByDateChartData.length === 0) return null;
    return createdByDateChartData.reduce((best, row) =>
      row.count > best.count ? row : best
    );
  }, [createdByDateChartData]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    resourceIdFilter.length > 0 ||
    Boolean(filterDateRange?.from && !isDefaultDateRange(filterDateRange)) ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setResourceIdFilter([]);
    setFilterDateRange(getDefaultDateRange());
    setStatusFilter('all');
    setCategoryFilter('all');
    setPage(1);
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const days = getInclusiveDayCount(range.from, range.to);
      if (days > MAX_DATE_RANGE_DAYS) {
        toast.error(
          `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days. You selected ${days} days.`
        );
        return;
      }
    }
    setFilterDateRange(range);
  };

  const isDateOutsideAllowedRange = (date: Date): boolean => {
    const anchor = filterDateRange?.from;
    if (!anchor) return false;
    return Math.abs(differenceInCalendarDays(date, anchor)) > MAX_DATE_RANGE_DAYS;
  };

  const handleViewTicket = async (ticket: CombinedTicketRow) => {
    if (isOpeningView) return;

    if (ticket.source === 'other_tickets') {
      setSelectedOtherTicket(ticket);
      setShowOtherTicketDetails(true);
      return;
    }

    setIsOpeningView(true);
    try {
      const issue = await TicketService.getTicketByNumber(ticket.ticketNumber);
      if (!issue) {
        toast.error('Portal ticket details could not be loaded.');
        return;
      }
      setSelectedPortalTicket(issue);
      setShowPortalTicketDetails(true);
    } catch (err) {
      console.error('[CombinedTicketsDashboard] Failed to open portal ticket:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to open ticket details');
    } finally {
      setIsOpeningView(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/super-admin');
  };

  if (authLoading) {
    return <div className="text-center mt-8">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/super-admin" replace />;
  }

  // Same unauthorized destination pattern as TicketAdminPage (role-gated pages).
  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const renderFiltersCard = (options?: { includeSearchAndResourceId?: boolean }) => {
    const includeSearchAndResourceId = options?.includeSearchAndResourceId ?? true;

    return (
    <Card className="border-l-4 border-l-blue-500 bg-muted/50">
      <CardContent className="p-4">
        <div
          className={cn(
            'grid gap-3 items-end',
            includeSearchAndResourceId
              ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-5'
              : 'grid-cols-1 md:grid-cols-3'
          )}
        >
          {includeSearchAndResourceId && (
            <>
              <div className="min-w-0">
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ticket #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="text-sm font-medium mb-2 block">
                  Resource ID{' '}
                  {resourceIdFilter.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {resourceIdFilter.length} selected
                    </Badge>
                  )}
                </label>
                <MultiSelect
                  selected={resourceIdFilter}
                  onChange={setResourceIdFilter}
                  placeholder="Resource IDs..."
                  className="w-full"
                />
              </div>
            </>
          )}

          <div className="min-w-0">
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-11',
                    !filterDateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {filterDateRange?.from ? (
                      filterDateRange.to ? (
                        <>
                          {format(filterDateRange.from, 'LLL dd, y')} -{' '}
                          {format(filterDateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(filterDateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      'Pick a date range'
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filterDateRange?.from}
                  selected={filterDateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  disabled={isDateOutsideAllowedRange}
                  classNames={{
                    day_disabled:
                      'bg-red-100 text-red-400 opacity-100 hover:bg-red-100 hover:text-red-400 cursor-not-allowed',
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="min-w-0">
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getSuperAdminStatusFilterLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <label className="text-sm font-medium mb-2 block">Category</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {formatCategory(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters}>
            Clear Filters
          </Button>
          <Button variant="outline" onClick={loadTickets} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={handleLogout} panelName="Ticket Center" />

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-4 md:space-y-6">
          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4 flex items-start gap-3 text-destructive">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-medium">Could not load Ticket Center data</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={loadTickets}>
                    Try again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-2 p-2 bg-muted rounded-xl border shadow-md my-4 md:gap-0 md:p-1">
              <TabsTrigger
                value="overview"
                className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="tickets"
                className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center"
              >
                All Tickets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {renderFiltersCard({ includeSearchAndResourceId: false })}

              {isLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading tickets...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <AlertCircle className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="text-2xl font-bold">{overviewStats.total}</div>
                      <div className="text-sm text-muted-foreground">Total Tickets</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                      </div>
                      <div className="text-2xl font-bold">
                        {overviewStats.byStatus.open || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Open</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Clock className="h-8 w-8 text-yellow-500" />
                      </div>
                      <div className="text-2xl font-bold">
                        {overviewStats.byStatus.in_progress || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Pending on CX</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Settings className="h-8 w-8 text-purple-500" />
                      </div>
                      <div className="text-2xl font-bold">
                        {(overviewStats.byStatus.user_dependency || 0) +
                          (overviewStats.byStatus.ops_input_required || 0) +
                          (overviewStats.byStatus.ops_user_dependency || 0) +
                          (overviewStats.byStatus.send_for_approval || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Pending Actions</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <div>User: {overviewStats.byStatus.user_dependency || 0}</div>
                        <div>Ops: {overviewStats.byStatus.ops_input_required || 0}</div>
                        <div>Ops + User: {overviewStats.byStatus.ops_user_dependency || 0}</div>
                        <div>Approver: {overviewStats.byStatus.send_for_approval || 0}</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold">
                        {overviewStats.byStatus.approved || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Approved</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <CheckCircle className="h-8 w-8 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-bold">
                        {overviewStats.byStatus.resolved || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Closed</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!isLoading && (
                <div className="grid grid-cols-1 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Tickets by Category</CardTitle>
                      <p className="text-sm text-muted-foreground font-normal">
                        Count of tickets per category
                      </p>
                    </CardHeader>
                    <CardContent>
                      {categoryChartData.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-12">
                          No category data for the current filters.
                        </p>
                      ) : (
                        <div
                          className="w-full"
                          style={{
                            height: Math.max(360, categoryChartData.length * 36 + 48),
                          }}
                        >
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={categoryChartData}
                              layout="vertical"
                              margin={{
                                top: 8,
                                right: isMobile ? 8 : 56,
                                left: isMobile ? 0 : 16,
                                bottom: isMobile ? 24 : 36,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis
                                type="number"
                                allowDecimals={false}
                                label={{
                                  value: 'Number of Tickets',
                                  position: 'insideBottom',
                                  offset: -20,
                                  style: { fontSize: 12, fill: '#64748b' },
                                }}
                              />
                              <YAxis
                                type="category"
                                dataKey="category"
                                width={isMobile ? 80 : 170}
                                tick={{ fontSize: isMobile ? 10 : 12 }}
                                tickFormatter={(value: string) =>
                                  isMobile && value.length > 12 ? `${value.slice(0, 11)}…` : value
                                }
                                label={
                                  isMobile
                                    ? undefined
                                    : {
                                        value: 'Category',
                                        angle: -90,
                                        position: 'insideLeft',
                                        offset: -4,
                                        style: { fontSize: 12, fill: '#64748b', textAnchor: 'middle' },
                                      }
                                }
                              />
                              <Tooltip
                                formatter={(value: number, _name, item) => {
                                  const percent = item?.payload?.percent ?? 0;
                                  return [`${value} (${percent}%)`, 'Tickets'];
                                }}
                              />
                              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
                                {categoryChartData.map((entry, index) => (
                                  <Cell
                                    key={entry.categoryKey}
                                    fill={getCategoryColor(entry.categoryKey, index)}
                                  />
                                ))}
                                <LabelList
                                  dataKey="count"
                                  position="right"
                                  className="fill-foreground text-xs"
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tickets Created by Date</CardTitle>
                      {peakCreatedDate && (
                        <p className="text-sm text-muted-foreground font-normal">
                          Peak: {peakCreatedDate.date} ({peakCreatedDate.count} tickets)
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {createdByDateChartData.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-12">
                          No created-date data for the current filters.
                        </p>
                      ) : (
                        <div className="w-full h-[360px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={createdByDateChartData}
                              margin={{ top: 8, right: 24, left: 16, bottom: 36 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11 }}
                                interval="preserveStartEnd"
                                minTickGap={24}
                                label={{
                                  value: 'Created Date',
                                  position: 'insideBottom',
                                  offset: -20,
                                  style: { fontSize: 12, fill: '#64748b' },
                                }}
                              />
                              <YAxis
                                allowDecimals={false}
                                label={{
                                  value: 'Number of Tickets',
                                  angle: -90,
                                  position: 'insideLeft',
                                  offset: -4,
                                  style: { fontSize: 12, fill: '#64748b', textAnchor: 'middle' },
                                }}
                              />
                              <Tooltip
                                formatter={(value: number) => [value, 'Tickets']}
                                labelFormatter={(label) => String(label)}
                              />
                              <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tickets" className="space-y-6">
              {renderFiltersCard({ includeSearchAndResourceId: true })}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Tickets ({listTickets.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-8 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                        <span>Loading tickets...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Phones get one card per ticket; the 6-column table only fits from md up. */}
                      <div className="space-y-3 p-3 md:hidden">
                        {paginatedTickets.length === 0 ? (
                          <p className="py-8 text-center text-sm text-muted-foreground">
                            {allTickets.length === 0
                              ? 'No tickets found. Portal tickets will appear here; other tickets appear after data is loaded into other_tickets.'
                              : 'No tickets match the current filters.'}
                          </p>
                        ) : (
                          paginatedTickets.map((ticket) => (
                            <div
                              key={`${ticket.source}-${ticket.id}-card`}
                              className="rounded-lg border p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="whitespace-nowrap font-mono text-sm font-semibold">
                                    {ticket.ticketNumber}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1">
                                    <Badge variant="outline" className="text-[10px]">
                                      {formatCategory(ticket.issueCategory).toUpperCase()}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {ticket.createdAt
                                        ? format(new Date(ticket.createdAt), 'dd MMM yyyy')
                                        : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0"
                                  onClick={() => void handleViewTicket(ticket)}
                                  disabled={isOpeningView}
                                  aria-label={`View ${ticket.ticketNumber}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm">
                                {ticket.description || '—'}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'mt-2 text-xs font-medium',
                                  getStatusBadgeClass(ticket.status)
                                )}
                              >
                                {getStatusLabel(ticket.status)}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ticket #</TableHead>
                              <TableHead>Issue Type</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {listTickets.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                  {allTickets.length === 0
                                    ? 'No tickets found. Portal tickets will appear here; other tickets appear after data is loaded into other_tickets.'
                                    : 'No tickets match the current filters.'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              paginatedTickets.map((ticket) => (
                                <TableRow key={`${ticket.source}-${ticket.id}`}>
                                  <TableCell className="font-medium">
                                    {ticket.ticketNumber}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {formatCategory(ticket.issueCategory).toUpperCase()}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate" title={ticket.description}>
                                    {ticket.description || '—'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn('text-xs font-medium', getStatusBadgeClass(ticket.status))}
                                    >
                                      {getStatusLabel(ticket.status)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {ticket.createdAt
                                      ? format(new Date(ticket.createdAt), 'dd MMM yyyy HH:mm:ss')
                                      : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => void handleViewTicket(ticket)}
                                      disabled={isOpeningView}
                                      title="View"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="sr-only">View</span>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {!isLoading && listTickets.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    Showing {pageStart}–{pageEnd} of {listTickets.length} tickets
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Prev
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t bg-muted/50 py-4 md:py-6 mt-8 md:mt-12">
        <div className="container mx-auto px-4 text-center text-xs md:text-sm text-muted-foreground">
          <p>© 2025 Awign Enterprises Pvt. Ltd.</p>
          <p className="mt-1">Escalation Management System for TCS Examination Operations.</p>
        </div>
      </footer>

      <TicketDetailsModal
        isOpen={showPortalTicketDetails}
        onClose={() => {
          setShowPortalTicketDetails(false);
          setSelectedPortalTicket(null);
        }}
        ticket={selectedPortalTicket}
        onTicketUpdate={() => {
          void loadTickets();
        }}
        hideHeaderActionsAndBadges
      />

      <OtherTicketDetailsModal
        isOpen={showOtherTicketDetails}
        onClose={() => {
          setShowOtherTicketDetails(false);
          setSelectedOtherTicket(null);
        }}
        ticket={selectedOtherTicket}
      />
    </div>
  );
};

export default CombinedTicketsDashboardPage;
