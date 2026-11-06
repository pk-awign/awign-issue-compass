import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/navigation/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, AlertCircle, CheckCircle, Clock, TrendingUp, Settings, Search, Filter, Eye, UserPlus, RefreshCw, FileText, Trash2, MessageSquare, User, CheckCircle2, Send, Download, X, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Issue } from '@/types/issue';
import { AdminService, TicketAnalytics, TicketSortBy, TicketSortDir } from '@/services/adminService';
import { AnalyticsDateFilter } from '@/components/admin/AnalyticsDateFilter';
import { DateRangePresetId } from '@/utils/dateRangePresets';
import { exportTicketsAsCSV, generateExportFilename } from '@/utils/ticketExport';
import { UserManagementPanel } from '@/components/admin/UserManagementPanel';
import { TicketDetailsModal } from '@/components/admin/TicketDetailsModal';
import { AdvancedAnalytics } from '@/components/admin/AdvancedAnalytics';
import { EnhancedUserAssignment } from '@/components/admin/EnhancedUserAssignment';
import { WhatsAppTestComponent } from '@/components/admin/WhatsAppTestComponent';
import { ActivityLog } from '@/components/admin/ActivityLog';
import { addDays, format } from "date-fns";
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multi-select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getStatusLabel } from '@/utils/status';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type IssueWithAssignees = Issue & { assignees?: { user_id: string; role: string }[] };

