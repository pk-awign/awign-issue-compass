import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, Users, AlertCircle, CheckCircle, Clock, MapPin, Building, UserCheck, RefreshCw } from 'lucide-react';
import { AdminService, type TicketAnalytics } from '@/services/adminService';

export const AdvancedAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<TicketAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAnalytics = async () => {
    setIsLoading(true);
    const data = await AdminService.getTicketAnalytics();
    setAnalytics(data);
    setIsLoading(false);
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

  if (!analytics) {
    return (
      <div className="text-center p-8">
        <p>No analytics data available</p>
        <Button onClick={loadAnalytics} className="mt-4">
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
  ];

  const severityData = [
    { name: 'SEV1', value: analytics.sev1Tickets, color: '#ef4444' },
    { name: 'SEV2', value: analytics.sev2Tickets, color: '#f97316' },
    { name: 'SEV3', value: analytics.sev3Tickets, color: '#22c55e' },
  ];

  const assignmentData = [
    { name: 'Assigned', value: analytics.assignedTickets },
    { name: 'Unassigned', value: analytics.unassignedTickets },
  ];

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

      {/* Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severity Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={severityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assignment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={assignmentData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.cityBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="city" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.centreBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="centreCode" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Resolver Workload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.resolverBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="resolver" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
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
                <Button onClick={loadAnalytics} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
                <Button variant="outline" className="w-full">
                  Export Report
                </Button>
                <Button variant="outline" className="w-full">
                  Schedule Report
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
    </div>
  );
};
