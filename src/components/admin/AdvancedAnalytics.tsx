import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend } from 'recharts';
import { TrendingUp, Users, AlertCircle, CheckCircle, Clock, MapPin, Building, UserCheck, RefreshCw, UserCog, FileText, BarChart3, Activity, Zap, Target, AlertTriangle, XCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { AdminService, type TicketAnalytics } from '@/services/adminService';
import { UserManagementModal } from './UserManagementModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface UserAssignment {
  userId: string;
  name: string;
  role: 'resolver' | 'approver' | 'ticket_admin';
  count: number;
}

export const AdvancedAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<TicketAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [userAssignments, setUserAssignments] = useState<UserAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'role'>('count');
  const [roleFilter, setRoleFilter] = useState<'all' | 'resolver' | 'approver' | 'ticket_admin'>('all');
  const navigate = useNavigate();
  const { user, isTicketAdmin } = useAuth();

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data;
      if (isTicketAdmin && user?.id) {
        // For ticket admin, load filtered analytics
        data = await AdminService.getTicketAnalyticsForAdmin(user.id);
      } else {
        // For super admin, load all analytics
        data = await AdminService.getTicketAnalytics();
      }
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

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

      // Fetch all ticket assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('ticket_assignees')
        .select('user_id, role')
        .in('role', ['resolver', 'approver', 'ticket_admin']);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        setIsLoadingAssignments(false);
        return;
      }

      // Count total assignments per user (across all roles)
      const assignmentCounts = new Map<string, number>();
      (assignments || []).forEach((assignment: any) => {
        const currentCount = assignmentCounts.get(assignment.user_id) || 0;
        assignmentCounts.set(assignment.user_id, currentCount + 1);
      });

      // Create user assignments array - show each user once with their primary role
      const allUsers: UserAssignment[] = Array.from(allUsersMap.values()).map(user => {
        // Determine primary role (prefer resolver > approver > ticket_admin)
        let primaryRole: 'resolver' | 'approver' | 'ticket_admin' = 'resolver';
        if (user.roles.includes('resolver')) {
          primaryRole = 'resolver';
        } else if (user.roles.includes('approver')) {
          primaryRole = 'approver';
        } else if (user.roles.includes('ticket_admin')) {
          primaryRole = 'ticket_admin';
        }

        return {
          userId: user.id,
          name: user.name,
          role: primaryRole,
          count: assignmentCounts.get(user.id) || 0,
        };
      });

      setUserAssignments(allUsers);
    } catch (error) {
      console.error('Error loading user assignments:', error);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center p-8">
        <p>No analytics data available</p>
        <Button onClick={loadAnalytics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  const statusData = [
    { name: 'Open', value: analytics.openTickets, color: '#ef4444' },
    { name: 'In Progress', value: analytics.inProgressTickets, color: '#f97316' },
    { name: 'User Dependency', value: analytics.userDependencyTickets, color: '#8b5cf6' },
    { name: 'Ops Input Required', value: analytics.opsInputRequiredTickets, color: '#f59e0b' },
    { name: 'Approved', value: analytics.approvedTickets, color: '#10b981' },
    { name: 'Send for Approval', value: analytics.sendForApprovalTickets, color: '#3b82f6' },
    { name: 'Resolved', value: analytics.resolvedTickets, color: '#22c55e' },
    { name: 'Closed', value: analytics.closedTickets, color: '#6b7280' },
  ].filter(item => item.value > 0); // Only show non-zero values

  const severityData = [
    { name: 'SEV1', value: analytics.sev1Tickets, color: '#ef4444' },
    { name: 'SEV2', value: analytics.sev2Tickets, color: '#f97316' },
    { name: 'SEV3', value: analytics.sev3Tickets, color: '#22c55e' },
  ].filter(item => item.value > 0); // Only show non-zero values

  const assignmentData = [
    { name: 'Assigned', value: analytics.assignedTickets },
    { name: 'Unassigned', value: analytics.unassignedTickets },
  ];

  // Check if we have any data to display
  const hasData = analytics.totalTickets > 0;

  // Calculate additional metrics
  const pendingActions = analytics.userDependencyTickets + analytics.opsInputRequiredTickets + 
    analytics.opsUserDependencyTickets + analytics.sendForApprovalTickets;
  const activeTickets = analytics.openTickets + analytics.inProgressTickets;
  const resolutionRate = analytics.totalTickets > 0 
    ? Math.round((analytics.resolvedTickets / analytics.totalTickets) * 100) 
    : 0;
  const assignmentRate = analytics.totalTickets > 0 
    ? Math.round((analytics.assignedTickets / analytics.totalTickets) * 100) 
    : 0;
  const slaComplianceRate = analytics.totalTickets > 0
    ? Math.round(((analytics.totalTickets - analytics.slaBreachedTickets) / analytics.totalTickets) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards - Enhanced Design */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Tickets</p>
                <p className="text-2xl font-bold">{analytics.totalTickets.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Open</p>
                <p className="text-2xl font-bold text-red-600">{analytics.openTickets.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.inProgressTickets.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{analytics.resolvedTickets.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{resolutionRate}% resolution rate</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Assigned</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.assignedTickets.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{assignmentRate}% assigned</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Avg Resolution</p>
                <p className="text-2xl font-bold text-yellow-600">{Math.round(analytics.avgResolutionHours)}h</p>
                <p className="text-xs text-muted-foreground mt-1">Average time</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 mb-1">Pending Actions</p>
                <p className="text-xl font-bold text-blue-900">{pendingActions}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 text-xs text-blue-700">
              <div>User: {analytics.userDependencyTickets}</div>
              <div>Ops: {analytics.opsInputRequiredTickets}</div>
              <div>Ops+User: {analytics.opsUserDependencyTickets}</div>
              <div>Approval: {analytics.sendForApprovalTickets}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-700 mb-1">SLA Breached</p>
                <p className="text-xl font-bold text-red-900">{analytics.slaBreachedTickets}</p>
                <p className="text-xs text-red-700 mt-1">{slaComplianceRate}% compliance</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-700 mb-1">Unassigned</p>
                <p className="text-xl font-bold text-orange-900">{analytics.unassignedTickets}</p>
                <p className="text-xs text-orange-700 mt-1">Requires attention</p>
              </div>
              <XCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 mb-1">Active Tickets</p>
                <p className="text-xl font-bold text-green-900">{activeTickets}</p>
                <p className="text-xs text-green-700 mt-1">Open + In Progress</p>
              </div>
              <Zap className="h-8 w-8 text-green-600" />
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
          <TabsList className="grid w-full grid-cols-2 gap-2 p-2 bg-muted rounded-xl border shadow-md my-4 md:grid-cols-4 md:gap-0 md:p-1">
            <TabsTrigger value="overview" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Overview</TabsTrigger>
            <TabsTrigger value="distribution" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Distribution</TabsTrigger>
            <TabsTrigger value="performance" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Performance</TabsTrigger>
            <TabsTrigger value="details" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Status Overview - Enhanced */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Ticket Status Distribution
                    </CardTitle>
                    <Badge variant="outline">{statusData.length} statuses</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent, value }) => 
                              `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                            }
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [`${value} tickets`, 'Count']}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => value}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t">
                        {statusData.slice(0, 4).map((item) => (
                          <div key={item.name} className="text-center">
                            <div className="text-sm font-semibold" style={{ color: item.color }}>
                              {item.value}
                            </div>
                            <div className="text-xs text-muted-foreground">{item.name}</div>
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

              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Severity Breakdown
                    </CardTitle>
                    <Badge variant="outline">{severityData.length} levels</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {severityData.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={severityData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis dataKey="name" type="category" width={60} />
                          <Tooltip 
                            formatter={(value: any) => [`${value} tickets`, 'Count']}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                            {severityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                        {severityData.map((item) => (
                          <div key={item.name} className="text-center">
                            <div className="text-lg font-bold" style={{ color: item.color }}>
                              {item.value}
                            </div>
                            <div className="text-xs text-muted-foreground">{item.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
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
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Assignment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                    <div className="text-3xl font-bold text-green-700 mb-1">
                      {analytics.assignedTickets.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-green-800">Assigned Tickets</div>
                    <div className="text-xs text-green-600 mt-1">
                      {assignmentRate}% of total
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 text-center">
                    <div className="text-3xl font-bold text-orange-700 mb-1">
                      {analytics.unassignedTickets.toLocaleString()}
                    </div>
                    <div className="text-sm font-medium text-orange-800">Unassigned Tickets</div>
                    <div className="text-xs text-orange-600 mt-1">
                      {100 - assignmentRate}% of total
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
                    <div className="text-3xl font-bold text-blue-700 mb-1">
                      {analytics.resolverBreakdown.length}
                    </div>
                    <div className="text-sm font-medium text-blue-800">Active Resolvers</div>
                    <div className="text-xs text-blue-600 mt-1">
                      {analytics.resolverBreakdown.length > 0 
                        ? `Avg ${Math.round(analytics.assignedTickets / analytics.resolverBreakdown.length)} per resolver`
                        : 'No resolvers'}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200 text-center">
                    <div className="text-3xl font-bold text-purple-700 mb-1">
                      {analytics.approverBreakdown.length}
                    </div>
                    <div className="text-sm font-medium text-purple-800">Active Approvers</div>
                    <div className="text-xs text-purple-600 mt-1">
                      {analytics.approverBreakdown.length > 0 
                        ? `Avg ${Math.round(analytics.assignedTickets / analytics.approverBreakdown.length)} per approver`
                        : 'No approvers'}
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Overall Assignment Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${assignmentRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-primary w-12 text-right">
                        {assignmentRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Assignment Distribution</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                      <SelectTrigger className="w-[140px]">
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
                      <SelectTrigger className="w-[140px]">
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
                        return '#22c55e'; // green
                      case 'approver':
                        return '#3b82f6'; // blue
                      case 'ticket_admin':
                        return '#8b5cf6'; // purple
                      default:
                        return '#6b7280'; // gray
                    }
                  };

                  // Get role badge
                  const getRoleBadge = (role: string) => {
                    switch (role) {
                      case 'resolver':
                        return <Badge className="bg-green-100 text-green-800">Resolver</Badge>;
                      case 'approver':
                        return <Badge className="bg-blue-100 text-blue-800">Approver</Badge>;
                      case 'ticket_admin':
                        return <Badge className="bg-purple-100 text-purple-800">Ticket Admin</Badge>;
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
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              type="number" 
                              allowDecimals={false} 
                              domain={[0, 'auto']}
                              label={{ value: 'Number of Tickets', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis 
                              dataKey="name" 
                              type="category" 
                              width={180}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar 
                              dataKey="count" 
                              radius={[0, 8, 8, 0]}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getRoleColor(entry.role)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Summary Stats - Show complete data from all users */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {userAssignments.length}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Users</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {userAssignments.filter(u => u.count > 0).length}
                          </div>
                          <div className="text-xs text-muted-foreground">Users with Assignments</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {userAssignments.filter(u => u.count === 0).length}
                          </div>
                          <div className="text-xs text-muted-foreground">Users without Assignments</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {userAssignments.reduce((sum, u) => sum + u.count, 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Assignments</div>
                        </div>
                      </div>

                      {/* Table View (Compact) */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-[300px] overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[40px]">#</TableHead>
                                <TableHead>User Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Tickets Assigned</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sorted.map((user, index) => (
                                <TableRow key={`${user.userId}_${user.role}`}>
                                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                  <TableCell className="font-medium">{user.name}</TableCell>
                                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={`font-semibold ${user.count > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                                      {user.count}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
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

          <TabsContent value="distribution" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      City-wise Distribution
                    </CardTitle>
                    <Badge variant="outline">{analytics.cityBreakdown.length} cities</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {analytics.cityBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analytics.cityBreakdown.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis 
                            dataKey="city" 
                            type="category" 
                            width={120}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            formatter={(value: any) => [`${value} tickets`, 'Count']}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                      {analytics.cityBreakdown.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing top 10 cities. Total: {analytics.cityBreakdown.length} cities
                        </p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t">
                        {analytics.cityBreakdown.slice(0, 6).map((item) => (
                          <div key={item.city} className="text-center p-2 rounded bg-blue-50">
                            <div className="text-sm font-bold text-blue-700">{item.count}</div>
                            <div className="text-xs text-blue-600 truncate">{item.city}</div>
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

              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Building className="h-5 w-5 text-orange-600" />
                      Centre-wise Distribution
                    </CardTitle>
                    <Badge variant="outline">{analytics.centreBreakdown.length} centres</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {analytics.centreBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analytics.centreBreakdown.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis 
                            dataKey="centreCode" 
                            type="category" 
                            width={80}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            formatter={(value: any) => [`${value} tickets`, 'Count']}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#f97316" />
                        </BarChart>
                      </ResponsiveContainer>
                      {analytics.centreBreakdown.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing top 10 centres. Total: {analytics.centreBreakdown.length} centres
                        </p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t">
                        {analytics.centreBreakdown.slice(0, 6).map((item) => (
                          <div key={item.centreCode} className="text-center p-2 rounded bg-orange-50">
                            <div className="text-sm font-bold text-orange-700">{item.count}</div>
                            <div className="text-xs text-orange-600">Centre {item.centreCode}</div>
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

          <TabsContent value="performance" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      Resolver Workload
                    </CardTitle>
                    <Badge variant="outline">{analytics.resolverBreakdown.length} resolvers</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {analytics.resolverBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analytics.resolverBreakdown.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis 
                            dataKey="resolver" 
                            type="category" 
                            width={150}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            formatter={(value: any) => [`${value} tickets`, 'Assigned']}
                            labelFormatter={(label) => `Resolver: ${label}`}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#22c55e" />
                        </BarChart>
                      </ResponsiveContainer>
                      {analytics.resolverBreakdown.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing top 10 resolvers. Total: {analytics.resolverBreakdown.length} resolvers
                        </p>
                      )}
                      <div className="pt-2 border-t">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Top Performers</div>
                        <div className="space-y-1">
                          {analytics.resolverBreakdown.slice(0, 3).map((item, idx) => (
                            <div key={item.resolver} className="flex items-center justify-between p-2 rounded bg-green-50">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-green-700">#{idx + 1}</span>
                                <span className="text-sm font-medium">{item.resolver}</span>
                              </div>
                              <Badge className="bg-green-600">{item.count} tickets</Badge>
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

              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-blue-600" />
                      Approver Workload
                    </CardTitle>
                    <Badge variant="outline">{analytics.approverBreakdown.length} approvers</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {analytics.approverBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={analytics.approverBreakdown.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis 
                            dataKey="approver" 
                            type="category" 
                            width={150}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            formatter={(value: any) => [`${value} tickets`, 'Assigned']}
                            labelFormatter={(label) => `Approver: ${label}`}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                      {analytics.approverBreakdown.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing top 10 approvers. Total: {analytics.approverBreakdown.length} approvers
                        </p>
                      )}
                      <div className="pt-2 border-t">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Top Performers</div>
                        <div className="space-y-1">
                          {analytics.approverBreakdown.slice(0, 3).map((item, idx) => (
                            <div key={item.approver} className="flex items-center justify-between p-2 rounded bg-blue-50">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-700">#{idx + 1}</span>
                                <span className="text-sm font-medium">{item.approver}</span>
                              </div>
                              <Badge className="bg-blue-600">{item.count} tickets</Badge>
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

            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Assignment Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-gray-50 border flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Tickets</span>
                      <Badge variant="outline" className="text-base font-semibold">{analytics.totalTickets.toLocaleString()}</Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">Assigned</span>
                      <Badge className="bg-green-600 text-base font-semibold">{analytics.assignedTickets.toLocaleString()}</Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-800">Unassigned</span>
                      <Badge variant={analytics.unassignedTickets > 0 ? "destructive" : "secondary"} className="text-base font-semibold">
                        {analytics.unassignedTickets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-800">Assignment Rate</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {assignmentRate}%
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-purple-800">Active Resolvers</span>
                      <Badge variant="secondary" className="text-base font-semibold">{analytics.resolverBreakdown.length}</Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-indigo-800">Active Approvers</span>
                      <Badge variant="secondary" className="text-base font-semibold">{analytics.approverBreakdown.length}</Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-teal-800">Avg Tickets per Resolver</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {analytics.resolverBreakdown.length > 0 
                          ? Math.round(analytics.assignedTickets / analytics.resolverBreakdown.length).toLocaleString()
                          : '0'}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-cyan-800">Avg Tickets per Approver</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {analytics.approverBreakdown.length > 0 
                          ? Math.round(analytics.assignedTickets / analytics.approverBreakdown.length).toLocaleString()
                          : '0'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* SLA Compliance - Enhanced */}
              <Card className="shadow-md border-l-4 border-l-red-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-600" />
                    SLA Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-red-800">Breached</span>
                      <Badge variant="destructive" className="text-base font-semibold">
                        {analytics.slaBreachedTickets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-green-800">On Time</span>
                      <Badge variant="secondary" className="text-base font-semibold bg-green-600">
                        {(analytics.totalTickets - analytics.slaBreachedTickets).toLocaleString()}
                      </Badge>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-900 mb-1">
                          {slaComplianceRate}%
                        </div>
                        <div className="text-xs font-medium text-blue-700">Compliance Rate</div>
                        <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${slaComplianceRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Health - Enhanced */}
              <Card className="shadow-md border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-600" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-800">Active Tickets</span>
                      <Badge variant="default" className="text-base font-semibold bg-blue-600">
                        {activeTickets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-800">Unassigned</span>
                      <Badge variant={analytics.unassignedTickets > 0 ? "destructive" : "secondary"} className="text-base font-semibold">
                        {analytics.unassignedTickets.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-purple-800">Avg Resolution</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {Math.round(analytics.avgResolutionHours)}h
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex justify-between items-center">
                      <span className="text-sm font-medium text-yellow-800">Pending Actions</span>
                      <Badge variant="outline" className="text-base font-semibold">
                        {pendingActions.toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions - Enhanced */}
              <Card className="shadow-md border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={() => setShowUserManagement(true)} 
                    variant="outline" 
                    className="w-full justify-start hover:bg-blue-50"
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button 
                    onClick={loadAnalytics} 
                    variant="outline" 
                    className="w-full justify-start hover:bg-blue-50"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Refreshing...' : 'Refresh Data'}
                  </Button>
                  <Button 
                    onClick={handleViewTickets} 
                    variant="outline" 
                    className="w-full justify-start hover:bg-blue-50"
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
