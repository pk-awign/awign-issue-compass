import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Issue, TimelineEvent, StatusTransition } from '../../types/issue';
import { TicketService } from '../../services/ticketService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Clock, 
  User, 
  FileText, 
  MessageSquare, 
  Paperclip, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  History
} from 'lucide-react';
import { format } from 'date-fns';

interface EnhancedTicketManagementProps {
  ticket: Issue;
  onUpdate: () => void;
}

export const EnhancedTicketManagement: React.FC<EnhancedTicketManagementProps> = ({ 
  ticket, 
  onUpdate 
}) => {
  const { user } = useAuth();
  const [statusTransitions, setStatusTransitions] = useState<StatusTransition[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    loadStatusTransitions();
    loadTimeline();
  }, [ticket.id]);

  const loadStatusTransitions = async () => {
    try {
      const transitions = await TicketService.getStatusTransitions();
      setStatusTransitions(transitions);
    } catch (error) {
      console.error('Error loading status transitions:', error);
    }
  };

  const loadTimeline = async () => {
    try {
      const timelineData = await TicketService.getTicketTimeline(ticket.id);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Error loading timeline:', error);
    }
  };

  const getAvailableTransitions = (currentStatus: Issue['status'], userRole: string) => {
    if (userRole === 'super_admin') {
      // Super admin can transition to any status
      return ['open', 'in_progress', 'send_for_approval', 'approved', 'resolved'];
    }
    
    return statusTransitions
      .filter(t => t.fromStatus === currentStatus && t.allowedRoles.includes(userRole))
      .map(t => t.toStatus);
  };

  const handleStatusChange = async (newStatus: Issue['status']) => {
    if (!user?.id) return;

    setIsUpdating(true);
    try {
      const success = await TicketService.updateTicketStatus(
        ticket.id, 
        newStatus, 
        user.id, 
        resolutionNotes
      );
      
      if (success) {
        onUpdate();
        setResolutionNotes('');
        loadTimeline();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSeverityChange = async (newSeverity: Issue['severity']) => {
    if (!user?.id) return;

    setIsUpdating(true);
    try {
      const success = await TicketService.updateTicketSeverity(
        ticket.id, 
        newSeverity, 
        user.id
      );
      
      if (success) {
        onUpdate();
        loadTimeline();
      }
    } catch (error) {
      console.error('Error updating severity:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: Issue['status']) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'send_for_approval': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: Issue['severity']) => {
    switch (severity) {
      case 'sev1': return 'bg-red-100 text-red-800';
      case 'sev2': return 'bg-orange-100 text-orange-800';
      case 'sev3': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const availableTransitions = getAvailableTransitions(ticket.status, user?.role || '');

  return (
    <div className="space-y-6">
      {/* Ticket Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ticket Overview</span>
            <div className="flex items-center gap-2">
              {ticket.reopenCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Re-Opened ({ticket.reopenCount})
                </Badge>
              )}
              <Badge className={getStatusColor(ticket.status)}>
                {ticket.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={getSeverityColor(ticket.severity)}>
                {ticket.severity.toUpperCase()}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Submitted By</h4>
              <p className="text-sm">
                {ticket.isAnonymous ? 'Anonymous' : ticket.submittedBy}
                {ticket.submittedByUserId && (
                  <span className="text-gray-500 ml-2">(ID: {ticket.submittedByUserId})</span>
                )}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Submitted At</h4>
              <p className="text-sm">{ticket.submittedAt ? format(new Date(ticket.submittedAt), 'MMM dd, yyyy HH:mm:ss') : 'N/A'}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Assigned Resolver</h4>
              <p className="text-sm">
                {ticket.assignedResolverDetails ? (
                  `${ticket.assignedResolverDetails.name} (${ticket.assignedResolverDetails.role})`
                ) : (
                  ticket.assignedResolver || 'Not assigned'
                )}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Assigned Approver</h4>
              <p className="text-sm">
                {ticket.assignedApproverDetails ? (
                  `${ticket.assignedApproverDetails.name} (${ticket.assignedApproverDetails.role})`
                ) : (
                  ticket.assignedApprover || 'Not assigned'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Management */}
      <Card>
        <CardHeader>
          <CardTitle>Status Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Current Status</label>
              <div className="mt-1">
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Change Status</label>
              <Select onValueChange={handleStatusChange} disabled={isUpdating}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {availableTransitions.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Resolution Notes</label>
            <Textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Add resolution notes..."
              className="mt-1"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Severity Management */}
      <Card>
        <CardHeader>
          <CardTitle>Severity Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium">Current Severity</label>
              <div className="mt-1">
                <Badge className={getSeverityColor(ticket.severity)}>
                  {ticket.severity.toUpperCase()}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Change Severity</label>
              <Select onValueChange={handleSeverityChange} disabled={isUpdating}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select new severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sev1">SEV1 - Critical</SelectItem>
                  <SelectItem value="sev2">SEV2 - High</SelectItem>
                  <SelectItem value="sev3">SEV3 - Medium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ticket Timeline</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTimeline(!showTimeline)}
            >
              <History className="w-4 h-4 mr-2" />
              {showTimeline ? 'Hide' : 'Show'} Timeline
            </Button>
          </CardTitle>
        </CardHeader>
        {showTimeline && (
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {timeline.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No timeline events yet</p>
                ) : (
                  timeline.map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {event.performedByName || 'System'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {event.performedByRole || 'system'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(event.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {event.eventType.replace('_', ' ').toUpperCase()}
                          {event.oldValue && event.newValue && (
                            <span>: {event.oldValue} → {event.newValue}</span>
                          )}
                        </p>
                        {event.details && (
                          <p className="text-xs text-gray-500 mt-1">
                            {JSON.stringify(event.details)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  );
}; 