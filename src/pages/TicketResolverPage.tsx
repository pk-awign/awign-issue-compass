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
import { NotificationBell } from '@/components/NotificationBell';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Issue } from '@/types/issue';
import { getStatusLabel } from '@/utils/status';
import { exportTicketsAsCSV, generateExportFilename } from '@/utils/ticketExport';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
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
import { MultiSelect } from '@/components/ui/multi-select';
import { TicketService } from '@/services/ticketService';

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
  const [resourceIdFilter, setResourceIdFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const [lastStatusFilter, setLastStatusFilter] = useState('all');
  const [lastCommentByInvigilator, setLastCommentByInvigilator] = useState(false);
  const [lastStatusMap, setLastStatusMap] = useState<Map<string, string>>(new Map());

  const handleCloseTicket = async (ticketId: string) => {
    if (!user) return;
    try {
      const ok = await TicketService.updateTicketStatus(ticketId, 'resolved', user.id, undefined, user.role);
      if (ok) {
        toast.success('Ticket closed');
        refreshIssues();
      } else {
        toast.error('Failed to close ticket');
      }
    } catch (e) {
      toast.error('Failed to close ticket');
    }
  };

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

  const handleExportTickets = async () => {
    if (!filteredTickets.length) {
      toast.info('No tickets to export');
      return;
    }

    setIsExporting(true);
    try {
      const filename = generateExportFilename('resolver_tickets', {
        statusFilter,
        severityFilter,
        categoryFilter,
        cityFilter,
        searchTerm
      });
      exportTicketsAsCSV(filteredTickets, filename);
      toast.success(`Exported ${filteredTickets.length} tickets successfully!`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export tickets. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleTicketClick = (ticketId: string) => {
    const ticket = assignedTickets.find(t => t.id === ticketId);
    if (ticket) {
      handleViewTicket(ticket);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    refreshIssues(); // Refresh to get latest data
  };

  // Get tickets assigned to current resolver
  const assignedTickets = useMemo(() => {
    if (!user) return [];
    
    const filtered = issues.filter(issue => {
      // Super admin can see all tickets
      if (user.role === 'super_admin') return true;
      // Only show tickets assigned to this resolver using new assignment system
      const hasAssigneeMatch = getAllAssignees(issue).some(a => a.user_id === user.id && a.role === 'resolver');
      
      // Debug logging for resolver visibility
      if (user.role === 'resolver' && hasAssigneeMatch) {
        console.log('🔍 [RESOLVER DEBUG] Ticket visible:', {
          ticketNumber: issue.ticketNumber,
          status: issue.status,
          assignedResolver: issue.assignedResolver,
          assignees: (issue as any).assignees,
          hasAssigneeMatch,
          userId: user.id
        });
      }
      
      return hasAssigneeMatch;
    });
    
    // Debug logging for resolver
    if (user?.role === 'resolver') {
      console.log('🔍 [RESOLVER DEBUG] Total issues:', issues.length);
      console.log('🔍 [RESOLVER DEBUG] Filtered resolver tickets:', filtered.length);
      console.log('🔍 [RESOLVER DEBUG] User ID:', user.id);
      console.log('🔍 [RESOLVER DEBUG] User name:', user.name);
      console.log('🔍 [RESOLVER DEBUG] Sample ticket assignments:', issues.slice(0, 5).map(t => ({
        ticketNumber: t.ticketNumber,
        assignedResolver: t.assignedResolver,
        assignees: (t as IssueWithAssignees).assignees
      })));
      
      // Check specifically for the problematic ticket
      const problematicTicket = issues.find(t => t.id === 'd61dcf47-2abe-41bd-ae0f-ca8bf166670e');
      if (problematicTicket) {
        console.log('🔍 [RESOLVER DEBUG] Problematic ticket found:', {
          ticketId: problematicTicket.id,
          ticketNumber: problematicTicket.ticketNumber,
          assignedResolver: problematicTicket.assignedResolver,
          assignees: (problematicTicket as any).assignees,
          userId: user.id,
          hasAssigneeMatch: getAllAssignees(problematicTicket).some(a => a.user_id === user.id && a.role === 'resolver'),
          assigneesLength: getAllAssignees(problematicTicket).length
        });
      } else {
        console.log('🔍 [RESOLVER DEBUG] Problematic ticket NOT found in issues list');
      }
      
      // Check all tickets with assignments
      const ticketsWithAssignments = issues.filter(t => getAllAssignees(t).length > 0);
      console.log('🔍 [RESOLVER DEBUG] Tickets with assignments:', ticketsWithAssignments.length);
      console.log('🔍 [RESOLVER DEBUG] Sample tickets with assignments:', ticketsWithAssignments.slice(0, 3).map(t => ({
        ticketNumber: t.ticketNumber,
        assignees: (t as any).assignees
      })));
    }
    
    return filtered;
  }, [issues, user]);

  // Fetch last status data when tickets change
  useEffect(() => {
    const fetchLastStatus = async () => {
      if (assignedTickets.length > 0) {
        const ticketIds = assignedTickets.map(t => t.id);
        const lastStatusData = await TicketService.getLastStatusForTickets(ticketIds);
        setLastStatusMap(lastStatusData);
      }
    };
    
    fetchLastStatus();
  }, [assignedTickets]);

  // Apply filters
  const filteredTickets = useMemo(() => {
    let filtered = assignedTickets;

    // Search filter
    if (searchTerm) {
      const searchTerms = searchTerm.split(',').map(term => term.trim()).filter(term => term.length > 0);
      
      filtered = filtered.filter(ticket => {
        // Check if any search term matches
        return searchTerms.some(term => {
          const lowerTerm = term.toLowerCase();
          const lowerTicketNumber = ticket.ticketNumber.toLowerCase();
          const lowerDescription = ticket.issueDescription.toLowerCase();
          const lowerCategory = ticket.issueCategory.toLowerCase();
          
          // If the search term looks like a ticket number (contains AWG), prioritize exact ticket number matching
          if (lowerTerm.includes('awg') || lowerTerm.includes('awg-')) {
            return lowerTicketNumber.includes(lowerTerm);
          }
          
          // Otherwise, search across all fields
          return lowerTicketNumber.includes(lowerTerm) ||
                 lowerDescription.includes(lowerTerm) ||
                 lowerCategory.includes(lowerTerm);
        });
      });
    }

    // Status filter (normalize UI value to backend value)
    if (statusFilter !== 'all') {
      const statusMap: Record<string, string> = {
        approval_pending: 'send_for_approval'
      };
      const backendStatus = statusMap[statusFilter] || statusFilter;
      filtered = filtered.filter(ticket => ticket.status === backendStatus);
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

    // Resource ID filter
    if (resourceIdFilter.length > 0) {
      filtered = filtered.filter(ticket => resourceIdFilter.includes(ticket.resourceId));
    }

    // Date range filter
    if (dateRange?.from) {
      filtered = filtered.filter(ticket => {
        const ticketDate = new Date(ticket.submittedAt);
        const fromDate = dateRange.from;
        const toDate = dateRange.to || dateRange.from;
        
        return ticketDate >= fromDate && ticketDate <= toDate;
      });
    }

    // Last Status filter - filter by the last status change from ticket history
    if (lastStatusFilter !== 'all') {
      filtered = filtered.filter(ticket => {
        const lastStatus = lastStatusMap.get(ticket.id);
        return lastStatus === lastStatusFilter;
      });
    }

    // Last Comment by Invigilator filter
    if (lastCommentByInvigilator) {
      filtered = filtered.filter(ticket => {
        return ticket.comments && ticket.comments.length > 0 && ticket.comments[0].isFromInvigilator;
      });
    }

    // Sort: primary by last comment timestamp, secondary by last updated (statusChangedAt), fallback submittedAt
    const getLastCommentAt = (t: Issue) => (t.comments && t.comments.length > 0 ? t.comments[0].timestamp : undefined);
    const getLastUpdatedAt = (t: any) => t.statusChangedAt || t.resolvedAt || t.submittedAt;
    return [...filtered].sort((a, b) => {
      const aC = getLastCommentAt(a)?.getTime() || 0;
      const bC = getLastCommentAt(b)?.getTime() || 0;
      if (aC !== bC) return bC - aC;
      const aU = getLastUpdatedAt(a)?.getTime() || 0;
      const bU = getLastUpdatedAt(b)?.getTime() || 0;
      return bU - aU;
    });
  }, [assignedTickets, searchTerm, statusFilter, severityFilter, categoryFilter, cityFilter, resourceIdFilter, dateRange, lastStatusFilter, lastCommentByInvigilator, lastStatusMap]);

  // Categorize tickets by status
  const ticketsByStatus = useMemo(() => {
    return {
      all: filteredTickets,
      in_progress: filteredTickets.filter(t => t.status === 'in_progress'),
      user_dependency: filteredTickets.filter(t => t.status === 'user_dependency'),
      ops_input_required: filteredTickets.filter(t => t.status === 'ops_input_required'),
      ops_user_dependency: filteredTickets.filter(t => (t as any).status === 'ops_user_dependency'),
      send_for_approval: filteredTickets.filter(t => t.status === 'send_for_approval'),
      approved: filteredTickets.filter(t => t.status === 'approved'),
      resolved: filteredTickets.filter(t => t.status === 'resolved'),
    } as const;
  }, [filteredTickets]);

  const activeFiltersCount = [searchTerm, statusFilter, severityFilter, categoryFilter, cityFilter, lastStatusFilter]
    .filter(filter => filter && filter !== 'all').length + resourceIdFilter.length + (dateRange ? 1 : 0) + (lastCommentByInvigilator ? 1 : 0);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setCategoryFilter('all');
    setCityFilter('all');
    setResourceIdFilter([]);
    setDateRange(undefined);
    setLastStatusFilter('all');
    setLastCommentByInvigilator(false);
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
      case 'ops_input_required': return 'bg-purple-100 text-purple-800';
      case 'user_dependency': return 'bg-orange-100 text-orange-800';
      case 'send_for_approval': return 'bg-indigo-100 text-indigo-800';
      case 'approved': return 'bg-teal-100 text-teal-800';
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
    <Card key={ticket.id} className={`hover:shadow-md transition-shadow ${ticket.comments[0]?.isFromInvigilator ? 'border border-green-400' : ''}`}>
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
                  {getStatusLabel(ticket.status)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
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

          {/* Last Comment Info */}
          {ticket.comments.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {(() => {
                const lastComment = ticket.comments[0];
                if (lastComment.isFromInvigilator) {
                  return "Last comment added by: Invigilator";
                } else if (lastComment.isInternal) {
                  return "Internal comment added";
                } else {
                  return `Last comment added by: ${lastComment.author || 'Unknown'}`;
                }
              })()}
            </div>
          )}

          {/* Resolution Notes Preview */}
          {ticket.resolutionNotes && (
            <div className="bg-green-50 p-2 rounded text-xs">
              <p className="text-green-700 font-medium">Resolution:</p>
              <p className="text-green-600 line-clamp-1">{ticket.resolutionNotes}</p>
            </div>
          )}

          {/* Close Button - Bottom Right */}
          {activeTab === 'approved' && ticket.status === 'approved' && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => handleCloseTicket(ticket.id)}
                className="text-xs"
              >
                Close the ticket
              </Button>
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

  // Get unique cities for filter
  const uniqueCities = Array.from(new Set(assignedTickets.map(ticket => ticket.city)));

  // Get unique values for dynamic filters
  const uniqueSeverities = Array.from(new Set(assignedTickets.map(ticket => ticket.severity))).filter(Boolean);
  const uniqueCategories = Array.from(new Set(assignedTickets.map(ticket => ticket.issueCategory))).filter(Boolean);

  // Get unique resource IDs for filter
  const uniqueResourceIds = Array.from(new Set(assignedTickets.map(ticket => ticket.resourceId)))
    .filter(id => id && id.trim() !== '')
    .sort()
    .map(id => ({ value: id, label: id }));

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={handleLogout} onTicketClick={handleTicketClick} panelName="Resolver Panel" />

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-6">
          {/* Hide page header and stats per request (keep top header only) */}
          <div className="hidden" />
          <div className="hidden">
            <TicketStatsCards tickets={assignedTickets} userRole="resolver" />
          </div>

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
            resourceIdFilter={resourceIdFilter}
            setResourceIdFilter={setResourceIdFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            lastStatusFilter={lastStatusFilter}
            setLastStatusFilter={setLastStatusFilter}
            lastCommentByInvigilator={lastCommentByInvigilator}
            setLastCommentByInvigilator={setLastCommentByInvigilator}
            onClearFilters={clearFilters}
            activeFiltersCount={activeFiltersCount}
            uniqueCities={uniqueCities}
            uniqueResourceIds={uniqueResourceIds}
            uniqueSeverities={uniqueSeverities}
            uniqueCategories={uniqueCategories}
            onExportTickets={handleExportTickets}
            isExporting={isExporting}
          />

          {/* Tickets Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 sm:flex sm:flex-row w-full gap-3 sm:gap-0 bg-white p-2 rounded-xl border shadow-md my-4 z-10">
              <TabsTrigger value="all" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                All
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.all?.length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Pending on CX
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.in_progress?.length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="user_dependency" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                User Dependency
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.user_dependency?.length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="ops_input_required" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Ops Dependency
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.ops_input_required?.length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="ops_user_dependency" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Ops + User Dependency
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.ops_user_dependency?.length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="send_for_approval" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Send for Approval
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.send_for_approval?.length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="approved" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Approved
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.approved?.length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="resolved" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Closed
                <Badge variant="secondary" className="ml-2">
                  {ticketsByStatus.resolved?.length ?? 0}
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
              ) : (ticketsByStatus.all?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No tickets found</p>
                    <p className="text-sm text-muted-foreground">No tickets assigned to you</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(ticketsByStatus.all ?? []).map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="user_dependency" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : (ticketsByStatus.user_dependency?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No user dependency tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in user dependency</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(ticketsByStatus.user_dependency ?? []).map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="in_progress" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : (ticketsByStatus.in_progress?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No in progress tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in progress</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(ticketsByStatus.in_progress ?? []).map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="ops_input_required" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : (ticketsByStatus.ops_input_required?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No ops dependency tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in ops dependency</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(ticketsByStatus.ops_input_required ?? []).map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="ops_user_dependency" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : (ticketsByStatus.ops_user_dependency?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No ops + user dependency tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in ops + user dependency</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(ticketsByStatus.ops_user_dependency ?? []).map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="send_for_approval" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : (ticketsByStatus.send_for_approval?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No send for approval tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in send for approval</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(ticketsByStatus.send_for_approval ?? []).map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="approved" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : (ticketsByStatus.approved?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No approved tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in approved status</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(ticketsByStatus.approved ?? []).map(renderTicketCard)}
                </div>
              )}
            </TabsContent>
            <TabsContent value="resolved" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : (ticketsByStatus.resolved?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No resolved tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in resolved status</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(ticketsByStatus.resolved ?? []).map(renderTicketCard)}
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
          <p>© 2025 Awign Enterprises Pvt. Ltd.</p>
          <p className="mt-1">Escalation Management System for TCS Examination Operations.</p>
        </div>
      </footer>
    </div>
  );
};
