import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Calendar, 
  MapPin, 
  Building2, 
  Clock, 
  AlertCircle,
  CheckCircle,
  UserCog,
  Shield,
  FileText,
  MessageSquare,
  Paperclip,
  AlertTriangle,
  XCircle,
  RefreshCw,
  History,
  Download,
  Eye
} from 'lucide-react';
import { Issue, User as UserType, TimelineEvent, StatusTransition } from '@/types/issue';
import { AdminService } from '@/services/adminService';
import { TicketService } from '@/services/ticketService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface TicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Issue | null;
  onTicketUpdate: () => void;
}

export const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({
  isOpen,
  onClose,
  ticket,
  onTicketUpdate
}) => {
  const { user } = useAuth();
  const [resolvers, setResolvers] = useState<UserType[]>([]);
  const [approvers, setApprovers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [statusTransitions, setStatusTransitions] = useState<StatusTransition[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [assignees, setAssignees] = useState<{ user_id: string; role: string; assigned_at: string }[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [newAssignee, setNewAssignee] = useState<string>('');
  const [assigneeRole, setAssigneeRole] = useState<string>('resolver');
  const [commentText, setCommentText] = useState('');
  const [isAssigneeLoading, setIsAssigneeLoading] = useState(false);
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadStatusTransitions();
    }
    if (isOpen && ticket?.id) {
      loadAssignees();
      loadAllUsers();
    }
  }, [isOpen, ticket?.id]);

  useEffect(() => {
    if (activeTab === 'timeline' && ticket) {
      setIsTimelineLoading(true);
      TicketService.getTicketHistory(ticket.id)
        .then(events => {
          console.log('DEBUG: ticket_history events fetched:', events);
          setTimeline(events);
        })
        .finally(() => setIsTimelineLoading(false));
    }
  }, [activeTab, ticket]);

  const loadUsers = async () => {
    try {
      const [resolverData, approverData] = await Promise.all([
        AdminService.getUsersByRole('resolver'),
        AdminService.getUsersByRole('approver')
      ]);
      setResolvers(resolverData);
      setApprovers(approverData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

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
      const timelineData = await TicketService.getTicketTimeline(ticket?.id || '');
      setTimeline(timelineData);
    } catch (error) {
      console.error('Error loading timeline:', error);
    }
  };

  const loadAssignees = async () => {
    if (!ticket?.id) return;
    const { data, error } = await TicketService.getAssignees(ticket.id);
    if (!error && data) setAssignees(data);
  };

  const loadAllUsers = async () => {
    const users = await AdminService.getAllUsers();
    setAllUsers(users);
  };

  const handleAssignResolver = async (assignedTo: string) => {
    if (!ticket || !assignedTo) {
      toast.error('Please select a resolver');
      return;
    }

    setLoading(true);
    try {
      await AdminService.assignTicket({
        ticketId: ticket.id,
        assignedTo,
        type: 'manual'
      });
      toast.success('Ticket assigned to resolver successfully');
      onTicketUpdate();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast.error('Failed to assign ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignApprover = async (approverId: string) => {
    if (!ticket || !approverId) {
      toast.error('Please select an approver');
      return;
    }

    setLoading(true);
    try {
      await AdminService.assignToApprover(ticket.id, approverId);
      toast.success('Ticket assigned to approver successfully');
      onTicketUpdate();
    } catch (error) {
      console.error('Error assigning to approver:', error);
      toast.error('Failed to assign to approver');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!ticket) return;

    setLoading(true);
    try {
      await AdminService.updateTicketStatus(ticket.id, status, resolutionNotes);
      toast.success('Ticket status updated successfully');
      onTicketUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update ticket status');
    } finally {
      setLoading(false);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'sev1': return 'destructive';
      case 'sev2': return 'default';
      case 'sev3': return 'secondary';
      default: return 'outline';
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
    if (!user?.id || !ticket?.id) return;

    setIsUpdating(true);
    try {
      const success = await TicketService.updateTicketStatus(
        ticket.id, 
        newStatus, 
        user.id, 
        resolutionNotes
      );
      
      if (success) {
        onTicketUpdate();
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
    if (!user?.id || !ticket?.id) return;

    setIsUpdating(true);
    try {
      const success = await TicketService.updateTicketSeverity(
        ticket.id, 
        newSeverity, 
        user.id
      );
      
      if (success) {
        onTicketUpdate();
        loadTimeline();
      }
    } catch (error) {
      console.error('Error updating severity:', error);
    } finally {
      setIsUpdating(false);
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

  const handleDownloadAttachment = (attachment: any) => {
    window.open(attachment.downloadUrl, '_blank');
  };

  const availableTransitions = ticket ? getAvailableTransitions(ticket.status, user?.role || '') : [];

  const handleAddAssignee = async () => {
    if (!ticket?.id || !newAssignee || !user) return;
    setIsAssigneeLoading(true);
    const selectedUser = allUsers.find(u => u.id === newAssignee);
    if (!selectedUser) return;
    await TicketService.addAssignee(ticket.id, newAssignee, assigneeRole, user.id, user.name, user.role);
    setNewAssignee('');
    await loadAssignees();
    await loadTimeline();
    setIsAssigneeLoading(false);
  };

  const handleRemoveAssignee = async (userId: string, role: string) => {
    if (!ticket?.id || !user) return;
    setIsAssigneeLoading(true);
    await TicketService.removeAssignee(ticket.id, userId, role, user.id, user.name, user.role);
    await loadAssignees();
    await loadTimeline();
    setIsAssigneeLoading(false);
  };

  const handleAddComment = async () => {
    if (!ticket?.id || !user || !commentText.trim()) return;
    setIsCommentLoading(true);
    await TicketService.addTimelineComment(ticket.id, commentText, user.id, user.name, user.role);
    setCommentText('');
    await loadTimeline();
    setIsCommentLoading(false);
  };

  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Ticket Details - {ticket.ticketNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with badges */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{ticket.ticketNumber}</h2>
              <p className="text-gray-600">{ticket.issueDescription.substring(0, 100)}...</p>
            </div>
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
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b">
            <Button
              variant={activeTab === 'details' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('details')}
            >
              Details
            </Button>
            <Button
              variant={activeTab === 'management' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('management')}
            >
              Management
            </Button>
            <Button
              variant={activeTab === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('timeline')}
            >
              Timeline
            </Button>
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Centre Code</label>
                      <p className="text-sm">{ticket.centreCode}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">City</label>
                      <p className="text-sm">{ticket.city}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Resource ID</label>
                      <p className="text-sm">{ticket.resourceId || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Issue Category</label>
                      <p className="text-sm">{ticket.issueCategory.replace('_', ' ').toUpperCase()}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-sm mt-1">{ticket.issueDescription}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Assignment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Submitted By</label>
                      <p className="text-sm">
                        {ticket.isAnonymous ? 'Anonymous' : ticket.submittedBy}
                        {ticket.submittedByUserId && (
                          <span className="text-gray-500 ml-2">(ID: {ticket.submittedByUserId})</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Submitted At</label>
                      <p className="text-sm">{formatDate(ticket.submittedAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Assigned Resolvers</label>
                      <p className="text-sm">
                        {assignees.filter(a => a.role === 'resolver').length === 0
                          ? 'Not assigned'
                          : assignees.filter(a => a.role === 'resolver').map(a => {
                              const u = allUsers.find(u => u.id === a.user_id);
                              return u ? `${u.name} (${u.role})` : a.user_id;
                            }).join(', ')
                      }
                    </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Assigned Approvers</label>
                      <p className="text-sm">
                        {assignees.filter(a => a.role === 'approver').length === 0
                          ? 'Not assigned'
                          : assignees.filter(a => a.role === 'approver').map(a => {
                              const u = allUsers.find(u => u.id === a.user_id);
                              return u ? `${u.name} (${u.role})` : a.user_id;
                            }).join(', ')
                      }
                    </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Paperclip className="w-5 h-5" />
                      Attachments ({ticket.attachments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ticket.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{attachment.fileName}</span>
                            <span className="text-xs text-gray-500">
                              ({(attachment.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadAttachment(attachment)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comments */}
              {ticket.comments && ticket.comments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Comments ({ticket.comments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ticket.comments.map((comment) => (
                        <div key={comment.id} className="border-l-2 border-blue-500 pl-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.author}</span>
                            <Badge variant="outline" className="text-xs">
                              {comment.authorRole}
                            </Badge>
                            {comment.isInternal && (
                              <Badge variant="secondary" className="text-xs">Internal</Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatDate(comment.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Management Tab */}
          {activeTab === 'management' && user?.role === 'super_admin' && (
            <div className="space-y-6">
              {/* Assignee Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Assignee Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Current Assignees</label>
                    <div className="space-y-2 mt-2">
                      {assignees.length === 0 && <p className="text-gray-500">No assignees yet.</p>}
                      {assignees.map(a => {
                        const u = allUsers.find(u => u.id === a.user_id);
                        return (
                          <div key={a.user_id + a.role} className="flex items-center gap-2">
                            <span className="text-sm">{u ? u.name : a.user_id} ({a.role})</span>
                            <Button size="sm" variant="destructive" onClick={() => handleRemoveAssignee(a.user_id, a.role)} disabled={isAssigneeLoading}>Remove</Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={assigneeRole} onValueChange={setAssigneeRole}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resolver">Resolver</SelectItem>
                        <SelectItem value="approver">Approver</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={newAssignee} onValueChange={setNewAssignee}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select user to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {(assigneeRole === 'resolver' ? resolvers : approvers)
                          .filter(u => !assignees.some(a => a.user_id === u.id && a.role === assigneeRole))
                          .map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleAddAssignee} disabled={!newAssignee || isAssigneeLoading}>Add</Button>
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
                      <Select onValueChange={value => { setSelectedStatus(value); handleStatusChange(value as Issue['status']); }} disabled={isUpdating}>
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
                  
                  {selectedStatus === 'resolved' && (
                    <div>
                      <label className="text-sm font-medium">Resolution Notes</label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Add resolution notes..."
                        className="mt-1"
                        rows={3}
                      />
                      <Button className="mt-2" onClick={() => handleStatusChange('resolved')} disabled={isUpdating || !resolutionNotes.trim()}>
                        Submit Resolution
                      </Button>
                    </div>
                  )}
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
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Ticket History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isTimelineLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : timeline.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No history events yet.</div>
                ) : (
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {timeline.map(event => {
                      const isTimelineEvent = 'performedByName' in event;
                      if (isTimelineEvent) {
                        return (
                          <div key={event.id} className="border-l-2 border-blue-500 pl-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{event.performedByName || 'System'}</span>
                              <span className="text-xs text-gray-500">{event.eventType.replace('_', ' ')}</span>
                              <span className="text-xs text-gray-400 ml-auto">{formatDate(new Date(event.createdAt))}</span>
                            </div>
                            {event.details && <div className="text-sm text-gray-700">{JSON.stringify(event.details)}</div>}
                          </div>
                        );
                      } else {
                        // For raw ticket_history events, use correct field names
                        const raw = event as any;
                        return (
                          <div key={raw.id} className="border-l-2 border-blue-500 pl-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{raw.performed_by || 'System'}</span>
                              <span className="text-xs text-gray-500">{(raw.action_type || '').replace('_', ' ')}</span>
                              <span className="text-xs text-gray-400 ml-auto">{formatDate(new Date(raw.performed_at))}</span>
                            </div>
                            {raw.details && <div className="text-sm text-gray-700">{JSON.stringify(raw.details)}</div>}
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
