import React, { useState, useEffect } from 'react';
import { Header } from '@/components/navigation/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, AlertCircle, CheckCircle, Clock, TrendingUp, Settings, Search, Filter, Eye, UserPlus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Issue } from '@/types/issue';
import { AdminService } from '@/services/adminService';
import { UserManagementModal } from '@/components/admin/UserManagementModal';
import { TicketDetailsModal } from '@/components/admin/TicketDetailsModal';
import { AdvancedAnalytics } from '@/components/admin/AdvancedAnalytics';
import { EnhancedUserAssignment } from '@/components/admin/EnhancedUserAssignment';

type IssueWithAssignees = Issue & { assignees?: { user_id: string; role: string }[] };

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [tickets, setTickets] = useState<Issue[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Issue[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Issue | null>(null);

  // Initialize sample users on first load
  useEffect(() => {
    initializeSystem();
  }, []);

  const initializeSystem = async () => {
    console.log('🚀 Initializing admin system...');
    
    // Initialize sample users first
    try {
      await AdminService.initializeSampleUsers();
      console.log('✅ Sample users initialized');
    } catch (error) {
      console.error('❌ Error initializing sample users:', error);
    }

    // Then load tickets
    await loadTickets();
  };

  // Load tickets
  const loadTickets = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading tickets...');
      const ticketsData = await AdminService.getAllTickets();
      console.log(`✅ Loaded ${ticketsData.length} tickets`);
      setTickets(ticketsData);
      setFilteredTickets(ticketsData);
    } catch (error) {
      console.error('❌ Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tickets based on search and filters
  useEffect(() => {
    let filtered = tickets;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(ticket =>
        ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.issueDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.centreCode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.severity === severityFilter);
    }

    // City filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.city === cityFilter);
    }

    setFilteredTickets(filtered);
  }, [tickets, searchQuery, statusFilter, severityFilter, cityFilter]);

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

  // Get unique cities for filter
  const uniqueCities = Array.from(new Set(tickets.map(ticket => ticket.city)));

  // Analytics data
  const totalIssues = tickets.length;
  const openIssues = tickets.filter(issue => issue.status === 'open').length;
  const inProgressIssues = tickets.filter(issue => issue.status === 'in_progress').length;
  const resolvedIssues = tickets.filter(issue => issue.status === 'resolved').length;
  const unassignedIssues = tickets.filter(issue => !issue.assignedResolver).length;

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-4 md:space-y-6">
          <div className="text-center space-y-2 md:space-y-4">
            <h2 className="text-3xl font-bold">Super Admin Dashboard</h2>
            <p className="text-muted-foreground">Complete system management and analytics</p>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tickets">All Tickets</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <AlertCircle className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold">{totalIssues}</div>
                    <div className="text-sm text-muted-foreground">Total Tickets</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold">{openIssues}</div>
                    <div className="text-sm text-muted-foreground">Open</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold">{inProgressIssues}</div>
                    <div className="text-sm text-muted-foreground">In Progress</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{resolvedIssues}</div>
                    <div className="text-sm text-muted-foreground">Resolved</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="h-8 w-8 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold">{unassignedIssues}</div>
                    <div className="text-sm text-muted-foreground">Unassigned</div>
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
                      onClick={() => setShowUserManagement(true)}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Manage Users
                    </Button>
                    <Button 
                      onClick={loadTickets}
                      className="w-full justify-start" 
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
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
                        <Badge variant="destructive">{unassignedIssues}</Badge>
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
                        <Badge variant="default">95%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Resolution</span>
                        <Badge variant="outline">4.2h</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Users</span>
                        <Badge variant="secondary">24</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tickets" className="space-y-4">
              {/* Filters and Search */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search tickets..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severity</SelectItem>
                        <SelectItem value="sev1">SEV1</SelectItem>
                        <SelectItem value="sev2">SEV2</SelectItem>
                        <SelectItem value="sev3">SEV3</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="w-full md:w-40">
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
                </CardContent>
              </Card>

              {/* Enhanced User Assignment */}
              {selectedTickets.length > 0 && (
                <EnhancedUserAssignment
                  ticketIds={selectedTickets}
                  onAssignmentComplete={handleAssignmentComplete}
                />
              )}

              {/* Tickets Table */}
              <Card>
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
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTickets.map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTickets.includes(ticket.id)}
                                onCheckedChange={(checked) => handleTicketSelect(ticket.id, checked as boolean)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {ticket.issueDescription}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusColor(ticket.status)}>
                                {ticket.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getSeverityColor(ticket.severity)}>
                                {ticket.severity.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>{ticket.city}</TableCell>
                            <TableCell>{formatDate(ticket.submittedAt)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewTicket(ticket)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <AdvancedAnalytics />
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setShowUserManagement(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Open User Management
                  </Button>
                </CardContent>
              </Card>
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
      <UserManagementModal
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
      />

      <TicketDetailsModal
        isOpen={showTicketDetails}
        onClose={() => setShowTicketDetails(false)}
        ticket={selectedTicket}
        onTicketUpdate={loadTickets}
      />

      <footer className="border-t bg-muted/50 py-4 md:py-6 mt-8 md:mt-12">
        <div className="container mx-auto px-4 text-center text-xs md:text-sm text-muted-foreground">
          <p>© 2024 Awign Technologies. Issue Management System for TCS Examination Operations.</p>
          <p className="mt-1">For technical support, contact: support@awign.com</p>
        </div>
      </footer>
    </div>
  );
};
