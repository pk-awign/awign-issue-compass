import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, Users, AlertCircle, CheckCircle, Clock, MapPin, Building, UserCheck, RefreshCw, UserCog, FileText, BarChart3 } from 'lucide-react';
import { AdminService, type TicketAnalytics } from '@/services/adminService';
import { UserManagementModal } from './UserManagementModal';
import { useNavigate } from 'react-router-dom';

export const AdvancedAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<TicketAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const navigate = useNavigate();

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await AdminService.getTicketAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewTickets = () => {
    // Navigate to the admin page with tickets tab active
    console.log('🚀 Navigating to tickets view...');
    navigate('/admin?tab=tickets');
    console.log('✅ Navigation triggered to /admin?tab=tickets');
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{analytics.totalTickets}</div>
            <div className="text-xs text-muted-foreground">Total Tickets</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="text-2xl font-bold">{analytics.openTickets}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <div className="text-2xl font-bold">{analytics.inProgressTickets}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{analytics.resolvedTickets}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <UserCheck className="h-6 w-6 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{analytics.assignedTickets}</div>
            <div className="text-xs text-muted-foreground">Assigned</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">{Math.round(analytics.avgResolutionHours)}h</div>
            <div className="text-xs text-muted-foreground">Avg Resolution</div>
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

          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No status data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Severity Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {severityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={severityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No severity data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Assignment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analytics.assignedTickets}</div>
                    <div className="text-sm text-muted-foreground">Assigned Tickets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{analytics.unassignedTickets}</div>
                    <div className="text-sm text-muted-foreground">Unassigned Tickets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analytics.resolverBreakdown.length}</div>
                    <div className="text-sm text-muted-foreground">Active Resolvers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{analytics.approverBreakdown.length}</div>
                    <div className="text-sm text-muted-foreground">Active Approvers</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    Assignment Rate: {analytics.totalTickets > 0 ? Math.round((analytics.assignedTickets / analytics.totalTickets) * 100) : 0}%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assignment Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Prepare and filter data
                  const assignmentData = [
                    ...analytics.resolverBreakdown.map(item => ({ 
                      name: item.resolver ? `${item.resolver} (Resolver)` : '', 
                      count: item.count 
                    })),
                    ...analytics.approverBreakdown.map(item => ({ 
                      name: item.approver ? `${item.approver} (Approver)` : '', 
                      count: item.count 
                    }))
                  ].filter(item => item.name && item.count > 0);

                  if (assignmentData.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                        No assignment data available
                      </div>
                    );
                  }

                  // Custom tooltip
                  const CustomTooltip = ({ active, payload, label }: any) => {
                    if (active && payload && payload.length && label && label !== '0') {
                      return (
                        <div className="bg-white p-2 rounded shadow text-sm border">
                          <div className="font-semibold">{label}</div>
                          <div>Assigned: {payload[0].value} tickets</div>
                        </div>
                      );
                    }
                    return null;
                  };

                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={assignmentData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} domain={[0, 'auto']} />
                        <YAxis dataKey="name" type="category" width={180} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    City-wise Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.cityBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.cityBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="city" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No city data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Centre-wise Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.centreBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.centreBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="centreCode" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f97316" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No centre data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Resolver Workload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.resolverBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.resolverBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="resolver" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [`${value} tickets`, 'Assigned']}
                          labelFormatter={(label) => `Resolver: ${label}`}
                        />
                        <Bar dataKey="count" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No resolver data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Approver Workload
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.approverBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.approverBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="approver" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [`${value} tickets`, 'Assigned']}
                          labelFormatter={(label) => `Approver: ${label}`}
                        />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No approver data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Assignment Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Tickets</span>
                      <Badge variant="outline">{analytics.totalTickets}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Assigned</span>
                      <Badge variant="default">{analytics.assignedTickets}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Unassigned</span>
                      <Badge variant={analytics.unassignedTickets > 0 ? "destructive" : "secondary"}>
                        {analytics.unassignedTickets}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Assignment Rate</span>
                      <Badge variant="outline">
                        {analytics.totalTickets > 0 ? Math.round((analytics.assignedTickets / analytics.totalTickets) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Active Resolvers</span>
                      <Badge variant="secondary">{analytics.resolverBreakdown.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Active Approvers</span>
                      <Badge variant="secondary">{analytics.approverBreakdown.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Avg Tickets per Resolver</span>
                      <Badge variant="outline">
                        {analytics.resolverBreakdown.length > 0 ? Math.round(analytics.assignedTickets / analytics.resolverBreakdown.length) : 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Avg Tickets per Approver</span>
                      <Badge variant="outline">
                        {analytics.approverBreakdown.length > 0 ? Math.round(analytics.assignedTickets / analytics.approverBreakdown.length) : 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* SLA Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">SLA Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Breached</span>
                      <Badge variant="destructive">{analytics.slaBreachedTickets}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">On Time</span>
                      <Badge variant="secondary">
                        {analytics.totalTickets - analytics.slaBreachedTickets}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Compliance Rate</span>
                      <Badge variant="default">
                        {Math.round(((analytics.totalTickets - analytics.slaBreachedTickets) / analytics.totalTickets) * 100)}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    onClick={() => setShowUserManagement(true)} 
                    variant="outline" 
                    className="w-full"
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button 
                    onClick={loadAnalytics} 
                    variant="outline" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Refreshing...' : 'Refresh Data'}
                  </Button>
                  <Button 
                    onClick={handleViewTickets} 
                    variant="outline" 
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Tickets
                  </Button>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Active Tickets</span>
                      <Badge variant="default">
                        {analytics.openTickets + analytics.inProgressTickets}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Unassigned</span>
                      <Badge variant={analytics.unassignedTickets > 0 ? "destructive" : "secondary"}>
                        {analytics.unassignedTickets}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Resolution</span>
                      <Badge variant="outline">
                        {Math.round(analytics.avgResolutionHours)}h
                      </Badge>
                    </div>
                  </div>
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
