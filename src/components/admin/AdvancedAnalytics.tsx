import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, AlertCircle, CheckCircle, Clock, MapPin, Building, UserCheck, RefreshCw, UserCog, FileText, BarChart3, Activity, Zap, Target, AlertTriangle, XCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { AdminService, type TicketAnalytics } from '@/services/adminService';
import { UserManagementModal } from './UserManagementModal';
import { AnalyticsDateFilter } from './AnalyticsDateFilter';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRange } from 'react-day-picker';
import { DateRangePresetId } from '@/utils/dateRangePresets';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  CHART_ANIMATION,
  CHART_BAR_PRIMARY,
  CHART_BAR_SECONDARY,
  CHART_GRID,
  CHART_MUTED_INK,
  CHART_TICK,
  VERTICAL_BAR_MARGIN_DESKTOP,
  VERTICAL_BAR_MARGIN_MOBILE,
  barDomainMax,
  makeBarCountLabel,
  makePieValueLabel,
  ticketCountLabel,
} from '@/components/charts/chartMobile';
import {
  chartCardHeaderClass,
  chartCardTitleClass,
  tableScrollClass,
} from '@/components/layout/mobileLayout';

interface UserAssignment {
  userId: string;
  name: string;
  role: 'resolver' | 'approver' | 'ticket_admin';
  /** Unique tickets assigned to this user */
  count: number;
  /** Unique assigned tickets with status resolved (CLOSED) */
  closedCount: number;
}

