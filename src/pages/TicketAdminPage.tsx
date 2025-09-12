import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/navigation/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, AlertCircle, CheckCircle, Clock, TrendingUp, Settings, Search, Filter, Eye, UserPlus, RefreshCw, FileText, Trash2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Issue } from '@/types/issue';
import { AdminService } from '@/services/adminService';
import { TicketDetailsModal } from '@/components/admin/TicketDetailsModal';
import { AdvancedAnalytics } from '@/components/admin/AdvancedAnalytics';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const TicketAdminPage: React.FC = () => {
  const { user, logout, loading, isTicketAdmin } = useAuth();
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [analytics, setAnalytics] = useState<any>(null);
  const [resolverFilter, setResolverFilter] = useState<string>('all');
  const [resolvers, setResolvers] = useState<{ id: string; name: string }[]>([]);
  const [resourceIdFilter, setResourceIdFilter] = useState<string[]>([]);
  const [resourceIds, setResourceIds] = useState<{ value: string; label: string }[]>([]);
  
  // Modal states
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Issue | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadType, setDownloadType] = useState<'all' | 'detailed' | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [downloadAll, setDownloadAll] = useState(false);

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
    console.log('🔄 URL changed, setting active tab to:', newDefaultTab);
  }, [searchParams]);

  // Handle tab changes and update URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === 'tickets') {
      navigate('/ticket-admin?tab=tickets', { replace: true });
    } else {
      navigate('/ticket-admin', { replace: true });
    }
  };

  // Initialize system
  useEffect(() => {
    initializeSystem();
    loadAnalytics();
  }, []);

  const initializeSystem = async () => {
    console.log('🚀 Initializing ticket admin system...');
    await loadTickets();
  };

  const loadTickets = async (refresh = false) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // For ticket admin, only load assigned tickets
      const assignedTickets = await AdminService.getTicketsAssignedToAdmin(user.id);
      setTickets(assignedTickets);
      setFilteredTickets(assignedTickets);
      setTotalTickets(assignedTickets.length);
      console.log(`✅ Loaded ${assignedTickets.length} assigned tickets for ticket admin`);
    } catch (error) {
      console.error('❌ Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      // For ticket admin, load filtered analytics
      const analyticsData = await AdminService.getTicketAnalyticsForAdmin(user?.id || '');
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleTicketSelect = (ticketId: string, checked: boolean) => {
    if (checked) {
      setSelectedTickets(prev => [...prev, ticketId]);
    } else {
      setSelectedTickets(prev => prev.filter(id => id !== ticketId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(filteredTickets.map(t => t.id));
    } else {
      setSelectedTickets([]);
    }
  };

  const handleViewTicket = (ticket: Issue) => {
    setSelectedTicket(ticket);
    setShowTicketDetails(true);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }

    setDeletingTicketId(ticketId);
    try {
      // For ticket admin, only allow deletion of assigned tickets
      const success = await AdminService.deleteTicket(ticketId);
      if (success) {
        toast.success('Ticket deleted successfully');
        loadTickets(true);
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

  // Filter tickets based on search and filters
  useEffect(() => {
    let filtered = tickets;

    // Apply search filter
    if (searchQuery) {
      const searchTerms = searchQuery.split(',').map(term => term.trim()).filter(term => term.length > 0);
      
      filtered = filtered.filter(ticket => {
        // Check if any search term matches
        return searchTerms.some(term => {
          const lowerTerm = term.toLowerCase();
          const lowerTicketNumber = ticket.ticketNumber.toLowerCase();
          const lowerDescription = ticket.issueDescription.toLowerCase();
          const lowerCity = ticket.city.toLowerCase();
          const lowerCentreCode = ticket.centreCode.toLowerCase();
          
          // If the search term looks like a ticket number (contains AWG), prioritize exact ticket number matching
          if (lowerTerm.includes('awg') || lowerTerm.includes('awg-')) {
            return lowerTicketNumber.includes(lowerTerm);
          }
          
          // Otherwise, search across all fields
          return lowerTicketNumber.includes(lowerTerm) ||
                 lowerDescription.includes(lowerTerm) ||
                 lowerCity.includes(lowerTerm) ||
                 lowerCentreCode.includes(lowerTerm);
        });
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Apply severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.severity === severityFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.issueCategory === categoryFilter);
    }

    // Apply city filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.city === cityFilter);
    }

    setFilteredTickets(filtered);
  }, [tickets, searchQuery, statusFilter, severityFilter, categoryFilter, cityFilter]);

  // Download functionality for ticket admin (filtered to assigned tickets)
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
    a.download = 'assigned_tickets.csv';
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
        } else if (ticket.issueDate?.type === 'single' && ticket.issueDate.dates && ticket.issueDate.dates.length > 0) {
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
      a.download = 'detailed_assigned_tickets.csv';
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
        // For ticket admin, only download assigned tickets
        const assignedTickets = await AdminService.getTicketsAssignedToAdmin(user?.id || '');
        const filteredTickets = downloadAll 
          ? assignedTickets
          : assignedTickets.filter(ticket => {
              const ticketDate = new Date(ticket.submittedAt);
              const fromDate = dateRange?.from;
              const toDate = dateRange?.to;
              return (!fromDate || ticketDate >= fromDate) && (!toDate || ticketDate <= toDate);
            });
        downloadTicketsAsCSV(filteredTickets);
        toast.success("Assigned tickets downloaded successfully!");
      } else if (downloadType === 'detailed') {
        const assignedTickets = await AdminService.getTicketsAssignedToAdmin(user?.id || '');
        const filteredTickets = downloadAll 
          ? assignedTickets
          : assignedTickets.filter(ticket => {
              const ticketDate = new Date(ticket.submittedAt);
              const fromDate = dateRange?.from;
              const toDate = dateRange?.to;
              return (!fromDate || ticketDate >= fromDate) && (!toDate || ticketDate <= toDate);
            });
        downloadDetailedTickets(filteredTickets);
        toast.success("Detailed assigned tickets downloaded successfully!");
      }
    } catch (error) {
      console.error(`Error downloading ${downloadType} tickets:`, error);
      toast.error(`Failed to download ${downloadType} tickets. Please try again.`);
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
    }
  };

  // Place the early return after all hooks
  if (loading) {
    return <div style={{textAlign: 'center', marginTop: '2rem'}}>Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!isTicketAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-4 md:space-y-6">
          <div className="text-center space-y-2 md:space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Ticket Admin Dashboard</h2>
            <p className="text-muted-foreground">Manage your assigned tickets and analytics</p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="flex flex-col items-center gap-2 w-full p-2 bg-muted rounded-xl border shadow-md my-4 md:grid md:grid-cols-3 md:gap-0 md:p-1">
              <TabsTrigger value="overview" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Overview</TabsTrigger>
              <TabsTrigger value="tickets" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Escalated Tickets</TabsTrigger>
              <TabsTrigger value="analytics" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                      View Escalated Tickets
                    </Button>
                    <Button 
                      onClick={() => openDownloadDialog('all')}
                      className="w-full justify-start" 
                      variant="outline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download Assigned Tickets
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Assigned:</span>
                        <Badge variant="secondary">{totalTickets}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Open:</span>
                        <Badge variant="destructive">{tickets.filter(t => t.status === 'open').length}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>In Progress:</span>
                        <Badge variant="default">{tickets.filter(t => t.status === 'in_progress').length}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Resolved:</span>
                        <Badge variant="secondary">{tickets.filter(t => t.status === 'resolved').length}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {tickets.length > 0 
                          ? `Last updated: ${format(new Date(tickets[0]?.submittedAt || new Date()), 'MMM dd, yyyy HH:mm')}`
                          : 'No recent activity'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tickets">
              <Card>
                <CardHeader>
                  <CardTitle>Escalated Tickets</CardTitle>
                  <CardDescription>
                    {/* Removed: Manage tickets assigned to you ({filteredTickets.length} tickets) */}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search tickets by number (comma-separated), description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="send_for_approval">Send for Approval</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="w-full md:w-32">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severity</SelectItem>
                        <SelectItem value="sev1">Sev 1</SelectItem>
                        <SelectItem value="sev2">Sev 2</SelectItem>
                        <SelectItem value="sev3">Sev 3</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => openDownloadDialog('all')} variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  {/* Tickets Table */}
                  <div className="border rounded-lg">
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
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
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
                            <TableCell>
                              <Badge variant="outline">
                                {ticket.issueCategory.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                ticket.status === 'open' ? 'destructive' :
                                ticket.status === 'in_progress' ? 'default' :
                                ticket.status === 'ops_input_required' ? 'secondary' :
                                ticket.status === 'user_dependency' ? 'default' :
                                ticket.status === 'ops_user_dependency' ? 'default' :
                                ticket.status === 'send_for_approval' ? 'default' :
                                ticket.status === 'approved' ? 'secondary' :
                                ticket.status === 'resolved' ? 'secondary' : 'outline'
                              }>
                                {getStatusLabel(ticket.status as any)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                ticket.severity === 'sev1' ? 'destructive' :
                                ticket.severity === 'sev2' ? 'default' : 'secondary'
                              }>
                                {ticket.severity.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>{ticket.city}</TableCell>
                            <TableCell>{format(new Date(ticket.submittedAt), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewTicket(ticket)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <AdvancedAnalytics />
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

      {/* Download Modal */}
      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Assigned Tickets</DialogTitle>
            <DialogDescription>
              Choose the type of download and date range for your assigned tickets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="downloadAll"
                checked={downloadAll}
                onCheckedChange={(checked) => setDownloadAll(checked as boolean)}
              />
              <label htmlFor="downloadAll" className="text-sm font-medium">
                Download all assigned tickets
              </label>
            </div>
            
            {!downloadAll && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
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
                        <span>Pick a date range</span>
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
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDownloadModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownloadWithDateRange} disabled={isDownloading}>
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 