const OVERVIEW_CATEGORY_COLORS: Record<string, string> = {
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

const OVERVIEW_CATEGORY_COLOR_FALLBACK = [
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

function getOverviewCategoryColor(categoryKey: string, index: number): string {
  return (
    OVERVIEW_CATEGORY_COLORS[categoryKey] ||
    OVERVIEW_CATEGORY_COLOR_FALLBACK[index % OVERVIEW_CATEGORY_COLOR_FALLBACK.length]
  );
}

function formatOverviewCategory(category: string): string {
  if (category === 'noc') return 'NOC';
  if (category === 'posh') return 'POSH';
  if (category === 'workplace_misconduct') return 'Workplace Misconduct';
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Tab strip styling shared by every trigger.
 *
 * The strip never scrolls or hides a tab: it is a grid at every width, so all
 * seven sections stay visible and tappable. Labels stay on one line thanks to
 * the column counts (2 on phones, 4 on tablets, 7 from lg up) chosen so the
 * longest label ("User Management") fits its cell.
 */
const tabTriggerClass =
  "w-full whitespace-nowrap rounded-lg px-2 py-2 text-center data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow lg:px-3";

export const AdminPage: React.FC = () => {
  const { user, logout, loading, isTicketAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  
  // Get the tab parameter from URL
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'tickets' ? 'tickets' : 'overview';
  
  // State management
  const [tickets, setTickets] = useState<Issue[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Issue[]>([]);
  const [allFilteredTickets, setAllFilteredTickets] = useState<Issue[]>([]); // Store all filtered tickets for dropdown calculations
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [analytics, setAnalytics] = useState<TicketAnalytics | null>(null);
  const [resolverFilterSingle, setResolverFilterSingle] = useState<string>('all');
  const [resolverFilter, setResolverFilter] = useState<string[]>([]);
  const [resolvers, setResolvers] = useState<{ id: string; name: string }[]>([]);
  const [approvers, setApprovers] = useState<{ id: string; name: string }[]>([]);
  const [approverFilter, setApproverFilter] = useState<string[]>([]);
  const [resourceIdFilter, setResourceIdFilter] = useState<string[]>([]);
  const [resourceIds, setResourceIds] = useState<{ value: string; label: string }[]>([]);
  
  // Modal states
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Issue | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [viewAllTickets, setViewAllTickets] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadType, setDownloadType] = useState<'all' | 'detailed' | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();
  const [onlyUnassignedResolver, setOnlyUnassignedResolver] = useState<boolean>(false);
  const [downloadAll, setDownloadAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastStatusFilter, setLastStatusFilter] = useState('all');
  const [lastCommentByInvigilator, setLastCommentByInvigilator] = useState(false);
  const [sortBy, setSortBy] = useState<TicketSortBy>('created');
  const [sortDir, setSortDir] = useState<TicketSortDir>('desc');
  const [analyticsIncludeArchived, setAnalyticsIncludeArchived] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] = useState<DateRange | undefined>();
  const [analyticsDatePreset, setAnalyticsDatePreset] = useState<DateRangePresetId>('all');
  // All Tickets filters: collapsed on phones so the table is reachable without
  // scrolling past eight stacked controls. Always open from md up.
  const [ticketFiltersOpen, setTicketFiltersOpen] = useState(false);
  
  // Track which tabs have been loaded to avoid reloading
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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

  // Pagination states
  const [page, setPage] = useState(1);
  const limit = 50;
  const [hasMore, setHasMore] = useState(false);
  const [totalTickets, setTotalTickets] = useState(0);

  // Update active tab when URL changes
  useEffect(() => {
    const newTabParam = searchParams.get('tab');
    const newDefaultTab = newTabParam === 'tickets' ? 'tickets' : 'overview';
    setActiveTab(newDefaultTab);
    // console.log('🔄 URL changed, setting active tab to:', newDefaultTab);
  }, [searchParams]);

  // Handle tab changes and update URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === 'tickets') {
      navigate('/admin?tab=tickets', { replace: true });
    } else {
      navigate('/admin', { replace: true });
    }
  };

  // Initialize sample users only (no data loading)
  useEffect(() => {
    const initUsers = async () => {
      try {
        await AdminService.initializeSampleUsers();
      } catch (error) {
        console.error('❌ Error initializing sample users:', error);
      }
    };
    initUsers();
  }, []);
  
  // Lazy load data based on active tab
  useEffect(() => {
    // Skip if tab already loaded
    if (loadedTabs.has(activeTab)) {
      return;
    }
    
    switch (activeTab) {
      case 'overview':
        loadAnalytics();
        setLoadedTabs(prev => new Set(prev).add('overview'));
        break;
      case 'tickets':
        loadTickets(true);
        setLoadedTabs(prev => new Set(prev).add('tickets'));
        break;
      case 'analytics':
        loadAnalytics();
        setLoadedTabs(prev => new Set(prev).add('analytics'));
        break;
      case 'users':
        // UserManagementPanel handles its own data loading
        setLoadedTabs(prev => new Set(prev).add('users'));
        break;
      case 'whatsapp':
        // WhatsAppTestComponent handles its own data loading
        setLoadedTabs(prev => new Set(prev).add('whatsapp'));
        break;
      case 'activity':
        // ActivityLog component handles its own data loading
        setLoadedTabs(prev => new Set(prev).add('activity'));
        break;
      case 'settings':
        // Settings tab doesn't need data loading
        setLoadedTabs(prev => new Set(prev).add('settings'));
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  // Compute available resolver/approver IDs from the currently visible tickets
  const availableResolverIds = useMemo(() => {
    const ids = new Set<string>();
    filteredTickets.forEach(t => {
      getAllAssignees(t).forEach(a => {
        if (a.role === 'resolver') ids.add(a.user_id);
      });
    });
    return ids;
  }, [filteredTickets]);

  const availableApproverIds = useMemo(() => {
    const ids = new Set<string>();
    filteredTickets.forEach(t => {
      getAllAssignees(t).forEach(a => {
        if (a.role === 'approver') ids.add(a.user_id);
      });
    });
    return ids;
  }, [filteredTickets]);



  // Removed initializeSystem - data loading is now handled by tab-based lazy loading

  // Update loadTickets to support pagination and filtering
  const loadTickets = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      let result;
      
      if (isTicketAdmin && user?.id) {
        // For ticket admin, only load assigned tickets
        const assignedTickets = await AdminService.getTicketsAssignedToAdmin(user.id, { sortBy, sortDir });
        result = {
          tickets: assignedTickets,
          total: assignedTickets.length,
          hasMore: false
        };
      } else {
        // For super admin, load all tickets with filters
        const hasFilters = searchQuery || statusFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all' || cityFilter !== 'all' || resolverFilter.length > 0 || approverFilter.length > 0 || resourceIdFilter.length > 0 || filterDateRange?.from || lastStatusFilter !== 'all' || lastCommentByInvigilator;
        
        if (hasFilters || onlyUnassignedResolver) {
          // Use unpaginated method when filters are applied to get ALL matching tickets
          const allFilteredTickets = await AdminService.getFilteredTicketsUnpaginated({
            searchQuery,
            statusFilter,
            severityFilter,
            categoryFilter,
            cityFilter,
            resolverFilter,
            approverFilter,
            resourceIdFilter,
            dateRange: filterDateRange,
            onlyUnassignedResolver,
            lastStatusFilter,
            lastCommentByInvigilator,
            showDeleted,
            archiveStatus: viewAllTickets ? undefined : false,
            sortBy,
            sortDir,
          });
          
          // Store all filtered tickets for dropdown calculations
          setAllFilteredTickets(allFilteredTickets);
          
          // Apply client-side pagination
          const startIndex = (reset ? 0 : (page - 1) * limit);
          const endIndex = startIndex + limit;
          const paginatedTickets = allFilteredTickets.slice(startIndex, endIndex);
          
          result = {
            tickets: paginatedTickets,
            total: allFilteredTickets.length,
            hasMore: endIndex < allFilteredTickets.length
          };
        } else {
          result = await AdminService.getAllTickets(showDeleted, reset ? 1 : page, limit, {
            archiveStatus: viewAllTickets ? undefined : false,
            sortBy,
            sortDir,
          });

          if (reset) {
            const allTickets = await AdminService.getAllTicketsUnpaginated({
              showDeleted,
              archiveStatus: viewAllTickets ? undefined : false,
              sortBy,
              sortDir,
            });
            setAllFilteredTickets(allTickets);
          }
        }
      }
      
      const { tickets: newTickets, total, hasMore: more } = result;
      setTotalTickets(total);
      setHasMore(more);
      if (reset) {
        setTickets(newTickets);
        setFilteredTickets(newTickets);
        setPage(1);
      } else {
        setTickets(prev => {
          const merged = [...prev, ...newTickets].filter(
            (ticket, index, self) => index === self.findIndex(t => t.id === ticket.id)
          );
          return merged;
        });
        setFilteredTickets(prev => {
          const merged = [...prev, ...newTickets].filter(
            (ticket, index, self) => index === self.findIndex(t => t.id === ticket.id)
          );
          return merged;
        });
      }
    } catch (error) {
      console.error('❌ Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  }, [showDeleted, viewAllTickets, page, searchQuery, statusFilter, severityFilter, categoryFilter, cityFilter, resolverFilter, approverFilter, resourceIdFilter, filterDateRange, onlyUnassignedResolver, lastStatusFilter, lastCommentByInvigilator, sortBy, sortDir, isTicketAdmin, user?.id]);

  // On initial load and when filters/search change, reset pagination and fetch fresh data
  // Only reload if tickets tab is active and loaded
  useEffect(() => {
    if (activeTab === 'tickets' && loadedTabs.has('tickets')) {
      // Reset pagination and fetch fresh data when filters change
      setPage(1);
      setTickets([]);
      setFilteredTickets([]);
      loadTickets(true);
    }
    // eslint-disable-next-line
  }, [showDeleted, viewAllTickets, searchQuery, statusFilter, severityFilter, categoryFilter, cityFilter, resolverFilter, approverFilter, resourceIdFilter, filterDateRange, onlyUnassignedResolver, lastStatusFilter, lastCommentByInvigilator, sortBy, sortDir, activeTab, loadedTabs]);

  // Fetch resolvers/approvers for filter dropdowns (only when tickets tab is active)
  useEffect(() => {
    if (activeTab === 'tickets' && loadedTabs.has('tickets')) {
      const fetchResolvers = async () => {
        const users = await AdminService.getUsersByRole('resolver');
        setResolvers(users.map(u => ({ id: u.id, name: u.name })));
      };
      const fetchApprovers = async () => {
        const users = await AdminService.getUsersByRole('approver');
        // Show only active approvers in filters
        setApprovers(users.filter(u => u.isActive).map(u => ({ id: u.id, name: u.name })));
      };
      fetchResolvers();
      fetchApprovers();
    }
  }, [activeTab, loadedTabs]);

  // Fix handleLoadMore to be a no-arg function
  const handleLoadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  // Clear filters function
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setCategoryFilter('all');
    setCityFilter('all');
    setResolverFilter([]);
    setApproverFilter([]);
    setResourceIdFilter([]);
    setFilterDateRange(undefined);
    setOnlyUnassignedResolver(false);
    setLastStatusFilter('all');
    setLastCommentByInvigilator(false);
    setAllFilteredTickets([]); // Clear all filtered tickets
  };

  // Client-side filtering for new filters that require comment data
  const finalFilteredTickets = useMemo(() => {
    let filtered = [...tickets];

    // Apply lastStatusFilter
    if (lastStatusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === lastStatusFilter);
    }

    // Apply lastCommentByInvigilator filter
    if (lastCommentByInvigilator) {
      filtered = filtered.filter(ticket => {
        return ticket.comments && ticket.comments.length > 0 && ticket.comments[0].isFromInvigilator;
      });
    }

    return filtered;
  }, [tickets, lastStatusFilter, lastCommentByInvigilator]);

  // Update filteredTickets whenever finalFilteredTickets changes
  useEffect(() => {
    setFilteredTickets(finalFilteredTickets);
  }, [finalFilteredTickets]);

  // Check if there are active filters
  const activeTicketFiltersCount = [
    Boolean(searchQuery.trim()),
    statusFilter !== 'all',
    severityFilter !== 'all',
    categoryFilter !== 'all',
    cityFilter !== 'all',
    resolverFilter.length > 0,
    approverFilter.length > 0,
    resourceIdFilter.length > 0,
    Boolean(filterDateRange?.from),
    onlyUnassignedResolver,
    lastStatusFilter !== 'all',
    lastCommentByInvigilator,
  ].filter(Boolean).length;
  const hasActiveFilters = activeTicketFiltersCount > 0;

  // When page changes (and not reset), load next page
  useEffect(() => {
    if (page > 1) {
      loadTickets();
    }
    // eslint-disable-next-line
  }, [page]);

  const loadAnalytics = useCallback(async () => {
    setIsLoadingAnalytics(true);
    try {
      const analyticsOptions = {
        includeArchived: analyticsIncludeArchived,
        dateRange: analyticsDateRange?.from
          ? { from: analyticsDateRange.from, to: analyticsDateRange.to }
          : undefined,
      };
      let data;
      if (isTicketAdmin && user?.id) {
        // For ticket admin, load filtered analytics
        data = await AdminService.getTicketAnalyticsForAdmin(user.id, analyticsOptions);
      } else {
        // For super admin, load all analytics
        data = await AdminService.getTicketAnalytics(analyticsOptions);
      }
      setAnalytics(data);
      // console.log('📊 Analytics refreshed:', data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [analyticsIncludeArchived, analyticsDateRange, isTicketAdmin, user?.id]);

  // Refresh analytics when overview/analytics filters change
  useEffect(() => {
    if ((activeTab === 'analytics' || activeTab === 'overview') && loadedTabs.has(activeTab)) {
      loadAnalytics();
    }
  }, [analyticsIncludeArchived, analyticsDateRange, activeTab, loadedTabs, loadAnalytics]);

  const overviewCategoryChartData = useMemo(() => {
    const rows = analytics?.categoryBreakdown ?? [];
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return rows.map((row) => ({
      categoryKey: row.category,
      category: formatOverviewCategory(row.category),
      count: row.count,
      percent: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0,
    }));
  }, [analytics?.categoryBreakdown]);

  const overviewCreatedByDateChartData = useMemo(() => {
    return (analytics?.createdByDate ?? []).map((row) => ({
      dateKey: row.date,
      date: format(new Date(`${row.date}T00:00:00`), 'dd MMM yyyy'),
      count: row.count,
    }));
  }, [analytics?.createdByDate]);

  const overviewPeakCreatedDate = useMemo(() => {
    if (overviewCreatedByDateChartData.length === 0) return null;
    return overviewCreatedByDateChartData.reduce((best, row) =>
      row.count > best.count ? row : best
    );
  }, [overviewCreatedByDateChartData]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleTicketSelect = (ticketId: string, checked: boolean) => {
    if (checked) {
      setSelectedTickets([...selectedTickets, ticketId]);
    } else {
      setSelectedTickets(selectedTickets.filter(id => id !== ticketId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(filteredTickets.map(ticket => ticket.id));
    } else {
      setSelectedTickets([]);
    }
  };

  const handleViewTicket = (ticket: Issue) => {
    setSelectedTicket(ticket);
    setShowTicketDetails(true);
  };

  const handleAssignmentComplete = () => {
    setSelectedTickets([]);
    loadTickets();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'sev1': return 'destructive';
      case 'sev2': return 'default';
      case 'sev3': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'resolved': return 'secondary';
      case 'closed': return 'outline';
      default: return 'outline';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get unique cities for filter - use all available data, not just current page
  const uniqueCities = Array.from(new Set(allFilteredTickets.map(ticket => ticket.city)));

  // Get unique values for dynamic filters - use all available data, not just current page
  const uniqueSeverities = Array.from(new Set(allFilteredTickets.map(ticket => ticket.severity))).filter(Boolean);
  const uniqueCategories = Array.from(new Set(allFilteredTickets.map(ticket => ticket.issueCategory))).filter(Boolean);

  // Get unique resource IDs for filter - use all available data, not just current page
  useEffect(() => {
    const uniqueResourceIds = Array.from(new Set(allFilteredTickets.map(ticket => ticket.resourceId)))
      .filter(id => id && id.trim() !== '')
      .sort();
    
    setResourceIds(uniqueResourceIds.map(id => ({ value: id, label: id })));
  }, [allFilteredTickets]);

  // Calculate System Health metrics
  const calculateSLACompliance = () => {
    const resolvedTickets = tickets.filter(ticket => 
      ticket.status === 'resolved' && ticket.resolvedAt && ticket.submittedAt
    );
    
    if (resolvedTickets.length === 0) return 100; // If no resolved tickets, consider 100% compliance
    
    const now = new Date();
    const slaBreachedTickets = resolvedTickets.filter(ticket => {
      const submittedAt = new Date(ticket.submittedAt);
      const resolvedAt = new Date(ticket.resolvedAt);
      const resolutionTime = resolvedAt.getTime() - submittedAt.getTime();
      const resolutionHours = resolutionTime / (1000 * 60 * 60);
      
      // Define SLA based on severity
      let slaHours = 24; // Default SLA
      if (ticket.severity === 'sev1') slaHours = 4;  // 4 hours for SEV1
      if (ticket.severity === 'sev2') slaHours = 8;  // 8 hours for SEV2
      if (ticket.severity === 'sev3') slaHours = 24; // 24 hours for SEV3
      
      return resolutionHours > slaHours;
    });
    
    const complianceRate = ((resolvedTickets.length - slaBreachedTickets.length) / resolvedTickets.length) * 100;
    return Math.round(complianceRate);
  };

  const calculateAvgResolutionTime = () => {
    const resolvedTickets = tickets.filter(ticket => 
      ticket.status === 'resolved' && ticket.resolvedAt && ticket.submittedAt
    );
    
    if (resolvedTickets.length === 0) return 0;
    
    const totalResolutionTime = resolvedTickets.reduce((total, ticket) => {
      const submittedAt = new Date(ticket.submittedAt);
      const resolvedAt = new Date(ticket.resolvedAt);
      const resolutionTime = resolvedAt.getTime() - submittedAt.getTime();
      return total + resolutionTime;
    }, 0);
    
    const avgResolutionTimeHours = totalResolutionTime / (resolvedTickets.length * 1000 * 60 * 60);
    return Math.round(avgResolutionTimeHours * 10) / 10; // Round to 1 decimal place
  };

  const calculateActiveUsers = () => {
    // Count unique assigned resolvers
    const uniqueResolvers = new Set<string>();
    tickets.forEach(ticket => {
      if (ticket.assignedResolver) {
        uniqueResolvers.add(ticket.assignedResolver);
      }
    });
    return uniqueResolvers.size;
  };

  // Calculate System Health metrics
  const slaCompliance = calculateSLACompliance();
  const avgResolutionTime = calculateAvgResolutionTime();
  const activeUsers = calculateActiveUsers();

  const handleDeleteTicket = async (ticket: Issue) => {
    if (!window.confirm(`Are you sure you want to delete ticket ${ticket.ticketNumber}? This action cannot be undone and will delete all related data (comments, attachments, etc.).`)) {
      return;
    }

    setDeletingTicketId(ticket.id);
    try {
      const success = await AdminService.deleteTicket(ticket.id);
      if (success) {
        toast.success(`Ticket ${ticket.ticketNumber} deleted successfully`);
        loadTickets(); // Refresh the ticket list
      } else {
        toast.error('Failed to delete ticket');
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Failed to delete ticket');
    } finally {
      setDeletingTicketId(null);
    }
  };

  // Reload tickets whenever showDeleted changes
  useEffect(() => {
    loadTickets();
  }, [showDeleted]);

  function downloadTicketsAsCSV(ticketsToDownload: Issue[]) {
    if (!ticketsToDownload.length) {
        toast.info("No tickets found to download for the selected date range.");
        return;
    };
    const headers = [
      'Ticket Number', 'Centre Code', 'City', 'Resource ID', 'Issue Category', 'Description', 'Severity', 'Status', 'Submitted By', 'Submitted At', 'Issue Date', 'Deleted', 'Evidence Uploaded', 'Comments Added'
    ];
    const rows = ticketsToDownload.map(t => [
      t.ticketNumber,
      t.centreCode,
      t.city,
      t.resourceId,
      t.issueCategory,
      t.issueDescription,
      t.severity,
      t.status,
      t.submittedBy || '',
      t.submittedAt ? new Date(t.submittedAt).toISOString() : '',
      formatIssueDateForCSV(t.issueDate),
      t.deleted ? 'Yes' : 'No',
      t.attachments && t.attachments.length > 0 ? 'TRUE' : 'FALSE',
      t.comments && t.comments.length > 0 ? 'TRUE' : 'FALSE'
    ]);
    function formatIssueDateForCSV(issueDate: Issue['issueDate']): string {
      if (!issueDate) return '';
      if (issueDate.type === 'single') {
        return issueDate.dates && issueDate.dates[0] ? new Date(issueDate.dates[0] as string | number | Date).toISOString() : '';
      }
      if (issueDate.type === 'multiple') {
        return (issueDate.dates as any[])
          .map(d => {
            if (d && typeof d === 'object' && 'date' in d) {
              return new Date((d as { date: string | number | Date }).date).toISOString();
            } else {
              return new Date(d as string | number | Date).toISOString();
            }
          })
          .join('; ');
      }
      if (issueDate.type === 'range') {
        const start = issueDate.startDate ? new Date(issueDate.startDate as string | number | Date).toISOString() : '';
        const end = issueDate.endDate ? new Date(issueDate.endDate as string | number | Date).toISOString() : '';
        return start && end ? `${start} to ${end}` : start || end;
      }
      return '';
    }
    const csv = [headers, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tickets.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const downloadDetailedTickets = async (ticketsToDownload: Issue[]) => {
    if (!ticketsToDownload.length) {
        toast.info("No detailed tickets found to download for the selected date range.");
        return;
    }
    try {
      const rows: any[] = [];
      ticketsToDownload.forEach(ticket => {
        if (ticket.issueDate?.type === 'multiple' && Array.isArray(ticket.issueDate.dates)) {
          for (const d of ticket.issueDate.dates) {
            let dateObj: Date;
            let dateDescription = '';
            if (d && typeof d === 'object' && 'date' in d) {
              dateObj = new Date(d.date);
              dateDescription = d.description || '';
            } else {
              dateObj = new Date(d as string | number | Date);
            }
            // Convert UTC to IST (+5:30)
            const istDate = new Date(dateObj.getTime() + 5.5 * 60 * 60 * 1000);
            const istDateStr = istDate.toISOString().slice(0, 10);
            rows.push({
              derivedTicketNumber: `${ticket.ticketNumber}_${istDateStr}`,
              ticketNumber: ticket.ticketNumber,
              resourceId: ticket.resourceId,
              city: ticket.city,
              centreCode: ticket.centreCode,
              date: istDateStr,
              dateDescription,
              ticketDescription: ticket.issueDescription,
              issueCategory: ticket.issueCategory,
              submittedAt: ticket.submittedAt ? new Date(ticket.submittedAt).toLocaleString('en-IN') : ''
            });
          }
        } else if (ticket.issueDate?.type === 'single' && Array.isArray(ticket.issueDate.dates)) {
          const dateObj = ticket.issueDate.dates[0] ? new Date(ticket.issueDate.dates[0] as string | number | Date) : null;
          const istDate = dateObj ? new Date(dateObj.getTime() + 5.5 * 60 * 60 * 1000) : null;
          const istDateStr = istDate ? istDate.toISOString().slice(0, 10) : '';
          rows.push({
            derivedTicketNumber: `${ticket.ticketNumber}${istDateStr ? '_' + istDateStr : ''}`,
            ticketNumber: ticket.ticketNumber,
            resourceId: ticket.resourceId,
            city: ticket.city,
            centreCode: ticket.centreCode,
            date: istDateStr,
            dateDescription: '',
            ticketDescription: ticket.issueDescription,
            issueCategory: ticket.issueCategory,
            submittedAt: ticket.submittedAt ? new Date(ticket.submittedAt).toLocaleString('en-IN') : ''
          });
        } else {
          rows.push({
            derivedTicketNumber: ticket.ticketNumber,
            ticketNumber: ticket.ticketNumber,
            resourceId: ticket.resourceId,
            city: ticket.city,
            centreCode: ticket.centreCode,
            date: '',
            dateDescription: '',
            ticketDescription: ticket.issueDescription,
            issueCategory: ticket.issueCategory,
            submittedAt: ticket.submittedAt ? new Date(ticket.submittedAt).toLocaleString('en-IN') : ''
          });
        }
      });
      // Generate CSV
      const headers = [
        'Derived Ticket Number', 'Ticket Number', 'Resource ID', 'City', 'Center Code', 'Date (IST)', 'Date Description', 'Ticket Description', 'Issue Category', 'Submitted At'
      ];
      const csvRows = rows.map(row => [
        row.derivedTicketNumber,
        row.ticketNumber,
        row.resourceId,
        row.city,
        row.centreCode,
        row.date,
        row.dateDescription,
        row.ticketDescription,
        row.issueCategory,
        row.submittedAt
      ]);
      const csv = [headers, ...csvRows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'detailed_tickets.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download detailed tickets.');
    }
  }

  const openDownloadDialog = (type: 'all' | 'detailed') => {
    setDownloadType(type);
    setIsDownloadModalOpen(true);
  };

  const handleDownloadWithDateRange = async () => {
    if (!downloadType) return;
  
    setIsDownloading(true);
    setIsDownloadModalOpen(false);
  
    try {
      if (downloadType === 'all') {
        let allTickets;
        if (isTicketAdmin && user?.id) {
          // For ticket admin, only download assigned tickets
          allTickets = await AdminService.getTicketsAssignedToAdmin(user.id);
        } else {
          // For super admin, download all tickets
          allTickets = downloadAll
            ? await AdminService.getAllTicketsUnpaginated({ showDeleted })
            : await AdminService.getAllTicketsUnpaginated({ showDeleted, startDate: dateRange?.from, endDate: dateRange?.to });
        }
        downloadTicketsAsCSV(allTickets);
        toast.success(isTicketAdmin ? "Assigned tickets downloaded successfully!" : "All tickets downloaded successfully!");
      } else if (downloadType === 'detailed') {
        let allTickets;
        if (isTicketAdmin && user?.id) {
          // For ticket admin, only download assigned tickets
          allTickets = await AdminService.getTicketsAssignedToAdmin(user.id);
        } else {
          // For super admin, download all tickets
          allTickets = downloadAll
            ? await AdminService.getAllTicketsUnpaginated({ showDeleted })
            : await AdminService.getAllTicketsUnpaginated({ showDeleted, startDate: dateRange?.from, endDate: dateRange?.to });
        }
        downloadDetailedTickets(allTickets);
        toast.success(isTicketAdmin ? "Detailed assigned tickets downloaded successfully!" : "Detailed tickets downloaded successfully!");
      }
    } catch (error) {
      console.error(`Error downloading ${downloadType} tickets:`, error);
      toast.error(`Failed to download ${downloadType} tickets. Please try again.`);
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  const handleExportTickets = async () => {
    setIsExporting(true);
    try {
      // Create filters object for AdminService
      const filters = {
        searchQuery: searchQuery || undefined,
        statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
        severityFilter: severityFilter !== 'all' ? severityFilter : undefined,
        categoryFilter: categoryFilter !== 'all' ? categoryFilter : undefined,
        cityFilter: cityFilter !== 'all' ? cityFilter : undefined,
        resolverFilter: resolverFilter.length > 0 ? resolverFilter : undefined,
        approverFilter: approverFilter.length > 0 ? approverFilter : undefined,
        resourceIdFilter: resourceIdFilter.length > 0 ? resourceIdFilter : undefined,
        dateRange: filterDateRange?.from ? {
          from: filterDateRange.from,
          to: filterDateRange.to
        } : undefined,
        lastStatusFilter: lastStatusFilter !== 'all' ? lastStatusFilter : undefined,
        lastCommentByInvigilator: lastCommentByInvigilator || undefined,
        onlyUnassignedResolver: onlyUnassignedResolver || undefined
      };

      // Remove undefined values
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== undefined)
      ) as any;

      let allFilteredTickets: Issue[];
      
      if (isTicketAdmin && user?.id) {
        // For ticket admin, get assigned tickets with filters
        allFilteredTickets = await AdminService.getTicketsAssignedToAdmin(user.id);
        // Apply filters manually since getTicketsAssignedToAdmin doesn't support filters
        allFilteredTickets = allFilteredTickets.filter(ticket => {
          if (cleanFilters.statusFilter && typeof cleanFilters.statusFilter === 'string' && ticket.status !== cleanFilters.statusFilter) return false;
          if (cleanFilters.severityFilter && typeof cleanFilters.severityFilter === 'string' && ticket.severity !== cleanFilters.severityFilter) return false;
          if (cleanFilters.categoryFilter && typeof cleanFilters.categoryFilter === 'string' && ticket.issueCategory !== cleanFilters.categoryFilter) return false;
          if (cleanFilters.cityFilter && typeof cleanFilters.cityFilter === 'string' && ticket.city !== cleanFilters.cityFilter) return false;
          if (cleanFilters.searchQuery && typeof cleanFilters.searchQuery === 'string') {
            const searchLower = cleanFilters.searchQuery.toLowerCase();
            if (!ticket.ticketNumber.toLowerCase().includes(searchLower) &&
                !ticket.issueDescription.toLowerCase().includes(searchLower) &&
                !ticket.city.toLowerCase().includes(searchLower) &&
                !ticket.centreCode.toLowerCase().includes(searchLower)) {
              return false;
            }
          }
          if (cleanFilters.dateRange && typeof cleanFilters.dateRange === 'object' && cleanFilters.dateRange.from && ticket.submittedAt < cleanFilters.dateRange.from) return false;
          if (cleanFilters.dateRange && typeof cleanFilters.dateRange === 'object' && cleanFilters.dateRange.to && ticket.submittedAt > cleanFilters.dateRange.to) return false;
          if (cleanFilters.lastStatusFilter && typeof cleanFilters.lastStatusFilter === 'string' && ticket.status !== cleanFilters.lastStatusFilter) return false;
          if (cleanFilters.lastCommentByInvigilator && typeof cleanFilters.lastCommentByInvigilator === 'boolean' && cleanFilters.lastCommentByInvigilator && (!ticket.comments || ticket.comments.length === 0 || !ticket.comments[0].isFromInvigilator)) return false;
          if (cleanFilters.onlyUnassignedResolver && typeof cleanFilters.onlyUnassignedResolver === 'boolean' && cleanFilters.onlyUnassignedResolver && getAllAssignees(ticket).some(a => a.role === 'resolver')) return false;
          if (cleanFilters.resolverFilter && Array.isArray(cleanFilters.resolverFilter) && cleanFilters.resolverFilter.length > 0) {
            const ticketResolverIds = getAllAssignees(ticket).filter(a => a.role === 'resolver').map(a => a.user_id);
            if (!ticketResolverIds.some(id => cleanFilters.resolverFilter.includes(id))) return false;
          }
          return true;
        });
      } else {
        // For super admin, use the filtered tickets method
        allFilteredTickets = await AdminService.getFilteredTicketsUnpaginated(cleanFilters);
      }

      if (!allFilteredTickets.length) {
        toast.info('No tickets found matching the applied filters');
        return;
      }

      const filename = generateExportFilename('admin_tickets', {
        statusFilter,
        severityFilter,
        categoryFilter,
        cityFilter,
        searchTerm: searchQuery
      });
      
      exportTicketsAsCSV(allFilteredTickets, filename);
      toast.success(`Exported ${allFilteredTickets.length} tickets successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export tickets. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Place the early return after all hooks
  if (loading) {
    return <div style={{textAlign: 'center', marginTop: '2rem'}}>Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={handleLogout} panelName="Admin Panel" />

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-4 md:space-y-6">
          <div className="text-center space-y-2 md:space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold"></h2>
            <p className="text-muted-foreground"></p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList
              className={`my-4 grid w-full grid-cols-2 gap-1.5 rounded-xl border bg-muted p-1.5 shadow-md md:gap-0 md:p-1 ${
                isTicketAdmin ? 'md:grid-cols-3' : 'md:grid-cols-4 lg:grid-cols-7'
              }`}
            >
              <TabsTrigger value="overview" className={tabTriggerClass}>Overview</TabsTrigger>
              <TabsTrigger value="tickets" className={tabTriggerClass}>
                {isTicketAdmin ? 'Assigned Tickets' : 'All Tickets'}
              </TabsTrigger>
              <TabsTrigger value="analytics" className={tabTriggerClass}>Analytics</TabsTrigger>
              {!isTicketAdmin && (
                <>
                  <TabsTrigger value="users" className={tabTriggerClass}>User Management</TabsTrigger>
                  <TabsTrigger value="whatsapp" className={tabTriggerClass}>WhatsApp</TabsTrigger>
                  <TabsTrigger value="activity" className={tabTriggerClass}>Activity Log</TabsTrigger>
                  <TabsTrigger value="settings" className={tabTriggerClass}>Settings</TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <AnalyticsDateFilter
                dateRange={analyticsDateRange}
                onDateRangeChange={setAnalyticsDateRange}
                preset={analyticsDatePreset}
                onPresetChange={setAnalyticsDatePreset}
                includeArchived={analyticsIncludeArchived}
                onIncludeArchivedChange={setAnalyticsIncludeArchived}
                idPrefix="overview"
              />

              {isLoadingAnalytics ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading analytics...</p>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <AlertCircle className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics ? analytics.totalTickets : '-'}</div>
                    <div className="text-sm text-muted-foreground">Total Tickets</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics ? analytics.openTickets : '-'}</div>
                    <div className="text-sm text-muted-foreground">Open</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics ? analytics.inProgressTickets : '-'}</div>
                    <div className="text-sm text-muted-foreground">Pending on CX</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Settings className="h-8 w-8 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {(analytics ? analytics.userDependencyTickets : 0) + 
                       (analytics ? analytics.opsInputRequiredTickets : 0) + 
                       (analytics ? analytics.opsUserDependencyTickets : 0) + 
                       (analytics ? analytics.sendForApprovalTickets : 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending Actions</div>
                    {analytics && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <div>User: {analytics.userDependencyTickets}</div>
                        <div>Ops: {analytics.opsInputRequiredTickets}</div>
                        <div>Ops + User: {analytics.opsUserDependencyTickets}</div>
                        <div>Approver: {analytics.sendForApprovalTickets}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics ? analytics.approvedTickets : '-'}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics ? analytics.resolvedTickets : '-'}</div>
                    <div className="text-sm text-muted-foreground">Closed</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tickets by Category</CardTitle>
                    <p className="text-sm text-muted-foreground font-normal">
                      Count of tickets per category
                    </p>
                  </CardHeader>
                  <CardContent>
                    {overviewCategoryChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">
                        No category data for the current filters.
                      </p>
                    ) : (
                      <div
                        className="w-full"
                        style={{
                          height: Math.max(360, overviewCategoryChartData.length * 36 + 48),
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={overviewCategoryChartData}
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
                              {overviewCategoryChartData.map((entry, index) => (
                                <Cell
                                  key={entry.categoryKey}
                                  fill={getOverviewCategoryColor(entry.categoryKey, index)}
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
                    {overviewPeakCreatedDate && (
                      <p className="text-sm text-muted-foreground font-normal">
                        Peak: {overviewPeakCreatedDate.date} ({overviewPeakCreatedDate.count} tickets)
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {overviewCreatedByDateChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">
                        No created-date data for the current filters.
                      </p>
                    ) : (
                      <div className="w-full h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={overviewCreatedByDateChartData}
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

              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      onClick={() => handleTabChange('users')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Manage Users
                    </Button>
                    <Button 
                      onClick={() => loadTickets(true)}
                      className="w-full justify-start" 
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </Button>
                    <Button 
                      onClick={() => handleTabChange('tickets')}
                      className="w-full justify-start" 
                      variant="outline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Tickets
                    </Button>
                    <Button 
                      onClick={() => handleTabChange('whatsapp')}
                      className="w-full justify-start" 
                      variant="outline"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      WhatsApp Test
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        onClick={() => navigate('/super-admin/all-tickets')}
                        className="w-full justify-start"
                        variant="outline"
                      >
                        <Ticket className="h-4 w-4 mr-2" />
                        Ticket Center
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>New tickets today</span>
                        <Badge variant="secondary">
                          {tickets.filter(t => 
                            new Date(t.submittedAt).toDateString() === new Date().toDateString()
                          ).length}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Resolved today</span>
                        <Badge variant="secondary">
                          {tickets.filter(t => 
                            t.resolvedAt && new Date(t.resolvedAt).toDateString() === new Date().toDateString()
                          ).length}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Pending assignment</span>
                        <Badge variant="destructive">{analytics ? analytics.unassignedTickets : '-'}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>SLA Compliance</span>
                        <Badge variant="default">{slaCompliance}%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Resolution</span>
                        <Badge variant="outline">{avgResolutionTime}h</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Users</span>
                        <Badge variant="secondary">{activeUsers}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="tickets" className="space-y-6">
              {/* Consolidated Filters */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Filter className="h-4 w-4" />
                      Filters
                      {activeTicketFiltersCount > 0 && (
                        <Badge variant="secondary">{activeTicketFiltersCount} active</Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="h-8"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 md:hidden"
                        onClick={() => setTicketFiltersOpen((open) => !open)}
                        aria-expanded={ticketFiltersOpen}
                        aria-controls="admin-ticket-filters-body"
                      >
                        {ticketFiltersOpen ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent
                  id="admin-ticket-filters-body"
                  className={cn('p-4 pt-0', ticketFiltersOpen ? 'block' : 'hidden md:block')}
                >
                  <div className="space-y-6">
                    {/* Row 1: Search, Resource ID, Date Range, Severity */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* Search Bar */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tickets by number (comma-separated), description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11"
                      />
                    </div>
                    </div>

                      {/* Resource ID */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Resource ID {resourceIdFilter.length > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {resourceIdFilter.length} selected
                            </Badge>
                          )}
                        </label>
                        <MultiSelect
                          selected={resourceIdFilter}
                          onChange={setResourceIdFilter}
                          placeholder="Enter Resource IDs (comma-separated)..."
                          className="w-full"
                        />
                        {resourceIdFilter.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter comma-separated Resource IDs to filter tickets
                          </p>
                        )}
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Ticket Created Date Range</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-11",
                                !filterDateRange && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filterDateRange?.from ? (
                                filterDateRange.to ? (
                                  <>
                                    {format(filterDateRange.from, "LLL dd, y")} - {format(filterDateRange.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(filterDateRange.from, "LLL dd, y")
                                )
                              ) : (
                                "Pick a date range"
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={filterDateRange?.from}
                              selected={filterDateRange}
                              onSelect={setFilterDateRange}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                        {filterDateRange && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Filtering tickets created between {filterDateRange.from && format(filterDateRange.from, "MMM dd, yyyy")} {filterDateRange.to && ` and ${format(filterDateRange.to, "MMM dd, yyyy")}`}
                          </p>
                        )}
                      </div>

                      {/* Severity */}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Severity</label>
                        <Select value={severityFilter} onValueChange={setSeverityFilter}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Severity</SelectItem>
                            {uniqueSeverities.map(severity => (
                              <SelectItem key={severity} value={severity}>
                                {severity === 'sev1' ? 'SEV1' :
                                 severity === 'sev2' ? 'SEV2' :
                                 severity === 'sev3' ? 'SEV3' :
                                 (severity as string).charAt(0).toUpperCase() + (severity as string).slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Row 2: Status, Category, City, Approver */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="open">OPEN</SelectItem>
                            <SelectItem value="in_progress">PENDING ON CX</SelectItem>
                            <SelectItem value="ops_input_required">OPS DEPENDENCY</SelectItem>
                            <SelectItem value="user_dependency">USER DEPENDENCY</SelectItem>
                            <SelectItem value="ops_user_dependency">OPS + USER DEPENDENCY</SelectItem>
                            <SelectItem value="send_for_approval">SEND FOR APPROVAL</SelectItem>
                            <SelectItem value="approved">APPROVED</SelectItem>
                            <SelectItem value="resolved">CLOSED</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Category</label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {uniqueCategories.map(category => (
                              <SelectItem key={category} value={category}>
                                {category === 'payment_delay' ? 'Payment Delay' :
                                 category === 'partial_payment' ? 'Partial Payment' :
                                 category === 'behavioral_complaint' ? 'Behavioral Complaint' :
                                 category === 'improvement_request' ? 'Improvement Request' :
                                 category === 'facility_issue' ? 'Facility Issue' :
                                 category === 'penalty_issue' ? 'Penalty Issue' :
                                 category === 'app_issue' ? 'App Issue' :
                                 category === 'noc' ? 'NOC' :
                                 category === 'posh' ? 'POSH' :
                                 category === 'workplace_misconduct' ? 'Workplace Misconduct' :
                                 category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">City</label>
                        <Select value={cityFilter} onValueChange={setCityFilter}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="City" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Cities</SelectItem>
                            {uniqueCities.map(city => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Approver {approverFilter.length > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {approverFilter.length} selected
                            </Badge>
                          )}
                        </label>
                        <MultiSelect
                          selected={approverFilter}
                          onChange={setApproverFilter}
                          placeholder="Select approvers..."
                          className="w-full"
                          options={approvers.map(a => ({ value: a.id, label: a.name }))}
                        />
                      </div>
                    </div>

                    {/* Row 3: Resolver */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Resolver {resolverFilter.length > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {resolverFilter.length} selected
                            </Badge>
                          )}
                        </label>
                        <MultiSelect
                          selected={resolverFilter}
                          onChange={setResolverFilter}
                          placeholder="Select resolvers..."
                          className="w-full"
                          options={resolvers.map(r => ({ value: r.id, label: r.name }))}
                        />
                      </div>
                    </div>

                    {/* Row 4: Actions, Settings & Sort */}
                    <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="only-unassigned-resolver"
                          checked={onlyUnassignedResolver}
                          onCheckedChange={(checked) => setOnlyUnassignedResolver(checked)}
                        />
                        <label htmlFor="only-unassigned-resolver" className="text-sm font-medium">
                          Unassigned Tickets
                        </label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-deleted"
                          checked={showDeleted}
                          onCheckedChange={(checked) => setShowDeleted(checked)}
                        />
                        <label htmlFor="show-deleted" className="text-sm font-medium">
                          {showDeleted ? 'Showing Deleted Tickets' : 'Hide Deleted Tickets'}
                        </label>
                      </div>

                      {!isTicketAdmin && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="show-archived"
                            checked={viewAllTickets}
                            onCheckedChange={(checked) => setViewAllTickets(checked)}
                          />
                          <label htmlFor="show-archived" className="text-sm font-medium">
                            {viewAllTickets ? 'View All Tickets' : 'Hide Archived Tickets'}
                          </label>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 ml-auto">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium whitespace-nowrap">Sort by</label>
                          <Select value={sortBy} onValueChange={(value) => setSortBy(value as TicketSortBy)}>
                            <SelectTrigger className="h-9 w-[140px]">
                              <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="created">Created</SelectItem>
                              <SelectItem value="updated">Updated</SelectItem>
                              <SelectItem value="ticketNumber">Ticket#</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium whitespace-nowrap">Direction</label>
                          <Select value={sortDir} onValueChange={(value) => setSortDir(value as TicketSortDir)}>
                            <SelectTrigger className="h-9 w-[110px]">
                              <SelectValue placeholder="Direction" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="desc">Desc</SelectItem>
                              <SelectItem value="asc">Asc</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            onClick={clearFilters}
                            className="flex items-center gap-2"
                          >
                            <X className="h-4 w-4" />
                            Clear Filters
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Count Cards - Update based on filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">{allFilteredTickets.filter(t => t.status === 'open').length}</div>
                    <div className="text-sm text-muted-foreground">Open</div>
                  </CardContent>
                </Card>
                
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-yellow-600">{allFilteredTickets.filter(t => t.status === 'in_progress').length}</div>
                    <div className="text-sm text-muted-foreground">Pending on CX</div>
                  </CardContent>
                </Card>
                
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{allFilteredTickets.filter(t => t.status === 'user_dependency').length}</div>
                    <div className="text-sm text-muted-foreground">User Dependency</div>
                  </CardContent>
                </Card>
                
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">{allFilteredTickets.filter(t => t.status === 'ops_input_required').length}</div>
                    <div className="text-sm text-muted-foreground">Ops Dependency</div>
                  </CardContent>
                </Card>
                
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-indigo-600">{allFilteredTickets.filter(t => t.status === 'ops_user_dependency').length}</div>
                    <div className="text-sm text-muted-foreground">Ops + User</div>
                  </CardContent>
                </Card>
                
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-cyan-600">{allFilteredTickets.filter(t => t.status === 'send_for_approval').length}</div>
                    <div className="text-sm text-muted-foreground">Send for Approval</div>
                  </CardContent>
                </Card>
                
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{allFilteredTickets.filter(t => t.status === 'approved').length}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </CardContent>
                </Card>
                
                <Card className="text-center">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-gray-600">{allFilteredTickets.filter(t => t.status === 'resolved').length}</div>
                    <div className="text-sm text-muted-foreground">Closed</div>
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced User Assignment */}
              {selectedTickets.length > 0 && (
                <EnhancedUserAssignment
                  ticketIds={selectedTickets}
                  onAssignmentComplete={handleAssignmentComplete}
                />
              )}

              {/* Mobile Ticket Cards */}
              <div className="block md:hidden space-y-3">
                {isLoading ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span>Loading tickets...</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Select All for Mobile */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedTickets.length === filteredTickets.length && filteredTickets.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                          <span className="text-sm font-medium">
                            Select All ({filteredTickets.length} tickets)
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Mobile Ticket Cards */}
                    {filteredTickets.map((ticket) => (
                      <Card key={ticket.id} className={`p-4 ${viewAllTickets && ticket.archiveStatus === 'Yes' ? 'bg-red-50' : ''}`}>
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <Checkbox
                              checked={selectedTickets.includes(ticket.id)}
                              onCheckedChange={(checked) => handleTicketSelect(ticket.id, checked === true)}
                              aria-label={`Select ticket ${ticket.ticketNumber}`}
                            />
                            <span className="whitespace-nowrap font-mono text-sm font-semibold">{ticket.ticketNumber}</span>
                            {ticket.deleted && (
                              <span title="This ticket is soft deleted">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold gap-1">
                                  <Trash2 className="h-3 w-3" />DELETED
                                </span>
                              </span>
                            )}
                            <Badge variant={getStatusColor(ticket.status)}>
                              {getStatusLabel(ticket.status as any)}
                            </Badge>
                            <Badge variant={getSeverityColor(ticket.severity)}>
                              {ticket.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewTicket(ticket)}
                              aria-label={`View ticket ${ticket.ticketNumber}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!ticket.deleted && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteTicket(ticket)}
                                disabled={deletingTicketId === ticket.id}
                                aria-label={`Delete ticket ${ticket.ticketNumber}`}
                              >
                                {deletingTicketId === ticket.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4" />
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <h3 className="font-medium mb-2">{ticket.issueDescription}</h3>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>{ticket.city}</span>
                          <span>{ticket.submittedAt ? format(new Date(ticket.submittedAt), 'dd MMM yyyy HH:mm:ss') : 'N/A'}</span>
                        </div>
                      </Card>
                    ))}
                  </>
                )}
              </div>


              {/* Desktop Table */}
              <div className="hidden md:block">
                <Card>
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="flex items-center justify-between">
                      <span>Tickets ({totalTickets})</span>
                      <div className="hidden md:flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Select only current page (up to 50)
                            setSelectedTickets(filteredTickets.map(t => t.id));
                          }}
                        >
                          Select 50 on this page
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const ids = await AdminService.getFilteredTicketIds(showDeleted, {
                              searchQuery,
                              statusFilter,
                              severityFilter,
                              categoryFilter,
                              cityFilter,
                              resolverFilter,
                              approverFilter,
                              resourceIdFilter,
                              dateRange: filterDateRange,
                              onlyUnassignedResolver,
                              archiveStatus: viewAllTickets ? undefined : false
                            });
                            setSelectedTickets(ids);
                          }}
                        >
                          Select all {totalTickets}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="p-8 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span>Loading tickets...</span>
                        </div>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedTickets.length === filteredTickets.length && filteredTickets.length > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead>Ticket #</TableHead>
                            <TableHead>Issue Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTickets.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center">No tickets found.</TableCell>
                            </TableRow>
                          ) : (
                            filteredTickets.map((ticket) => (
                              <TableRow key={ticket.id} className={viewAllTickets && ticket.archiveStatus === 'Yes' ? 'bg-red-50 hover:bg-red-100' : undefined}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedTickets.includes(ticket.id)}
                                    onCheckedChange={(checked) => handleTicketSelect(ticket.id, checked as boolean)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {ticket.ticketNumber}
                                  {ticket.deleted && (
                                    <span className="ml-2" title="This ticket is soft deleted">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold gap-1">
                                        <Trash2 className="h-3 w-3" />DELETED
                                      </span>
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {ticket.issueCategory.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {ticket.issueDescription}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusColor(ticket.status)}>
                                    {getStatusLabel(ticket.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getSeverityColor(ticket.severity)}>
                                    {ticket.severity.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>{ticket.city}</TableCell>
                                <TableCell>
                                  {ticket.submittedAt ? format(new Date(ticket.submittedAt), 'dd MMM yyyy HH:mm:ss') : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewTicket(ticket)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {!ticket.deleted && (
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteTicket(ticket)}
                                        disabled={deletingTicketId === ticket.id}
                                      >
                                        {deletingTicketId === ticket.id ? (
                                          <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Deleting...
                                          </>
                                        ) : (
                                          <>
                                            <Trash2 className="h-4 w-4" />
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredTickets.length} of {totalTickets} tickets
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <span className="text-sm">Page {page}</span>
                  <Button variant="outline" size="sm" disabled={!hasMore || isLoading} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <AdvancedAnalytics
                includeArchived={analyticsIncludeArchived}
                onIncludeArchivedChange={setAnalyticsIncludeArchived}
                dateRange={analyticsDateRange}
                onDateRangeChange={setAnalyticsDateRange}
                datePreset={analyticsDatePreset}
                onDatePresetChange={setAnalyticsDatePreset}
              />
            </TabsContent>

            <TabsContent value="users">
              <UserManagementPanel />
            </TabsContent>

            <TabsContent value="whatsapp">
              <WhatsAppTestComponent />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <ActivityLog />
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">System configuration options will be available here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Modals */}
      <TicketDetailsModal
        isOpen={showTicketDetails}
        onClose={() => setShowTicketDetails(false)}
        ticket={selectedTicket}
        onTicketUpdate={loadTickets}
      />

      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Date Range for Download</DialogTitle>
            <DialogDescription>
              Please select a start and end date to download the tickets for that period, or choose to download all tickets.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={downloadAll}
                onChange={e => setDownloadAll(e.target.checked)}
              />
              Download all tickets (ignore date range)
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                  disabled={downloadAll}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  disabled={downloadAll}
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button onClick={handleDownloadWithDateRange} disabled={isDownloading}>
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="border-t bg-muted/50 py-4 md:py-6 mt-8 md:mt-12">
        <div className="container mx-auto px-4 text-center text-xs md:text-sm text-muted-foreground">
          <p>© 2025 Awign Enterprises Pvt. Ltd.</p>
          <p className="mt-1">Escalation Management System for TCS Examination Operations.</p>
        </div>
      </footer>
    </div>
  );
};
