import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Issue, Comment } from '@/types/issue';
import { useIssues } from '@/contexts/IssueContext';
import { format } from 'date-fns';
import { Clock, User, MapPin, FileText, MessageSquare, History, AlertTriangle, Paperclip, Download } from 'lucide-react';
import { toast } from 'sonner';
import { TicketService } from '@/services/ticketService';

interface TicketDetailsModalProps {
  ticket: Issue | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: 'resolver' | 'approver';
  currentUser?: string;
}

export const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({
  ticket,
  isOpen,
  onClose,
  userRole,
  currentUser
}) => {
  const { updateStatus, addComment } = useIssues();
  const [newComment, setNewComment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Issue['status']>('open');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [availableTransitions, setAvailableTransitions] = useState<Issue['status'][]>([]);

  useEffect(() => {
    if (ticket && userRole) {
      TicketService.getStatusTransitions(userRole, ticket.status).then(setAvailableTransitions);
    }
  }, [ticket, userRole]);

  if (!ticket) return null;

  const handleStatusUpdate = async () => {
    if (!ticket) return;
    setIsUpdating(true);
    try {
      await updateStatus(ticket.id, selectedStatus, resolutionNotes);
      toast.success('Ticket status updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update ticket status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!ticket || !newComment.trim()) return;
    
    try {
      await addComment(ticket.id, {
        content: newComment,
        author: currentUser || 'Unknown',
        authorRole: userRole,
        isInternal: false
      });
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleDownloadAttachment = (attachment: any) => {
    window.open(attachment.downloadUrl, '_blank');
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs sm:max-w-2xl w-full max-h-[90vh] overflow-hidden p-2 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ticket Details - {ticket.ticketNumber}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 p-1">
            {/* Ticket Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(ticket.severity)}>
                      {ticket.severity.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {ticket.resolvedAt && (
                      <Badge variant="outline">
                        Resolved {format(ticket.resolvedAt, 'MMM dd, yyyy')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Submitted {format(ticket.submittedAt, 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <p className="text-sm font-medium">Centre Code</p>
                    <p className="text-sm text-muted-foreground">{ticket.centreCode}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">City</p>
                    <p className="text-sm text-muted-foreground">{ticket.city}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Category</p>
                    <p className="text-sm text-muted-foreground">{formatCategory(ticket.issueCategory)}</p>
                  </div>
                  {ticket.resourceId && (
                    <div>
                      <p className="text-sm font-medium">Resource ID</p>
                      <p className="text-sm text-muted-foreground">{ticket.resourceId}</p>
                    </div>
                  )}
                  {ticket.awignAppTicketId && (
                    <div>
                      <p className="text-sm font-medium">Awign App Ticket ID</p>
                      <p className="text-sm text-muted-foreground">{ticket.awignAppTicketId}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Submitted By</p>
                    <p className="text-sm text-muted-foreground">{ticket.isAnonymous ? 'Anonymous' : ticket.submittedBy || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">{format(ticket.submittedAt, 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                  {ticket.issueDate && (
                    <div>
                      <p className="text-sm font-medium">Issue Date(s)</p>
                      {ticket.issueDate.type === 'multiple' && Array.isArray(ticket.issueDate.dates) ? (
                        <ul className="mt-1 space-y-1">
                          {ticket.issueDate.dates.map((d: any, idx: number) => (
                            <li key={idx} className="text-sm flex flex-col">
                              <span className="font-mono">{d.date instanceof Date ? d.date.toLocaleDateString() : new Date(d.date).toLocaleDateString()}</span>
                              {d.description && <span className="text-xs text-gray-500 ml-2">{d.description}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-sm">{
                          ticket.issueDate.type === 'single' && ticket.issueDate.dates && ticket.issueDate.dates[0]
                            ? (ticket.issueDate.dates[0] instanceof Date ? ticket.issueDate.dates[0].toLocaleDateString() : new Date(ticket.issueDate.dates[0]).toLocaleDateString())
                            : ticket.issueDate.type === 'range' && ticket.issueDate.startDate && ticket.issueDate.endDate
                              ? `${ticket.issueDate.startDate instanceof Date ? ticket.issueDate.startDate.toLocaleDateString() : new Date(ticket.issueDate.startDate).toLocaleDateString()} - ${ticket.issueDate.endDate instanceof Date ? ticket.issueDate.endDate.toLocaleDateString() : new Date(ticket.issueDate.endDate).toLocaleDateString()}`
                              : ticket.issueDate.type === 'ongoing'
                                ? 'Ongoing Issue'
                                : 'N/A'
                        }</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Issue Description</p>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {ticket.issueDescription}
                  </p>
                </div>
                {ticket.resolutionNotes && (
                  <div>
                    <p className="text-sm font-medium mb-2">Resolution Notes</p>
                    <p className="text-sm text-muted-foreground bg-green-50 p-3 rounded-md border-l-4 border-green-200">
                      {ticket.resolutionNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments Section */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({ticket.attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {ticket.attachments.map((attachment, index) => (
                      <div key={attachment.id || index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <Paperclip className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium">{attachment.fileName || attachment.name || `Attachment ${index + 1}`}</p>
                            <p className="text-xs text-gray-500">
                              {attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)} KB` : attachment.size || 'Unknown size'}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadAttachment(attachment)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Update */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Update Status</p>
                  <div className="flex gap-2">
                    <Select value={selectedStatus} onValueChange={(value: Issue['status']) => setSelectedStatus(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTransitions.map(status => (
                          <SelectItem key={status} value={status}>
                            {status.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleStatusUpdate}
                      disabled={isUpdating || selectedStatus === ticket.status}
                      size="sm"
                    >
                      Update Status
                    </Button>
                  </div>
                </div>

                {/* Resolution Notes */}
                {(selectedStatus === 'resolved' || ticket.status === 'resolved') && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Resolution Notes</p>
                    <Textarea
                      placeholder="Enter resolution details..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({ticket.comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.comments.length > 0 ? (
                  <div className="space-y-3">
                    {ticket.comments.map((comment) => (
                      <div key={comment.id} className="border-l-4 border-blue-200 bg-blue-50 p-3 rounded-r-md">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comment.author}</span>
                            <Badge variant="outline" className="text-xs">
                              {comment.authorRole}
                            </Badge>
                            {comment.isInternal && (
                              <Badge variant="secondary" className="text-xs">
                                Internal
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(comment.timestamp, 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet
                  </p>
                )}
                
                {/* Add Comment */}
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium">Add Comment</p>
                  <Textarea
                    placeholder="Enter your comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    size="sm"
                  >
                    Add Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
