import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, Users } from 'lucide-react';
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
  User,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  History,
  UserCheck
} from 'lucide-react';

type IssueWithAssignees = Issue & { assignees?: { user_id: string; role: string }[] };

export const ResolutionApproverPage: React.FC = () => {
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

  // Get tickets for approval based on user's city
  const approverTickets = useMemo(() => {
    if (!user) return [];
    return issues.filter(issue => {
      // Super admin can see all tickets
      if (user.role === 'super_admin') return true;
      // Only show tickets assigned to this approver
      return (issue as IssueWithAssignees).assignees?.some(a => a.user_id === user.id && a.role === 'approver');
    });
  }, [issues, user]);

  // Apply filters
  const filteredTickets = useMemo(() => {
    let filtered = approverTickets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.issueCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket as IssueWithAssignees).assignees?.some(a => a.user_id === user.id && a.role === 'approver')
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
  }, [approverTickets, searchTerm, statusFilter, severityFilter, categoryFilter, cityFilter, user.id]);

  // Categorize tickets by approval status
  const ticketsByStatus = useMemo(() => {
    return {
      pending_approval: filteredTickets.filter(t => t.status === 'send_for_approval'),
      all_tickets: filteredTickets,
      open: filteredTickets.filter(t => t.status === 'open'),
      in_progress: filteredTickets.filter(t => t.status === 'in_progress'),
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

  const getResolutionTime = (ticket: Issue) => {
    if (!ticket.resolvedAt) return null;
    const hours = Math.round((ticket.resolvedAt.getTime() - ticket.submittedAt.getTime()) / (1000 * 60 * 60));
    return hours;
  };

  const getRoleDisplayName = () => {
    if (!user) return '';
    switch (user.role) {
      case 'super_admin': return 'Super Admin';
      case 'resolver': return 'Resolver';
      case 'approver': return 'Approver';
      case 'invigilator': return 'Invigilator';
      default: return user.role;
    }
  };

  const renderApprovalCard = (ticket: Issue) => {
    const resolutionTime = getResolutionTime(ticket);
    
    return (
      <Card key={ticket.id} className="hover:shadow-md transition-shadow border-l-4 border-l-orange-400">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
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
                Review
              </Button>
            </div>

            {/* Issue Info */}
            <div>
              <h3 className="font-medium text-sm mb-1">{formatCategory(ticket.issueCategory)}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{ticket.issueDescription}</p>
            </div>

            {/* Resolution Preview */}
            {ticket.resolutionNotes && (
              <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-300">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">Resolution Provided:</span>
                </div>
                <p className="text-xs text-blue-700 line-clamp-2">{ticket.resolutionNotes}</p>
              </div>
            )}

            {/* Assignment & Timeline Info */}
            {user?.role !== 'approver' && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <UserCheck className="h-3 w-3" />
                    <span>Resolved by:</span>
                  </div>
                  <div>Assigned Resolvers: {(ticket as IssueWithAssignees).assignees?.filter(a => a.role === 'resolver').map(a => a.user_id).join(', ') || 'Unassigned'}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Resolution Time:</span>
                  </div>
                  <p className="font-medium">
                    {resolutionTime ? `${resolutionTime}h` : 'N/A'}
                    {resolutionTime && resolutionTime > 24 && (
                      <Badge variant="destructive" className="ml-1 text-xs">
                        SLA Breach
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
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
                  Resolved: {ticket.resolvedAt ? format(ticket.resolvedAt, 'MMM dd, HH:mm') : 'N/A'}
                </div>
              </div>
              {ticket.comments.length > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {ticket.comments.length} comments
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTicketCard = (ticket: Issue) => (
    <Card key={ticket.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
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

          {/* Assignment Info */}
          {user?.role !== 'approver' && (
            <div className="bg-gray-50 p-2 rounded text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Assigned to: {(ticket as IssueWithAssignees).assignees?.filter(a => a.role === 'resolver').map(a => a.user_id).join(', ') || 'Unassigned'}</span>
                </div>
                {ticket.status === 'resolved' && (
                  <ArrowRight className="h-3 w-3 text-orange-500" />
                )}
              </div>
            </div>
          )}

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
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-2 py-2 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col items-start">
                <div className="bg-gray-800 p-1 rounded">
                  <img 
                    src="/awign-logo.svg" 
                    alt="Awign Logo" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
              </div>
              <div className="flex flex-col items-start flex-1 ml-4">
                <span className="text-base sm:text-xl font-semibold text-gray-900">AWIGN ESCALATION MANAGEMENT</span>
                <span className="text-xs sm:text-sm text-gray-600 mt-1">Approver Panel</span>
              </div>
              <div className="flex sm:hidden items-center gap-2 ml-auto justify-end">
                {user && (
                  <button onClick={handleLogout} className="ml-2">
                    <LogOut className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Please login to access the approver dashboard</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-2 py-2 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col items-start">
              <div className="bg-gray-800 p-1 rounded">
                <img 
                  src="/awign-logo.svg" 
                  alt="Awign Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
            </div>
            <div className="flex flex-col items-start flex-1 ml-4">
              <span className="text-base sm:text-xl font-semibold text-gray-900">AWIGN ESCALATION MANAGEMENT</span>
              <span className="text-xs sm:text-sm text-gray-600 mt-1">Approver Panel</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 ml-4">
              {user && (
                <>
                  <Users className="h-5 w-5" />
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-xs font-semibold text-gray-700 ml-1">{getRoleDisplayName()}</span>
                  <button onClick={handleLogout} className="ml-2">
                    <LogOut className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            <div className="flex sm:hidden items-center gap-2 ml-auto justify-end">
              {user && (
                <button onClick={handleLogout} className="ml-2">
                  <LogOut className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="text-center space-y-2 px-2 sm:px-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Resolution Approver Dashboard</h2>
            <p className="text-xs sm:text-sm md:text-base text-gray-600">Review and approve issue resolutions</p>
            {user && (
              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-purple-800 text-xs sm:text-sm">
                  Approver: {user.name} | City: {user.city}
                </p>
                <div className="flex flex-col items-center justify-center mt-2 sm:mt-0">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">
                      {ticketsByStatus.pending_approval.length}
                    </div>
                    <div className="text-xs text-purple-600">Pending Approvals</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards (remove Closed card) */}
          <TicketStatsCards tickets={approverTickets} userRole="approver" />

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
                All
                <Badge variant="secondary" className="ml-2">{approverTickets.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approval_pending" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Approval Pending
                <Badge variant="secondary" className="ml-2">{approverTickets.filter(t => t.status === 'send_for_approval').length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approved" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Approved
                <Badge variant="secondary" className="ml-2">{approverTickets.filter(t => t.status === 'approved').length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="resolved" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Resolved
                <Badge variant="secondary" className="ml-2">{approverTickets.filter(t => t.status === 'resolved').length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : approverTickets.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">No tickets found</p>
                    <p className="text-sm text-muted-foreground">
                      {activeFiltersCount > 0 ? 'Try adjusting your filters' : 'No tickets assigned to you'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {approverTickets.map(renderTicketCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approval_pending" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : approverTickets.filter(t => t.status === 'send_for_approval').length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No approval pending tickets</p>
                    <p className="text-sm text-muted-foreground">All tickets have been reviewed!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {approverTickets.filter(t => t.status === 'send_for_approval').map(renderTicketCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : approverTickets.filter(t => t.status === 'approved').length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No approved tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in approved status</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {approverTickets.filter(t => t.status === 'approved').map(renderTicketCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resolved" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : approverTickets.filter(t => t.status === 'resolved').length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No resolved tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in resolved status</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {approverTickets.filter(t => t.status === 'resolved').map(renderTicketCard)}
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
        userRole="approver"
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
