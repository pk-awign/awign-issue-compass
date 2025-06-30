import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/navigation/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useIssues } from '@/contexts/IssueContext';
import { TicketDetailsModal } from '@/components/TicketDetailsModal';
import { TicketFilters } from '@/components/TicketFilters';
import { TicketStatsCards } from '@/components/TicketStatsCards';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Issue } from '@/types/issue';
import { format } from 'date-fns';
import { 
  Eye, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  MessageSquare,
  MapPin,
  FileText,
  Calendar,
  User
} from 'lucide-react';

type IssueWithAssignees = Issue & { assignees?: { user_id: string; role: string }[] };

export const TicketResolverPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { issues, loading, refreshIssues } = useIssues();
  const navigate = useNavigate();
  
  const [selectedTicket, setSelectedTicket] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  useEffect(() => {
    refreshIssues();
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleViewTicket = (ticket: Issue) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    refreshIssues(); // Refresh to get latest data
  };

  // Get tickets assigned to current resolver
  const assignedTickets = useMemo(() => {
    if (!user) return [];
    return issues.filter(issue => {
      // Super admin can see all tickets
      if (user.role === 'super_admin') return true;
      // Only show tickets assigned to this resolver
      return (issue as IssueWithAssignees).assignees?.some(a => a.user_id === user.id && a.role === 'resolver');
    });
  }, [issues, user]);

  // Apply filters
  const filteredTickets = useMemo(() => {
    let filtered = assignedTickets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.issueCategory.toLowerCase().includes(searchTerm.toLowerCase())
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

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.issueCategory === categoryFilter);
    }

    // City filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.city === cityFilter);
    }

    return filtered;
  }, [assignedTickets, searchTerm, statusFilter, severityFilter, categoryFilter, cityFilter]);

  // Categorize tickets by status
  const ticketsByStatus = useMemo(() => {
    return {
      all: filteredTickets,
      open: filteredTickets.filter(t => t.status === 'open'),
      in_progress: filteredTickets.filter(t => t.status === 'in_progress'),
      approval_pending: filteredTickets.filter(t => t.status === 'send_for_approval'),
      approved: filteredTickets.filter(t => t.status === 'approved'),
      resolved: filteredTickets.filter(t => t.status === 'resolved'),
    };
  }, [filteredTickets]);

  const activeFiltersCount = [searchTerm, statusFilter, severityFilter, categoryFilter, cityFilter]
    .filter(filter => filter && filter !== 'all').length;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setCategoryFilter('all');
    setCityFilter('all');
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
    <Card key={ticket.id} className="hover:shadow-md transition-shadow">
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
                  {ticket.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
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

          {/* Issue Info */}
          <div>
            <h3 className="font-medium text-sm mb-1">{formatCategory(ticket.issueCategory)}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{ticket.issueDescription}</p>
          </div>

          {/* Meta Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
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

          {/* Resolution Notes Preview */}
          {ticket.resolutionNotes && (
            <div className="bg-green-50 p-2 rounded text-xs">
              <p className="text-green-700 font-medium">Resolution:</p>
              <p className="text-green-600 line-clamp-1">{ticket.resolutionNotes}</p>
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

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">Ticket Resolver Dashboard</h2>
            <p className="text-sm md:text-base text-gray-600">Manage and resolve assigned tickets</p>
            {user && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 text-sm">
                  Resolver: {user.name} | City: {user.city} | Centre: {user.centreCode}
                </p>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <TicketStatsCards tickets={assignedTickets} userRole="resolver" />

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
            onClearFilters={clearFilters}
            activeFiltersCount={activeFiltersCount}
          />

          {/* Tickets Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 sm:flex sm:flex-row w-full gap-3 sm:gap-0 bg-white p-2 rounded-xl border shadow-md my-4 z-10">
              <TabsTrigger value="all" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                All Tickets
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.all.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="open" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Open
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.open.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                In Progress
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.in_progress.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="approval_pending" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Approval Pending
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.approval_pending.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="approved" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Approved
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.approved.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="resolved" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Resolved
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.resolved.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Tab contents for each status */}
            <TabsContent value="all" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : ticketsByStatus.all.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No tickets found</p>
                    <p className="text-sm text-muted-foreground">No tickets assigned to you</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {ticketsByStatus.all.map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="open" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : ticketsByStatus.open.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No open tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in open status</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {ticketsByStatus.open.map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="in_progress" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : ticketsByStatus.in_progress.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No in progress tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in progress</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {ticketsByStatus.in_progress.map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="approval_pending" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : ticketsByStatus.approval_pending.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No approval pending tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in send for approval status</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {ticketsByStatus.approval_pending.map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="approved" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : ticketsByStatus.approved.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No approved tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in approved status</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {ticketsByStatus.approved.map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="resolved" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : ticketsByStatus.resolved.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No resolved tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in resolved status</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {ticketsByStatus.resolved.map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
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
          <p>© 2024 Awign Technologies. Escalation Management System for TCS Examination Operations.</p>
          <p className="mt-1">For technical support, contact: support@awign.com</p>
        </div>
      </footer>
    </div>
  );
};