interface AdvancedAnalyticsProps {
  includeArchived?: boolean;
  onIncludeArchivedChange?: (checked: boolean) => void;
  dateRange?: DateRange | undefined;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  datePreset?: DateRangePresetId;
  onDatePresetChange?: (preset: DateRangePresetId) => void;
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  includeArchived: includeArchivedProp,
  onIncludeArchivedChange,
  dateRange: dateRangeProp,
  onDateRangeChange,
  datePreset: datePresetProp,
  onDatePresetChange,
}) => {
  const [analytics, setAnalytics] = useState<TicketAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [userAssignments, setUserAssignments] = useState<UserAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'role'>('count');
  const [roleFilter, setRoleFilter] = useState<'all' | 'resolver' | 'approver' | 'ticket_admin'>('all');
  const [localIncludeArchived, setLocalIncludeArchived] = useState(false);
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>();
  const [localDatePreset, setLocalDatePreset] = useState<DateRangePresetId>('all');
  const navigate = useNavigate();
  const { user, isTicketAdmin } = useAuth();
  const isMobile = useIsMobile();
  const pieLabel = useMemo(() => makePieValueLabel(isMobile), [isMobile]);
  const barLabel = useMemo(() => makeBarCountLabel(isMobile), [isMobile]);
  const barMargin = isMobile ? VERTICAL_BAR_MARGIN_MOBILE : VERTICAL_BAR_MARGIN_DESKTOP;

  const includeArchived = includeArchivedProp ?? localIncludeArchived;
  const dateRange = dateRangeProp ?? localDateRange;
  const datePreset = datePresetProp ?? localDatePreset;
  const setIncludeArchived = onIncludeArchivedChange ?? setLocalIncludeArchived;
  const setDateRange = onDateRangeChange ?? setLocalDateRange;
  const setDatePreset = onDatePresetChange ?? setLocalDatePreset;

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const analyticsOptions = {
        includeArchived,
        dateRange: dateRange?.from
          ? { from: dateRange.from, to: dateRange.to }
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
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [includeArchived, dateRange, isTicketAdmin, user?.id]);

  const handleViewTickets = () => {
    // Navigate to the appropriate page based on user role
    console.log('🚀 Navigating to tickets view...');
    if (isTicketAdmin) {
      navigate('/ticket-admin?tab=tickets');
    } else {
      navigate('/admin?tab=tickets');
    }
    console.log('✅ Navigation triggered to tickets view');
  };

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    loadUserAssignments();
  }, []);

  const loadUserAssignments = async () => {
    setIsLoadingAssignments(true);
    try {
      // Fetch all users (resolvers, approvers, ticket_admins)
      const [resolvers, approvers, ticketAdmins] = await Promise.all([
        AdminService.getUsersByRole('resolver'),
        AdminService.getUsersByRole('approver'),
        AdminService.getUsersByRole('ticket_admin'),
      ]);

      // Create a map of all unique users (a user might have multiple roles)
      const allUsersMap = new Map<string, { id: string; name: string; roles: string[] }>();
      
      resolvers.forEach(u => {
        if (!allUsersMap.has(u.id)) {
          allUsersMap.set(u.id, { id: u.id, name: u.name, roles: [] });
        }
        allUsersMap.get(u.id)!.roles.push('resolver');
      });
      
      approvers.forEach(u => {
        if (!allUsersMap.has(u.id)) {
          allUsersMap.set(u.id, { id: u.id, name: u.name, roles: [] });
        }
        allUsersMap.get(u.id)!.roles.push('approver');
      });
      
      ticketAdmins.forEach(u => {
        if (!allUsersMap.has(u.id)) {
          allUsersMap.set(u.id, { id: u.id, name: u.name, roles: [] });
        }
        allUsersMap.get(u.id)!.roles.push('ticket_admin');
      });

      // Fetch all ticket assignments (with ticket ids for closed counts)
      const { data: assignments, error: assignmentsError } = await supabase
        .from('ticket_assignees')
        .select('user_id, role, ticket_id')
        .in('role', ['resolver', 'approver', 'ticket_admin']);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        setIsLoadingAssignments(false);
        return;
      }

      // Unique ticket ids per user (across roles)
      const ticketsByUser = new Map<string, Set<string>>();
      const allTicketIds = new Set<string>();
      (assignments || []).forEach((assignment: { user_id: string; ticket_id: string }) => {
        if (!ticketsByUser.has(assignment.user_id)) {
          ticketsByUser.set(assignment.user_id, new Set());
        }
        ticketsByUser.get(assignment.user_id)!.add(assignment.ticket_id);
        allTicketIds.add(assignment.ticket_id);
      });

      // Resolve ticket statuses in batches
      const ticketStatusById = new Map<string, string>();
      const ticketIdList = Array.from(allTicketIds);
      const STATUS_BATCH = 200;
      for (let i = 0; i < ticketIdList.length; i += STATUS_BATCH) {
        const batch = ticketIdList.slice(i, i + STATUS_BATCH);
        const { data: ticketRows, error: ticketsError } = await supabase
          .from('tickets')
          .select('id, status')
          .in('id', batch);

        if (ticketsError) {
          console.error('Error fetching ticket statuses for assignments:', ticketsError);
          break;
        }
        (ticketRows || []).forEach((row: { id: string; status: string }) => {
          ticketStatusById.set(row.id, row.status);
        });
      }

      const isClosedStatus = (status?: string) =>
        status === 'resolved' || status === 'closed';

      // Create user assignments array - show each user once with their primary role
      const allUsers: UserAssignment[] = Array.from(allUsersMap.values()).map((user) => {
        // Determine primary role (prefer resolver > approver > ticket_admin)
        let primaryRole: 'resolver' | 'approver' | 'ticket_admin' = 'resolver';
        if (user.roles.includes('resolver')) {
          primaryRole = 'resolver';
        } else if (user.roles.includes('approver')) {
          primaryRole = 'approver';
        } else if (user.roles.includes('ticket_admin')) {
          primaryRole = 'ticket_admin';
        }

        const ticketIds = ticketsByUser.get(user.id);
        let closedCount = 0;
        if (ticketIds) {
          ticketIds.forEach((ticketId) => {
            if (isClosedStatus(ticketStatusById.get(ticketId))) {
              closedCount += 1;
            }
          });
        }

        return {
          userId: user.id,
          name: user.name,
          role: primaryRole,
          count: ticketIds?.size || 0,
          closedCount,
        };
      });

      setUserAssignments(allUsers);
    } catch (error) {
      console.error('Error loading user assignments:', error);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  const statusData = analytics ? [
    { name: 'Open', value: analytics.openTickets, color: '#ef4444' },
    { name: 'In Progress', value: analytics.inProgressTickets, color: '#f97316' },
    { name: 'User Dependency', value: analytics.userDependencyTickets, color: '#8b5cf6' },
    { name: 'Ops Input Required', value: analytics.opsInputRequiredTickets, color: '#f59e0b' },
    { name: 'Approved', value: analytics.approvedTickets, color: '#10b981' },
    { name: 'Send for Approval', value: analytics.sendForApprovalTickets, color: '#3b82f6' },
    { name: 'Resolved', value: analytics.resolvedTickets, color: '#22c55e' },
    { name: 'Closed', value: analytics.closedTickets, color: '#6b7280' },
  ].filter(item => item.value > 0) : []; // Only show non-zero values

  const severityData = analytics ? [
    { name: 'SEV1', value: analytics.sev1Tickets, color: '#ef4444' },
    { name: 'SEV2', value: analytics.sev2Tickets, color: '#f97316' },
    { name: 'SEV3', value: analytics.sev3Tickets, color: '#22c55e' },
  ].filter(item => item.value > 0) : []; // Only show non-zero values

  const assignmentData = analytics ? [
    { name: 'Assigned', value: analytics.assignedTickets },
    { name: 'Unassigned', value: analytics.unassignedTickets },
  ] : [];

  // Check if we have any data to display
  const hasData = !!analytics && analytics.totalTickets > 0;

  // Calculate additional metrics
  const pendingActions = analytics
    ? analytics.userDependencyTickets + analytics.opsInputRequiredTickets +
      analytics.opsUserDependencyTickets + analytics.sendForApprovalTickets
    : 0;
  const activeTickets = analytics
    ? analytics.openTickets + analytics.inProgressTickets
    : 0;
  const resolutionRate = analytics && analytics.totalTickets > 0 
    ? Math.round((analytics.resolvedTickets / analytics.totalTickets) * 100) 
    : 0;
  const assignmentRate = analytics && analytics.totalTickets > 0 
    ? Math.round((analytics.assignedTickets / analytics.totalTickets) * 100) 
    : 0;
  const slaComplianceRate = analytics && analytics.totalTickets > 0
    ? Math.round(((analytics.totalTickets - analytics.slaBreachedTickets) / analytics.totalTickets) * 100)
    : 0;

  const filtersCard = (
    <AnalyticsDateFilter
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      preset={datePreset}
      onPresetChange={setDatePreset}
      includeArchived={includeArchived}
      onIncludeArchivedChange={setIncludeArchived}
      idPrefix="analytics"
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {filtersCard}
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {filtersCard}
        <div className="text-center p-8">
          <p className="mb-4 text-destructive">{error}</p>
          <Button onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        {filtersCard}
        <div className="text-center p-8">
          <p>No analytics data available</p>
          <Button onClick={loadAnalytics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden sm:space-y-6">
      {filtersCard}
      {/* Key Metrics — neutral, Overview-aligned */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Tickets</p>
                <p className="text-2xl font-bold">{analytics.totalTickets.toLocaleString()}</p>
              </div>
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Open</p>
                <p className="text-2xl font-bold">{analytics.openTickets.toLocaleString()}</p>
              </div>
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">In Progress</p>
                <p className="text-2xl font-bold">{analytics.inProgressTickets.toLocaleString()}</p>
              </div>
              <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Resolved</p>
                <p className="text-2xl font-bold">{analytics.resolvedTickets.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{resolutionRate}% resolution rate</p>
              </div>
              <CheckCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Assigned</p>
                <p className="text-2xl font-bold">{analytics.assignedTickets.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{assignmentRate}% assigned</p>
              </div>
              <UserCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Avg Resolution</p>
                <p className="text-2xl font-bold">{Math.round(analytics.avgResolutionHours)}h</p>
                <p className="text-xs text-muted-foreground mt-1">Average time</p>
              </div>
              <TrendingUp className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary metrics — colour only for SLA / unassigned attention */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Pending Actions</p>
                <p className="text-xl font-bold">{pendingActions}</p>
              </div>
              <Activity className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <div>User: {analytics.userDependencyTickets}</div>
              <div>Ops: {analytics.opsInputRequiredTickets}</div>
              <div>Ops+User: {analytics.opsUserDependencyTickets}</div>
              <div>Approval: {analytics.sendForApprovalTickets}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">SLA Breached</p>
                <p className="text-xl font-bold">{analytics.slaBreachedTickets}</p>
                <p className="text-xs text-muted-foreground mt-1">{slaComplianceRate}% compliance</p>
              </div>
              <AlertTriangle
                className={`h-5 w-5 shrink-0 ${
                  analytics.slaBreachedTickets > 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Unassigned</p>
                <p className="text-xl font-bold">{analytics.unassignedTickets}</p>
                <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
              </div>
              <XCircle
                className={`h-5 w-5 shrink-0 ${
                  analytics.unassignedTickets > 0 ? 'text-destructive' : 'text-muted-foreground'
                }`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Active Tickets</p>
                <p className="text-xl font-bold">{activeTickets}</p>
                <p className="text-xs text-muted-foreground mt-1">Open + In Progress</p>
              </div>
              <Zap className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Show message if no data */}
      {!hasData && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground mb-4">
              There are no tickets in the system yet. Create some tickets to see analytics.
            </p>
            <Button onClick={handleViewTickets}>
              <FileText className="h-4 w-4 mr-2" />
              View Tickets
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Charts - Only show if we have data */}
      {hasData && (
        <Tabs defaultValue="overview" className="w-full" data-analytics-section>
          <TabsList className="my-3 grid w-full grid-cols-2 gap-1.5 rounded-xl border bg-muted p-1.5 shadow-md md:my-4 md:grid-cols-4 md:gap-0 md:p-1">
            <TabsTrigger value="overview" className="w-full rounded-lg px-2 py-2 text-center text-xs data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow sm:text-sm md:px-4">Overview</TabsTrigger>
            <TabsTrigger value="distribution" className="w-full rounded-lg px-2 py-2 text-center text-xs data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow sm:text-sm md:px-4">Distribution</TabsTrigger>
            <TabsTrigger value="performance" className="w-full rounded-lg px-2 py-2 text-center text-xs data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow sm:text-sm md:px-4">Performance</TabsTrigger>
            <TabsTrigger value="details" className="w-full rounded-lg px-2 py-2 text-center text-xs data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow sm:text-sm md:px-4">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Status Overview - Enhanced */}
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              <Card className="min-w-0 shadow-md">
                <CardHeader className="pb-3">
                  <div className={chartCardHeaderClass}>
                    <CardTitle className={chartCardTitleClass}>
                      <Activity className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
                      Ticket Status Distribution
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {statusData.length} statuses
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 px-3 sm:px-6">
                  {statusData.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={isMobile ? 280 : 320}>
                      <PieChart
                        margin={{
                          top: isMobile ? 12 : 16,
                          right: isMobile ? 12 : 28,
                          bottom: 8,
                          left: isMobile ? 12 : 28,
                        }}
                      >
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                          label={pieLabel}
                          outerRadius={isMobile ? 58 : 88}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          {...CHART_ANIMATION}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                          <Tooltip
                            formatter={(value: number, _name: string, item: { payload?: { name?: string } }) => [
                              ticketCountLabel(value),
                              item?.payload?.name ?? 'Status',
                            ]}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                      </PieChart>
                    </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-3 md:flex md:flex-nowrap md:items-stretch">
                        {statusData.map((item) => (
                          <div
                            key={item.name}
                            className="flex min-w-0 flex-col justify-center rounded-md border px-2 py-2 text-center md:flex-1"
                            style={{
                              backgroundColor: `${item.color}18`,
                              borderColor: `${item.color}55`,
                            }}
                          >
                            <div
                              className="text-sm font-bold tabular-nums"
                              style={{ color: item.color }}
                            >
                              {item.value}
                            </div>
                            <div className="mt-1 truncate text-[11px] font-medium leading-snug text-foreground/80 md:text-xs">
                              {item.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No status data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 shadow-md">
                <CardHeader className="pb-3">
                  <div className={chartCardHeaderClass}>
                    <CardTitle className={chartCardTitleClass}>
                      <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                      Severity Breakdown
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {severityData.length} levels
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 px-3 sm:px-6">
                  {severityData.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer
                        width="100%"
                        height={Math.max(isMobile ? 180 : 220, severityData.length * (isMobile ? 56 : 72))}
                      >
                        <BarChart
                          data={severityData}
                          layout="vertical"
                          margin={barMargin}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                            domain={[0, barDomainMax]}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={isMobile ? 44 : 52}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value: number) => [ticketCountLabel(value), 'Count']}
                            labelFormatter={(label) => String(label)}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Bar
                            dataKey="value"
                            radius={[0, 8, 8, 0]}
                            maxBarSize={36}
                            label={barLabel}
                            {...CHART_ANIMATION}
                          >
                            {severityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                      <div className="grid grid-cols-3 gap-2 border-t pt-2">
                        {severityData.map((item) => (
                          <div key={item.name} className="text-center">
                            <div className="text-lg font-bold">{item.value}</div>
                            <div className="text-xs text-muted-foreground">{item.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {analytics.totalTickets > 0
                                ? `${Math.round((item.value / analytics.totalTickets) * 100)}%`
                                : '0%'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No severity data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Assignment Summary - Enhanced */}
            <Card className="min-w-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className={chartCardTitleClass}>
                  <UserCheck className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
                  Assignment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                  <div className="rounded-lg border bg-muted/40 p-3 text-center sm:p-4">
                    <div className="mb-1 text-2xl font-bold sm:text-3xl">
                      {analytics.assignedTickets.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium">Assigned Tickets</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {assignmentRate}% of total
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3 text-center sm:p-4">
                    <div className="mb-1 text-2xl font-bold sm:text-3xl">
                      {analytics.unassignedTickets.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium">Unassigned Tickets</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {100 - assignmentRate}% of total
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3 text-center sm:p-4">
                    <div className="mb-1 text-2xl font-bold sm:text-3xl">
                      {analytics.resolverBreakdown.length}
                    </div>
                    <div className="text-sm font-medium">Active Resolvers</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {analytics.resolverBreakdown.length > 0
                        ? `Avg ${Math.round(analytics.assignedTickets / analytics.resolverBreakdown.length)} per resolver`
                        : 'No resolvers'}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3 text-center sm:p-4">
                    <div className="mb-1 text-2xl font-bold sm:text-3xl">
                      {analytics.approverBreakdown.length}
                    </div>
                    <div className="text-sm font-medium">Active Approvers</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {analytics.approverBreakdown.length > 0
                        ? `Avg ${Math.round(analytics.assignedTickets / analytics.approverBreakdown.length)} per approver`
                        : 'No approvers'}
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Overall Assignment Rate
                    </span>
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="h-2 w-full max-w-[10rem] flex-1 rounded-full bg-gray-200 sm:w-32 sm:flex-none">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${assignmentRate}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-sm font-bold text-primary">
                        {assignmentRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-xl sm:text-2xl">Assignment Distribution</CardTitle>
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="resolver">Resolvers</SelectItem>
                        <SelectItem value="approver">Approvers</SelectItem>
                        <SelectItem value="ticket_admin">Ticket Admins</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Sort by Count</SelectItem>
                        <SelectItem value="name">Sort by Name</SelectItem>
                        <SelectItem value="role">Sort by Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAssignments ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading assignments...</p>
                    </div>
                  </div>
                ) : (() => {
                  // Filter by role and only show users with assignments
                  let filtered = userAssignments.filter(u => u.count > 0);
                  if (roleFilter !== 'all') {
                    filtered = filtered.filter(u => u.role === roleFilter);
                  }

                  // Sort data
                  const sorted = [...filtered].sort((a, b) => {
                    switch (sortBy) {
                      case 'name':
                        return a.name.localeCompare(b.name);
                      case 'count':
                        return b.count - a.count; // Descending
                      case 'role':
                        return a.role.localeCompare(b.role) || a.name.localeCompare(b.name);
                      default:
                        return b.count - a.count;
                    }
                  });

                  if (sorted.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No users found
                      </div>
                    );
                  }

                  // Get role color
                  const getRoleColor = (role: string) => {
                    switch (role) {
                      case 'resolver':
                        return '#64748b';
                      case 'approver':
                        return '#94a3b8';
                      case 'ticket_admin':
                        return '#475569';
                      default:
                        return '#94a3b8';
                    }
                  };

                  // Get role badge
                  const getRoleBadge = (role: string) => {
                    switch (role) {
                      case 'resolver':
                        return <Badge variant="secondary">Resolver</Badge>;
                      case 'approver':
                        return <Badge variant="outline">Approver</Badge>;
                      case 'ticket_admin':
                        return <Badge variant="outline">Ticket Admin</Badge>;
                      default:
                        return <Badge variant="outline">{role}</Badge>;
                    }
                  };

                  // Prepare chart data
                  const chartData = sorted.map(user => ({
                    name: user.name,
                    count: user.count,
                    role: user.role,
                    displayName: `${user.name} (${user.role.replace('_', ' ')})`,
                  }));

                  // Custom tooltip
                  const CustomTooltip = ({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg shadow-lg text-sm border">
                          <div className="font-semibold mb-1">{data.name}</div>
                          <div className="flex items-center gap-2 mb-1">
                            {getRoleBadge(data.role)}
                          </div>
                          <div className="text-primary font-medium">
                            {data.count} ticket{data.count !== 1 ? 's' : ''} assigned
                          </div>
                        </div>
                      );
                    }
                    return null;
                  };

                  return (
                    <div className="space-y-4">
                      {/* Chart View */}
                      <div className={isMobile ? 'h-[280px]' : 'h-[400px]'}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{
                              top: 8,
                              right: isMobile ? 52 : 80,
                              left: isMobile ? 2 : 8,
                              bottom: isMobile ? 8 : 24,
                            }}
                          >
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                            <XAxis
                              type="number"
                              allowDecimals={false}
                              domain={[0, barDomainMax]}
                              tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                              label={
                                isMobile
                                  ? undefined
                                  : {
                                      value: 'Number of Tickets',
                                      position: 'insideBottom',
                                      offset: -12,
                                      fill: CHART_MUTED_INK,
                                      fontSize: 11,
                                    }
                              }
                            />
                            <YAxis
                              dataKey="name"
                              type="category"
                              width={isMobile ? 84 : 160}
                              tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                              tickFormatter={(value: string) =>
                                isMobile && value.length > 14 ? `${value.slice(0, 13)}…` : value
                              }
                              axisLine={false}
                              tickLine={false}
                            />
                        <Tooltip content={<CustomTooltip />} />
                            <Bar
                              dataKey="count"
                              radius={[0, 8, 8, 0]}
                              maxBarSize={28}
                              label={barLabel}
                              {...CHART_ANIMATION}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getRoleColor(entry.role)} />
                              ))}
                            </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                      </div>

                      {/* Summary Stats - Show complete data from all users */}
                      <div className="grid grid-cols-2 gap-3 border-t pt-4 md:grid-cols-4 md:gap-4">
                        <div className="text-center">
                          <div className="text-xl font-bold text-primary sm:text-2xl">
                            {userAssignments.length}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Users</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold sm:text-2xl">
                            {userAssignments.filter(u => u.count > 0).length}
                          </div>
                          <div className="text-xs text-muted-foreground">Users with Assignments</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold sm:text-2xl">
                            {userAssignments.filter(u => u.count === 0).length}
                          </div>
                          <div className="text-xs text-muted-foreground">Users without Assignments</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold sm:text-2xl">
                            {userAssignments.reduce((sum, u) => sum + u.count, 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Assignments</div>
                        </div>
                      </div>

                      {/* Table View (Compact) */}
                      <div className="overflow-hidden rounded-lg border">
                        <div className={tableScrollClass}>
                          <Table className="min-w-[520px]">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[40px]">#</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Assigned</TableHead>
                                <TableHead className="text-right">Closed</TableHead>
                                <TableHead className="text-right">%</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sorted.map((user, index) => {
                                const closedPct =
                                  user.count > 0
                                    ? Math.round((user.closedCount / user.count) * 1000) / 10
                                    : 0;
                                return (
                                <TableRow key={`${user.userId}_${user.role}`}>
                                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                  <TableCell className="font-medium">{user.name}</TableCell>
                                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={`font-semibold ${user.count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                                      {user.count}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {user.closedCount}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-muted-foreground">
                                    {closedPct}%
                                  </TableCell>
                                </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              <Card className="min-w-0 shadow-md">
                <CardHeader className="pb-3">
                  <div className={chartCardHeaderClass}>
                    <CardTitle className={chartCardTitleClass}>
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                      City-wise Distribution
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {analytics.cityBreakdown.length} cities
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 px-3 sm:px-6">
                  {analytics.cityBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
                        <BarChart
                          data={analytics.cityBreakdown.slice(0, 10)}
                          layout="vertical"
                          margin={{
                            ...barMargin,
                            left: 4,
                            right: isMobile ? 52 : 80,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                            domain={[0, barDomainMax]}
                          />
                          <YAxis
                            dataKey="city"
                            type="category"
                            width={isMobile ? 64 : 120}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                            tickFormatter={(value: string) =>
                              isMobile && value.length > 10 ? `${value.slice(0, 9)}…` : value
                            }
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value: number) => [ticketCountLabel(value), 'Count']}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Bar
                            dataKey="count"
                            radius={[0, 8, 8, 0]}
                            fill={CHART_BAR_PRIMARY}
                            maxBarSize={28}
                            label={barLabel}
                            {...CHART_ANIMATION}
                          />
                      </BarChart>
                    </ResponsiveContainer>
                      {analytics.cityBreakdown.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing top 10 cities. Total: {analytics.cityBreakdown.length} cities
                        </p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t">
                        {analytics.cityBreakdown.slice(0, 6).map((item) => (
                          <div key={item.city} className="rounded-md bg-muted/50 p-2 text-center">
                            <div className="text-sm font-bold">{item.count}</div>
                            <div className="truncate text-xs text-muted-foreground">{item.city}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No city data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 shadow-md">
                <CardHeader className="pb-3">
                  <div className={chartCardHeaderClass}>
                    <CardTitle className={chartCardTitleClass}>
                      <Building className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                      Centre-wise Distribution
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {analytics.centreBreakdown.length} centres
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 px-3 sm:px-6">
                  {analytics.centreBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
                        <BarChart
                          data={analytics.centreBreakdown.slice(0, 10)}
                          layout="vertical"
                          margin={barMargin}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                            domain={[0, barDomainMax]}
                          />
                          <YAxis
                            dataKey="centreCode"
                            type="category"
                            width={isMobile ? 56 : 80}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value: number) => [ticketCountLabel(value), 'Count']}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Bar
                            dataKey="count"
                            radius={[0, 8, 8, 0]}
                            fill={CHART_BAR_SECONDARY}
                            maxBarSize={28}
                            label={barLabel}
                            {...CHART_ANIMATION}
                          />
                      </BarChart>
                    </ResponsiveContainer>
                      {analytics.centreBreakdown.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing top 10 centres. Total: {analytics.centreBreakdown.length} centres
                        </p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t">
                        {analytics.centreBreakdown.slice(0, 6).map((item) => (
                          <div key={item.centreCode} className="rounded-md bg-muted/50 p-2 text-center">
                            <div className="text-sm font-bold">{item.count}</div>
                            <div className="text-xs text-muted-foreground">Centre {item.centreCode}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No centre data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              <Card className="min-w-0 shadow-md">
                <CardHeader className="pb-3">
                  <div className={chartCardHeaderClass}>
                    <CardTitle className={chartCardTitleClass}>
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                      Resolver Workload
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {analytics.resolverBreakdown.length} resolvers
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 px-3 sm:px-6">
                  {analytics.resolverBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
                        <BarChart
                          data={analytics.resolverBreakdown.slice(0, 10)}
                          layout="vertical"
                          margin={{
                            ...barMargin,
                            right: isMobile ? 52 : 80,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                            domain={[0, barDomainMax]}
                          />
                          <YAxis
                            dataKey="resolver"
                            type="category"
                            width={isMobile ? 72 : 150}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                            tickFormatter={(value: string) =>
                              isMobile && value.length > 12 ? `${value.slice(0, 11)}…` : value
                            }
                            axisLine={false}
                            tickLine={false}
                          />
                        <Tooltip
                            formatter={(value: number) => [ticketCountLabel(value), 'Assigned']}
                          labelFormatter={(label) => `Resolver: ${label}`}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                          <Bar
                            dataKey="count"
                            radius={[0, 8, 8, 0]}
                            fill={CHART_BAR_PRIMARY}
                            maxBarSize={28}
                            label={barLabel}
                            {...CHART_ANIMATION}
                          />
                      </BarChart>
                    </ResponsiveContainer>
                      {analytics.resolverBreakdown.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing top 10 resolvers. Total: {analytics.resolverBreakdown.length} resolvers
                        </p>
                      )}
                      <div className="pt-2 border-t">
                        <div className="mb-2 text-sm font-medium text-muted-foreground">Top Performers</div>
                        <div className="space-y-1">
                          {analytics.resolverBreakdown.slice(0, 3).map((item, idx) => (
                            <div
                              key={item.resolver}
                              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="shrink-0 text-xs font-bold text-muted-foreground">
                                  #{idx + 1}
                                </span>
                                <span className="truncate text-sm font-medium">{item.resolver}</span>
                              </div>
                              <Badge variant="secondary" className="shrink-0">
                                {item.count} tickets
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No resolver data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0 shadow-md">
                <CardHeader className="pb-3">
                  <div className={chartCardHeaderClass}>
                    <CardTitle className={chartCardTitleClass}>
                      <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                      Approver Workload
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {analytics.approverBreakdown.length} approvers
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 px-3 sm:px-6">
                  {analytics.approverBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={isMobile ? 280 : 350}>
                        <BarChart
                          data={analytics.approverBreakdown.slice(0, 10)}
                          layout="vertical"
                          margin={{
                            ...barMargin,
                            right: isMobile ? 52 : 80,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                            domain={[0, barDomainMax]}
                          />
                          <YAxis
                            dataKey="approver"
                            type="category"
                            width={isMobile ? 72 : 150}
                            tick={{ fontSize: isMobile ? 10 : 12, fill: CHART_MUTED_INK }}
                            tickFormatter={(value: string) =>
                              isMobile && value.length > 12 ? `${value.slice(0, 11)}…` : value
                            }
                            axisLine={false}
                            tickLine={false}
                          />
                        <Tooltip
                            formatter={(value: number) => [ticketCountLabel(value), 'Assigned']}
                          labelFormatter={(label) => `Approver: ${label}`}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                          <Bar
                            dataKey="count"
                            radius={[0, 8, 8, 0]}
                            fill={CHART_BAR_SECONDARY}
                            maxBarSize={28}
                            label={barLabel}
                            {...CHART_ANIMATION}
                          />
                      </BarChart>
                    </ResponsiveContainer>
                      {analytics.approverBreakdown.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing top 10 approvers. Total: {analytics.approverBreakdown.length} approvers
                        </p>
                      )}
                      <div className="pt-2 border-t">
                        <div className="mb-2 text-sm font-medium text-muted-foreground">Top Performers</div>
                        <div className="space-y-1">
                          {analytics.approverBreakdown.slice(0, 3).map((item, idx) => (
                            <div
                              key={item.approver}
                              className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="shrink-0 text-xs font-bold text-muted-foreground">
                                  #{idx + 1}
                                </span>
                                <span className="truncate text-sm font-medium">{item.approver}</span>
                              </div>
                              <Badge variant="secondary" className="shrink-0">
                                {item.count} tickets
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No approver data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="min-w-0 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className={chartCardTitleClass}>
                  <BarChart3 className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
                  Assignment Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Total Tickets</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {analytics.totalTickets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Assigned</span>
                      <Badge variant="secondary" className="text-base font-semibold">
                        {analytics.assignedTickets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Unassigned</span>
                      <Badge
                        variant={analytics.unassignedTickets > 0 ? 'destructive' : 'secondary'}
                        className="text-base font-semibold"
                      >
                        {analytics.unassignedTickets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Assignment Rate</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {assignmentRate}%
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Active Resolvers</span>
                      <Badge variant="secondary" className="text-base font-semibold">
                        {analytics.resolverBreakdown.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Active Approvers</span>
                      <Badge variant="secondary" className="text-base font-semibold">
                        {analytics.approverBreakdown.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Avg Tickets per Resolver</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {analytics.resolverBreakdown.length > 0
                          ? Math.round(
                              analytics.assignedTickets / analytics.resolverBreakdown.length
                            ).toLocaleString()
                          : '0'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Avg Tickets per Approver</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {analytics.approverBreakdown.length > 0
                          ? Math.round(
                              analytics.assignedTickets / analytics.approverBreakdown.length
                            ).toLocaleString()
                          : '0'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 sm:space-y-6">
            <div className="grid gap-4 md:grid-cols-3 md:gap-6">
              <Card className="min-w-0">
                <CardHeader className="pb-3">
                  <CardTitle className={chartCardTitleClass}>
                    <Target className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                    SLA Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Breached</span>
                      <Badge variant="destructive" className="text-base font-semibold">
                        {analytics.slaBreachedTickets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">On Time</span>
                      <Badge variant="secondary" className="text-base font-semibold">
                        {(analytics.totalTickets - analytics.slaBreachedTickets).toLocaleString()}
                      </Badge>
                    </div>
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <div className="text-center">
                        <div className="mb-1 text-2xl font-bold">{slaComplianceRate}%</div>
                        <div className="text-xs font-medium text-muted-foreground">Compliance Rate</div>
                        <div className="mt-2 h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${slaComplianceRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardHeader className="pb-3">
                  <CardTitle className={chartCardTitleClass}>
                    <Zap className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Active Tickets</span>
                      <Badge variant="secondary" className="text-base font-semibold">
                        {activeTickets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Unassigned</span>
                      <Badge
                        variant={analytics.unassignedTickets > 0 ? 'destructive' : 'secondary'}
                        className="text-base font-semibold"
                      >
                        {analytics.unassignedTickets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Avg Resolution</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {Math.round(analytics.avgResolutionHours)}h
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                      <span className="text-sm font-medium">Pending Actions</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {pendingActions.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardHeader className="pb-3">
                  <CardTitle className={chartCardTitleClass}>
                    <Activity className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={() => setShowUserManagement(true)}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button
                    onClick={loadAnalytics}
                    variant="outline"
                    className="w-full justify-start"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Refreshing...' : 'Refresh Data'}
                  </Button>
                  <Button
                    onClick={handleViewTickets}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Tickets
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* User Management Modal */}
      <UserManagementModal 
        isOpen={showUserManagement} 
        onClose={() => setShowUserManagement(false)} 
      />
    </div>
  );
};
