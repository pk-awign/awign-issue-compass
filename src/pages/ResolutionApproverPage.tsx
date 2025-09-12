import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useIssues } from '@/contexts/IssueContext';
import { TicketDetailsModal } from '@/components/TicketDetailsModal';
import { TicketFilters } from '@/components/TicketFilters';
import { TicketStatsCards } from '@/components/TicketStatsCards';
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
  User,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  History,
  UserCheck
} from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { TicketService } from '@/services/ticketService';

type IssueWithAssignees = Issue & { assignees?: { user_id: string; role: string }[] };

export const ResolutionApproverPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { issues, loading, refreshIssues } = useIssues();
  const navigate = useNavigate();
  
  const [selectedTicket, setSelectedTicket] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Status change states
  const [selectedStatus, setSelectedStatus] = useState<Issue['status']>('open');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [availableTransitions, setAvailableTransitions] = useState<Issue['status'][]>([]);
  
  // Per-ticket status change states
  const [ticketStatuses, setTicketStatuses] = useState<Record<string, Issue['status']>>({});
  const [ticketNotes, setTicketNotes] = useState<Record<string, string>>({});
  
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

  const getResolverIdList = (ticket: Issue): string => {
    const ids = getAllAssignees(ticket)
      .filter(a => a.role === 'resolver')
      .map(a => a.user_id);
    return ids.length ? ids.join(', ') : 'Unassigned';
  };

  useEffect(() => {
    refreshIssues();
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    refreshIssues(); // Refresh to get latest data
  };

  const handleExportTickets = async () => {
    if (!filteredTickets.length) {
      toast.info('No tickets to export');
      return;
    }

    setIsExporting(true);
    try {
      const filename = generateExportFilename('approver_tickets', {
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

  const handleStatusChange = async (ticketId: string, newStatus: Issue['status'], notes?: string) => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const success = await TicketService.updateTicketStatus(
        ticketId,
        newStatus,
        user.id,
        notes,
        user.role
      );
      
      if (success) {
        toast.success(`Ticket status updated to ${newStatus}`);
        refreshIssues(); // Refresh to get latest data
        // Reset form for this specific ticket
        setTicketStatuses(prev => ({ ...prev, [ticketId]: 'open' }));
        setTicketNotes(prev => ({ ...prev, [ticketId]: '' }));
      } else {
        toast.error('Failed to update ticket status');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
    } finally {
      setIsUpdating(false);
    }
  };

  const updateTicketStatus = (ticketId: string, status: Issue['status']) => {
    setTicketStatuses(prev => ({ ...prev, [ticketId]: status }));
  };

  const updateTicketNotes = (ticketId: string, notes: string) => {
    setTicketNotes(prev => ({ ...prev, [ticketId]: notes }));
  };

  const getTicketStatus = (ticketId: string) => {
    return ticketStatuses[ticketId] || 'open';
  };

  const getTicketNotes = (ticketId: string) => {
    return ticketNotes[ticketId] || '';
  };

  const handleViewTicket = (ticket: Issue) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
    // Set available transitions for this ticket
    if (user) {
      TicketService.getStatusTransitions(user.role, ticket.status).then(transitions => {
        setAvailableTransitions(transitions);
        // Initialize ticket status to current status if not already set
        if (!ticketStatuses[ticket.id]) {
          updateTicketStatus(ticket.id, ticket.status);
        }
      });
    }
  };

  // Get tickets for approval based on user's city
  const approverTickets = useMemo(() => {
    if (!user) return [];
    
    const filtered = issues.filter(issue => {
      // Super admin can see all tickets
      if (user.role === 'super_admin') return true;
      // Show tickets where this user is approver using new assignment system
      const hasAssigneeMatch = getAllAssignees(issue).some(a => a.user_id === user.id && a.role === 'approver');
      
      // Debug logging for approver visibility
      if (user.role === 'approver' && hasAssigneeMatch) {
        console.log('🔍 [APPROVER DEBUG] Ticket visible:', {
          ticketNumber: issue.ticketNumber,
          status: issue.status,
          assignedApprover: issue.assignedApprover,
          assignees: (issue as any).assignees,
          hasAssigneeMatch,
          userId: user.id
        });
      }
      
      return !!hasAssigneeMatch;
    });
    
    // Debug logging for approver
    if (user?.role === 'approver') {
      console.log('🔍 [APPROVER DEBUG] Total issues:', issues.length);
      console.log('🔍 [APPROVER DEBUG] Filtered approver tickets:', filtered.length);
      console.log('🔍 [APPROVER DEBUG] User ID:', user.id);
      console.log('🔍 [APPROVER DEBUG] User name:', user.name);
      console.log('🔍 [APPROVER DEBUG] Sample ticket assignments:', issues.slice(0, 5).map(t => ({
        ticketNumber: t.ticketNumber,
        assignedApprover: t.assignedApprover,
        assignees: (t as IssueWithAssignees).assignees
      })));
    }
    
    return filtered;
  }, [issues, user]);

  // Fetch last status data when tickets change
  useEffect(() => {
    const fetchLastStatus = async () => {
      if (approverTickets.length > 0) {
        const ticketIds = approverTickets.map(t => t.id);
        const lastStatusData = await TicketService.getLastStatusForTickets(ticketIds);
        setLastStatusMap(lastStatusData);
      }
    };
    
    fetchLastStatus();
  }, [approverTickets]);

  // Apply filters
  const filteredTickets = useMemo(() => {
    let filtered = approverTickets;

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

    return filtered;
  }, [approverTickets, searchTerm, statusFilter, severityFilter, categoryFilter, cityFilter, resourceIdFilter, dateRange, lastStatusFilter, lastCommentByInvigilator, lastStatusMap, user]);

  // Categorize tickets by approval status
  const ticketsByStatus = useMemo(() => {
    const getLastUpdatedAt = (t: any) => t.statusChangedAt || t.resolvedAt || t.submittedAt;
    const sorted = [...filteredTickets].sort((a, b) => {
      const aU = getLastUpdatedAt(a)?.getTime() || 0;
      const bU = getLastUpdatedAt(b)?.getTime() || 0;
      return bU - aU;
    });
    return {
      pending_approval: sorted.filter(t => t.status === 'send_for_approval'),
      all_tickets: sorted,
      open: sorted.filter(t => t.status === 'open'),
      in_progress: sorted.filter(t => t.status === 'in_progress'),
      ops_input_required: sorted.filter(t => t.status === 'ops_input_required'),
      user_dependency: sorted.filter(t => t.status === 'user_dependency'),
    };
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

  // Get unique cities for filter
  const uniqueCities = Array.from(new Set(approverTickets.map(ticket => ticket.city)));

  // Get unique values for dynamic filters
  const uniqueSeverities = Array.from(new Set(approverTickets.map(ticket => ticket.severity))).filter(Boolean);
  const uniqueCategories = Array.from(new Set(approverTickets.map(ticket => ticket.issueCategory))).filter(Boolean);

  // Get unique resource IDs for filter
  const uniqueResourceIds = Array.from(new Set(approverTickets.map(ticket => ticket.resourceId)))
    .filter(id => id && typeof id === 'string' && id.trim() !== '')
    .sort()
    .map(id => ({ value: id, label: id }));

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
                    {getStatusLabel(ticket.status)}
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
                  <div>Assigned Resolvers: {getResolverIdList(ticket)}</div>
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

            {/* Status Change Actions for Approvers */}
            {user?.role === 'approver' && (
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Change Status:</span>
                  <Select 
                    value={getTicketStatus(ticket.id)} 
                    onValueChange={(value: Issue['status']) => updateTicketStatus(ticket.id, value)}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TicketService.getAllowedStatusTransitions(user!.role, ticket.status).map(status => (
                        <SelectItem key={status} value={status} className="text-xs">
                          {getStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Approver cannot resolve; no resolution notes here */}
                {false && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Enter resolution details..."
                      value={getTicketNotes(ticket.id)}
                      onChange={(e) => updateTicketNotes(ticket.id, e.target.value)}
                      className="min-h-[60px] text-xs"
                    />
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(ticket.id, getTicketStatus(ticket.id), getTicketNotes(ticket.id))}
                    disabled={isUpdating || getTicketStatus(ticket.id) === ticket.status}
                    className="flex-1 text-xs"
                  >
                    {isUpdating ? 'Updating...' : 'Update Status'}
                  </Button>
                  
                  {/* Quick Action Buttons */}
                  {ticket.status === 'send_for_approval' && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleStatusChange(ticket.id, 'approved')}
                      disabled={isUpdating}
                      className="text-xs"
                    >
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                  )}
                  {ticket.status === 'send_for_approval' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                      disabled={isUpdating}
                      className="text-xs"
                    >
                      <ThumbsDown className="h-3 w-3 mr-1" />
                      Send back to CX
                    </Button>
                  )}
                  
                  {/* Approver cannot close tickets */}
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
    <Card key={ticket.id} className={"hover:shadow-md transition-shadow"}>
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
                    {getStatusLabel(ticket.status)}
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
                  <span>Assigned to: {getResolverIdList(ticket)}</span>
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
          {/* Page Header hidden per request (keeping only the top header) */}
          {/* Hidden stats and header summary */}
          <div className="hidden" />
          <div className="hidden">
            <TicketStatsCards tickets={approverTickets} userRole="approver" />
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
                <Badge variant="secondary" className="ml-2">{ticketsByStatus.all_tickets.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approval_pending" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Approval Pending
                <Badge variant="secondary" className="ml-2">{ticketsByStatus.pending_approval.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approved" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Approved
                <Badge variant="secondary" className="ml-2">{filteredTickets.filter(t => t.status === 'approved').length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="resolved" className="w-full rounded-lg py-3 data-[state=active]:bg-blue-100 data-[state=active]:font-bold data-[state=active]:shadow">
                Closed
                <Badge variant="secondary" className="ml-2">{filteredTickets.filter(t => t.status === 'resolved').length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
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
                  {filteredTickets.map(renderTicketCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approval_pending" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : ticketsByStatus.pending_approval.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No approval pending tickets</p>
                    <p className="text-sm text-muted-foreground">All tickets have been reviewed!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {ticketsByStatus.pending_approval.map(renderApprovalCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : filteredTickets.filter(t => t.status === 'approved').length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No approved tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in approved status</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTickets.filter(t => t.status === 'approved').map(renderTicketCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resolved" className="mt-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading tickets...</p>
                </div>
              ) : filteredTickets.filter(t => t.status === 'resolved').length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">No resolved tickets</p>
                    <p className="text-sm text-muted-foreground">No tickets in resolved status</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTickets.filter(t => t.status === 'resolved').map(renderTicketCard)}
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
          <p>© 2025 Awign Enterprises Pvt. Ltd.</p>
          <p className="mt-1">Escalation Management System for TCS Examination Operations.</p>
        </div>
      </footer>
    </div>
  );
};