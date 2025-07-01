import React, { useState, useEffect } from 'react';
import { Header } from '@/components/navigation/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, AlertCircle, CheckCircle, Clock, TrendingUp, Settings, Search, Filter, Eye, UserPlus, RefreshCw, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Issue } from '@/types/issue';
import { AdminService } from '@/services/adminService';
import { UserManagementModal } from '@/components/admin/UserManagementModal';
import { TicketDetailsModal } from '@/components/admin/TicketDetailsModal';
import { AdvancedAnalytics } from '@/components/admin/AdvancedAnalytics';
import { EnhancedUserAssignment } from '@/components/admin/EnhancedUserAssignment';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';

type IssueWithAssignees = Issue & { assignees?: { user_id: string; role: string }[] };

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get the tab parameter from URL
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'tickets' ? 'tickets' : 'overview';
  
  // State management
  const [tickets, setTickets] = useState<Issue[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Issue[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Modal states
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Issue | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  // Update active tab when URL changes
  useEffect(() => {
    const newTabParam = searchParams.get('tab');
    const newDefaultTab = newTabParam === 'tickets' ? 'tickets' : 'overview';
    setActiveTab(newDefaultTab);
    console.log('🔄 URL changed, setting active tab to:', newDefaultTab);
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

  // Initialize sample users on first load
  useEffect(() => {
    initializeSystem();
    loadAnalytics();
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

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading tickets...');
      const ticketsData = await AdminService.getAllTickets(showDeleted);
      console.log('Tickets loaded:', ticketsData); // Debug log
      setTickets(ticketsData);
      setFilteredTickets(ticketsData);
    } catch (error) {
      console.error('❌ Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await AdminService.getTicketAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
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
    if (!ticketsToDownload.length) return;
    const headers = [
      'Ticket Number', 'Centre Code', 'City', 'Resource ID', 'Issue Category', 'Description', 'Severity', 'Status', 'Submitted By', 'Submitted At', 'Deleted'
    ];
    const rows = ticketsToDownload.map(t => [
      t.ticketNumber, t.centreCode, t.city, t.resourceId, t.issueCategory, t.issueDescription, t.severity, t.status, t.submittedBy, t.submittedAt ? new Date(t.submittedAt).toISOString() : '', t.deleted ? 'Yes' : 'No'
    ]);
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

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-4 md:space-y-6">
          <div className="text-center space-y-2 md:space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Super Admin Dashboard</h2>
            <p className="text-muted-foreground">Complete system management and analytics</p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="flex flex-col items-center gap-2 w-full p-2 bg-muted rounded-xl border shadow-md my-4 md:grid md:grid-cols-5 md:gap-0 md:p-1">
              <TabsTrigger value="overview" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Overview</TabsTrigger>
              <TabsTrigger value="tickets" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">All Tickets</TabsTrigger>
              <TabsTrigger value="analytics" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Analytics</TabsTrigger>
              <TabsTrigger value="users" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">User Management</TabsTrigger>
              <TabsTrigger value="settings" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                    <div className="text-sm text-muted-foreground">In Progress</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics ? analytics.resolvedTickets : '-'}</div>
                    <div className="text-sm text-muted-foreground">Resolved</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="h-8 w-8 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics ? analytics.unassignedTickets : '-'}</div>
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
                    <Button 
                      onClick={() => handleTabChange('tickets')}
                      className="w-full justify-start" 
                      variant="outline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Tickets
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
            </TabsContent>

            <TabsContent value="tickets" className="space-y-4">
              {/* Filters and Search */}
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Search Bar - Full Width */}
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Filters - Grid Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
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
                        <SelectTrigger>
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
                        <SelectTrigger>
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
                  </div>
                </CardContent>
              </Card>

              {/* Show Deleted Tickets Toggle and Download Button */}
              <div className="flex items-center gap-4 mb-4">
                <Switch
                  id="show-deleted"
                  checked={showDeleted}
                  onCheckedChange={(checked) => setShowDeleted(checked)}
                />
                <label htmlFor="show-deleted" className="text-sm font-medium">
                  {showDeleted ? 'Showing Deleted Tickets' : 'Hide Deleted Tickets'}
                </label>
                <Button onClick={() => downloadTicketsAsCSV(filteredTickets)} variant="outline">
                  Download Tickets
                </Button>
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
                      <Card key={ticket.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold">{ticket.ticketNumber}</span>
                            {ticket.deleted && (
                              <span className="ml-2" title="This ticket is soft deleted">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold gap-1">
                                  <Trash2 className="h-3 w-3" />DELETED
                                </span>
                              </span>
                            )}
                            <Badge variant={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant={getSeverityColor(ticket.severity)}>
                              {ticket.severity.toUpperCase()}
                            </Badge>
                          </div>
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
                              <TableCell colSpan={8} className="text-center">No tickets found.</TableCell>
                            </TableRow>
                          ) : (
                            filteredTickets.map((ticket) => (
                              <TableRow key={ticket.id}>
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
                                    {ticket.status.replace('_', ' ').toUpperCase()}
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
          <p>© 2024 Awign Technologies. Escalation Management System for TCS Examination Operations.</p>
          <p className="mt-1">For technical support, contact: support@awign.com</p>
        </div>
      </footer>
    </div>
  );
};
