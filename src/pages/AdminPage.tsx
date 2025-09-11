import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/navigation/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, AlertCircle, CheckCircle, Clock, TrendingUp, Settings, Search, Filter, Eye, UserPlus, RefreshCw, FileText, Trash2, MessageSquare, User, CheckCircle2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Issue } from '@/types/issue';
import { AdminService } from '@/services/adminService';
import { UserManagementModal } from '@/components/admin/UserManagementModal';
import { TicketDetailsModal } from '@/components/admin/TicketDetailsModal';
import { AdvancedAnalytics } from '@/components/admin/AdvancedAnalytics';
import { EnhancedUserAssignment } from '@/components/admin/EnhancedUserAssignment';
import { WhatsAppTestComponent } from '@/components/admin/WhatsAppTestComponent';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type IssueWithAssignees = Issue & { assignees?: { user_id: string; role: string }[] };

export const AdminPage: React.FC = () => {
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
  const [resolverFilterSingle, setResolverFilterSingle] = useState<string>('all');
  const [resolverFilter, setResolverFilter] = useState<string[]>([]);
  const [resolvers, setResolvers] = useState<{ id: string; name: string }[]>([]);
  const [approvers, setApprovers] = useState<{ id: string; name: string }[]>([]);
  const [approverFilter, setApproverFilter] = useState<string[]>([]);
  const [resourceIdFilter, setResourceIdFilter] = useState<string[]>([]);
  const [resourceIds, setResourceIds] = useState<{ value: string; label: string }[]>([]);
  
  // Modal states
  const [showUserManagement, setShowUserManagement] = useState(false);
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
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>();
  const [onlyUnassignedResolver, setOnlyUnassignedResolver] = useState<boolean>(false);
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
  // Compute available resolver/approver IDs from the currently visible tickets
  const availableResolverIds = useMemo(() => {
    const ids = new Set<string>();
    filteredTickets.forEach(t => {
      (t as IssueWithAssignees).assignees?.forEach(a => {
        if (a.role === 'resolver') ids.add(a.user_id);
      });
    });
    return ids;
  }, [filteredTickets]);

  const availableApproverIds = useMemo(() => {
    const ids = new Set<string>();
    filteredTickets.forEach(t => {
      (t as IssueWithAssignees).assignees?.forEach(a => {
        if (a.role === 'approver') ids.add(a.user_id);
      });
    });
    return ids;
  }, [filteredTickets]);


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

  // Update loadTickets to support pagination and filtering
  const loadTickets = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      let result;
      
      if (isTicketAdmin && user?.id) {
        // For ticket admin, only load assigned tickets
        const assignedTickets = await AdminService.getTicketsAssignedToAdmin(user.id);
        result = {
          tickets: assignedTickets,
          total: assignedTickets.length,
          hasMore: false
        };
      } else {
        // For super admin, load all tickets with filters
        const hasFilters = searchQuery || statusFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all' || cityFilter !== 'all' || resolverFilter.length > 0 || approverFilter.length > 0 || resourceIdFilter.length > 0 || filterDateRange?.from;
        
        if (hasFilters || onlyUnassignedResolver) {
          // Use filtered method when filters are applied
          result = await AdminService.getFilteredTickets(showDeleted, reset ? 1 : page, limit, {
            searchQuery,
            statusFilter,
            severityFilter,
            categoryFilter,
            cityFilter,
            resolverFilter,
            approverFilter,
            resourceIdFilter,
            dateRange: filterDateRange,
            onlyUnassignedResolver
          });
        } else {
          // Use regular method when no filters
          result = await AdminService.getAllTickets(showDeleted, reset ? 1 : page, limit);
        }
      }
      
      const { tickets: newTickets, total, hasMore: more } = result;
      setTotalTickets(total);
      setHasMore(more);
      if (reset) {
        setTickets(newTickets);
        setFilteredTickets(newTickets);
        setPage(1);
      } else {
        setTickets(prev => {
          const merged = [...prev, ...newTickets].filter(
            (ticket, index, self) => index === self.findIndex(t => t.id === ticket.id)
          );
          return merged;
        });
        setFilteredTickets(prev => {
          const merged = [...prev, ...newTickets].filter(
            (ticket, index, self) => index === self.findIndex(t => t.id === ticket.id)
          );
          return merged;
        });
      }
    } catch (error) {
      console.error('❌ Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  }, [showDeleted, page, searchQuery, statusFilter, severityFilter, categoryFilter, cityFilter, resolverFilter, approverFilter, resourceIdFilter, filterDateRange, onlyUnassignedResolver, isTicketAdmin, user?.id]);

  // On initial load and when filters/search change, reset pagination and fetch fresh data
  useEffect(() => {
    // Reset pagination and fetch fresh data when filters change
    setPage(1);
    setTickets([]);
    setFilteredTickets([]);
    loadTickets(true);
    // eslint-disable-next-line
  }, [showDeleted, searchQuery, statusFilter, severityFilter, categoryFilter, cityFilter, resolverFilter, approverFilter, resourceIdFilter, filterDateRange, onlyUnassignedResolver]);

  // Fetch resolvers/approvers for filter dropdowns
  useEffect(() => {
    const fetchResolvers = async () => {
      const users = await AdminService.getUsersByRole('resolver');
      setResolvers(users.map(u => ({ id: u.id, name: u.name })));
    };
    const fetchApprovers = async () => {
      const users = await AdminService.getUsersByRole('approver');
      // Show only active approvers in filters
      setApprovers(users.filter(u => u.isActive).map(u => ({ id: u.id, name: u.name })));
    };
    fetchResolvers();
    fetchApprovers();
  }, []);

  // Fix handleLoadMore to be a no-arg function
  const handleLoadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  // Clear filters function
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setCategoryFilter('all');
    setCityFilter('all');
    setResolverFilter([]);
    setApproverFilter([]);
    setResourceIdFilter([]);
    setFilterDateRange(undefined);
    setOnlyUnassignedResolver(false);
  };

  // Check if there are active filters
  const hasActiveFilters = searchQuery || 
    statusFilter !== 'all' || 
    severityFilter !== 'all' || 
    categoryFilter !== 'all' || 
    cityFilter !== 'all' || 
    resolverFilter.length > 0 || 
    approverFilter.length > 0 ||
    resourceIdFilter.length > 0 || 
    filterDateRange?.from ||
    onlyUnassignedResolver;

  // When page changes (and not reset), load next page
  useEffect(() => {
    if (page > 1) {
      loadTickets();
    }
    // eslint-disable-next-line
  }, [page]);

  const loadAnalytics = async () => {
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
      console.log('📊 Analytics refreshed:', data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  };

  // Refresh analytics when filters change
  useEffect(() => {
    loadAnalytics();
  }, [statusFilter, severityFilter, categoryFilter, cityFilter, resolverFilter, approverFilter, resourceIdFilter, filterDateRange]);

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

  // Get unique values for dynamic filters
  const uniqueSeverities = Array.from(new Set(tickets.map(ticket => ticket.severity))).filter(Boolean);
  const uniqueCategories = Array.from(new Set(tickets.map(ticket => ticket.issueCategory))).filter(Boolean);

  // Get unique resource IDs for filter
  useEffect(() => {
    const uniqueResourceIds = Array.from(new Set(tickets.map(ticket => ticket.resourceId)))
      .filter(id => id && id.trim() !== '')
      .sort();
    
    setResourceIds(uniqueResourceIds.map(id => ({ value: id, label: id })));
  }, [tickets]);

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
    a.download = 'tickets.csv';
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
        } else if (ticket.issueDate?.type === 'single' && Array.isArray(ticket.issueDate.dates)) {
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
      a.download = 'detailed_tickets.csv';
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
        let allTickets;
        if (isTicketAdmin && user?.id) {
          // For ticket admin, only download assigned tickets
          allTickets = await AdminService.getTicketsAssignedToAdmin(user.id);
        } else {
          // For super admin, download all tickets
          allTickets = downloadAll
            ? await AdminService.getAllTicketsUnpaginated({ showDeleted })
            : await AdminService.getAllTicketsUnpaginated({ showDeleted, startDate: dateRange?.from, endDate: dateRange?.to });
        }
        downloadTicketsAsCSV(allTickets);
        toast.success(isTicketAdmin ? "Assigned tickets downloaded successfully!" : "All tickets downloaded successfully!");
      } else if (downloadType === 'detailed') {
        let allTickets;
        if (isTicketAdmin && user?.id) {
          // For ticket admin, only download assigned tickets
          allTickets = await AdminService.getTicketsAssignedToAdmin(user.id);
        } else {
          // For super admin, download all tickets
          allTickets = downloadAll
            ? await AdminService.getAllTicketsUnpaginated({ showDeleted })
            : await AdminService.getAllTicketsUnpaginated({ showDeleted, startDate: dateRange?.from, endDate: dateRange?.to });
        }
        downloadDetailedTickets(allTickets);
        toast.success(isTicketAdmin ? "Detailed assigned tickets downloaded successfully!" : "Detailed tickets downloaded successfully!");
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
            <TabsList className={`flex flex-col items-center gap-2 w-full p-2 bg-muted rounded-xl border shadow-md my-4 md:grid md:gap-0 md:p-1 ${
              isTicketAdmin ? 'md:grid-cols-3' : 'md:grid-cols-6'
            }`}>
              <TabsTrigger value="overview" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Overview</TabsTrigger>
              <TabsTrigger value="tickets" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">
                {isTicketAdmin ? 'Assigned Tickets' : 'All Tickets'}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Analytics</TabsTrigger>
              {!isTicketAdmin && (
                <>
                  <TabsTrigger value="users" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">User Management</TabsTrigger>
                  <TabsTrigger value="whatsapp" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">WhatsApp</TabsTrigger>
                  <TabsTrigger value="settings" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">Settings</TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                    {analytics && analytics.openTickets > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <div>Assigned: {analytics.openTicketsAssignedToResolver}</div>
                        <div>Unassigned: {analytics.openTicketsUnassignedToResolver}</div>
                      </div>
                    )}
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
                      <Settings className="h-8 w-8 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold">
                      {(analytics ? analytics.userDependencyTickets : 0) + 
                       (analytics ? analytics.opsInputRequiredTickets : 0) + 
                       (analytics ? analytics.sendForApprovalTickets : 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending Actions</div>
                    {analytics && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <div>User Dep: {analytics.userDependencyTickets}</div>
                        <div>Ops Input: {analytics.opsInputRequiredTickets}</div>
                        <div>Send Approval: {analytics.sendForApprovalTickets}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics ? analytics.approvedTickets : '-'}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold">{analytics ? analytics.resolvedTickets : '-'}</div>
                    <div className="text-sm text-muted-foreground">Resolved</div>
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
                      View Tickets
                    </Button>
                    <Button 
                      onClick={() => handleTabChange('whatsapp')}
                      className="w-full justify-start" 
                      variant="outline"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      WhatsApp Test
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
                        placeholder="Search tickets by number (comma-separated), description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Row 1: Status, Severity, Category, City */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="ops_input_required">Ops Input Required</SelectItem>
                          <SelectItem value="user_dependency">User Dependency</SelectItem>
                          <SelectItem value="send_for_approval">Send for Approval</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={severityFilter} onValueChange={setSeverityFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Severity</SelectItem>
                          {uniqueSeverities.map(severity => (
                            <SelectItem key={severity} value={severity}>
                              {severity === 'sev1' ? 'SEV1' :
                               severity === 'sev2' ? 'SEV2' :
                               severity === 'sev3' ? 'SEV3' :
                               (severity as string).charAt(0).toUpperCase() + (severity as string).slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {uniqueCategories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category === 'payment_delay' ? 'Payment Delay' :
                               category === 'partial_payment' ? 'Partial Payment' :
                               category === 'behavioral_complaint' ? 'Behavioral Complaint' :
                               category === 'improvement_request' ? 'Improvement Request' :
                               category === 'facility_issue' ? 'Facility Issue' :
                               category === 'penalty_issue' ? 'Penalty Issue' :
                               category === 'app_issue' ? 'App Issue' :
                               category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
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

                    {/* Row 2: Resource ID, Date Range, Approvers */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
                      <div className="lg:col-span-1">
                        <label className="text-sm font-medium mb-1 block">
                          Resource ID {resourceIdFilter.length > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {resourceIdFilter.length} selected
                            </Badge>
                          )}
                        </label>
                        <MultiSelect
                          selected={resourceIdFilter}
                          onChange={setResourceIdFilter}
                          placeholder="Enter Resource IDs (comma-separated)..."
                          className="w-full"
                        />
                        {resourceIdFilter.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter comma-separated Resource IDs to filter tickets
                          </p>
                        )}
                      </div>

                      <div className="lg:col-span-1">
                        <label className="text-sm font-medium mb-1 block">Ticket Created Date Range</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !filterDateRange && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filterDateRange?.from ? (
                                filterDateRange.to ? (
                                  <>
                                    {format(filterDateRange.from, "LLL dd, y")} - {format(filterDateRange.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(filterDateRange.from, "LLL dd, y")
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
                              defaultMonth={filterDateRange?.from}
                              selected={filterDateRange}
                              onSelect={setFilterDateRange}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                        {filterDateRange && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Filtering tickets created between {filterDateRange.from && format(filterDateRange.from, "MMM dd, yyyy")} {filterDateRange.to && ` and ${format(filterDateRange.to, "MMM dd, yyyy")}`}
                          </p>
                        )}
                      </div>

                      <div className="lg:col-span-1">
                        <label className="text-sm font-medium mb-1 block">
                          Approvers {approverFilter.length > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {approverFilter.length} selected
                            </Badge>
                          )}
                        </label>
                        <MultiSelect
                          options={approvers
                            .filter(a => availableApproverIds.size === 0 || availableApproverIds.has(a.id))
                            .map(a => ({ value: a.id, label: a.name }))}
                          selected={approverFilter}
                          onChange={setApproverFilter}
                          placeholder="Select approvers..."
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Row 3: Resolvers */}
                    <div className="grid grid-cols-1 gap-3 mt-3">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Resolvers {resolverFilter.length > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {resolverFilter.length} selected
                            </Badge>
                          )}
                        </label>
                        <MultiSelect
                          options={resolvers
                            .filter(r => availableResolverIds.size === 0 || availableResolverIds.has(r.id))
                            .map(r => ({ value: r.id, label: r.name }))}
                          selected={resolverFilter}
                          onChange={setResolverFilter}
                          placeholder="Select resolvers..."
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show Deleted Tickets Toggle and Download Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center flex-wrap gap-3 sm:gap-4 mb-4">
                <Switch
                  id="show-deleted"
                  checked={showDeleted}
                  onCheckedChange={(checked) => setShowDeleted(checked)}
                />
                <label htmlFor="show-deleted" className="text-sm font-medium">
                  {showDeleted ? 'Showing Deleted Tickets' : 'Hide Deleted Tickets'}
                </label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="only-unassigned-resolver"
                    checked={onlyUnassignedResolver}
                    onCheckedChange={(checked) => setOnlyUnassignedResolver(checked)}
                  />
                  <label htmlFor="only-unassigned-resolver" className="text-sm font-medium">
                    Unassigned Tickets
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => openDownloadDialog('all')}
                        disabled={isDownloading}
                    >
                        {isDownloading && downloadType === 'all' ? 'Downloading...' : 'Download All Tickets'}
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => openDownloadDialog('detailed')}
                        disabled={isDownloading}
                    >
                        {isDownloading && downloadType === 'detailed' ? 'Downloading...' : 'Download Detailed Tickets'}
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                    >
                        Clear Filters
                    </Button>
                </div>
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
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="flex items-center justify-between">
                      <span>Tickets ({totalTickets})</span>
                      <div className="hidden md:flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Select only current page (up to 50)
                            setSelectedTickets(filteredTickets.map(t => t.id));
                          }}
                        >
                          Select 50 on this page
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const ids = await AdminService.getFilteredTicketIds(showDeleted, {
                              searchQuery,
                              statusFilter,
                              severityFilter,
                              categoryFilter,
                              cityFilter,
                              resolverFilter,
                              approverFilter,
                              resourceIdFilter,
                              dateRange: filterDateRange,
                              onlyUnassignedResolver
                            });
                            setSelectedTickets(ids);
                          }}
                        >
                          Select all {totalTickets}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
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
              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredTickets.length} of {totalTickets} tickets
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <span className="text-sm">Page {page}</span>
                  <Button variant="outline" size="sm" disabled={!hasMore || isLoading} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
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

            <TabsContent value="whatsapp">
              <WhatsAppTestComponent />
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

      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Date Range for Download</DialogTitle>
            <DialogDescription>
              Please select a start and end date to download the tickets for that period, or choose to download all tickets.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={downloadAll}
                onChange={e => setDownloadAll(e.target.checked)}
              />
              Download all tickets (ignore date range)
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                  disabled={downloadAll}
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
                    <span>Pick a date</span>
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
                  disabled={downloadAll}
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button onClick={handleDownloadWithDateRange} disabled={isDownloading}>
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="border-t bg-muted/50 py-4 md:py-6 mt-8 md:mt-12">
        <div className="container mx-auto px-4 text-center text-xs md:text-sm text-muted-foreground">
          <p>© 2024 Awign Technologies. Escalation Management System for TCS Examination Operations.</p>
          <p className="mt-1">For technical support, contact: support@awign.com</p>
        </div>
      </footer>
    </div>
  );
};
