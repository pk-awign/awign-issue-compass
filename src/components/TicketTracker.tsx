import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Clock, CheckCircle, AlertCircle, MessageSquare, ChevronLeft, User, Loader2, Paperclip, Download } from 'lucide-react';
import { Issue } from '@/types/issue';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useIssues } from '@/contexts/IssueContext';

interface TicketTrackerProps {
  initialSearchTerm?: string;
}

export const TicketTracker: React.FC<TicketTrackerProps> = ({ initialSearchTerm = '' }) => {
  const { user } = useAuth();
  const { getIssuesByUser, getIssueByTicketNumber } = useIssues();
  
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedTicket, setSelectedTicket] = useState<Issue | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [userIssues, setUserIssues] = useState<Issue[]>([]);
  const [anonymousTicket, setAnonymousTicket] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  // Load user's tickets if logged in
  useEffect(() => {
    if (user) {
      loadUserTickets();
    }
  }, [user]);

  const loadUserTickets = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const issues = await getIssuesByUser(user.id);
      setUserIssues(issues);
    } catch (error) {
      console.error('Error loading user tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // For anonymous search
  const handleAnonymousSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setSearchLoading(true);
    try {
      const ticket = await getIssueByTicketNumber(searchTerm.trim());
      setAnonymousTicket(ticket);
      if (ticket) {
        setSelectedTicket(ticket);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error searching ticket:', error);
      setAnonymousTicket(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const displayIssues = user ? userIssues : (anonymousTicket ? [anonymousTicket] : []);

  const getStatusIcon = (status: Issue['status']) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Issue['status']) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: Issue['issueCategory']) => {
    const labels = {
      payment_delay: 'Payment Delay',
      partial_payment: 'Partial Payment',
      behavioral_complaint: 'Behavioral Complaint',
      improvement_request: 'Improvement Request',
      facility_issue: 'Facility Issue',
      penalty_issue: 'Penalty Issue',
      other: 'Other'
    };
    return labels[category];
  };

  const handleTicketSelect = (issue: Issue) => {
    setSelectedTicket(issue);
    setShowDetails(true);
  };

  const handleBackToList = () => {
    setShowDetails(false);
    setSelectedTicket(null);
  };

  return (
    <div className="space-y-4">
      {/* Mobile: Show either list or details */}
      <div className="lg:hidden">
        {!showDetails ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {user ? <User className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                {user ? `Your Issues (${userIssues.length})` : 'Track Any Ticket'}
              </CardTitle>
              
              {!user && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter ticket number (e.g., AWG-2024-001)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      onKeyPress={(e) => e.key === 'Enter' && handleAnonymousSearch()}
                      disabled={searchLoading}
                    />
                  </div>
                  <Button 
                    onClick={handleAnonymousSearch} 
                    className="w-full" 
                    size="sm"
                    disabled={searchLoading || !searchTerm.trim()}
                  >
                    {searchLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      'Search Ticket'
                    )}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading tickets...</span>
                </div>
              )}
              
              <div className="space-y-3">
                {!loading && displayIssues.length === 0 && user && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No tickets found</p>
                    <p className="text-sm text-gray-500">
                      You haven't submitted any issues yet.
                    </p>
                  </div>
                )}
                
                {!loading && displayIssues.length === 0 && !user && !anonymousTicket && searchTerm && !searchLoading && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Ticket not found</p>
                    <p className="text-sm text-gray-500">
                      Please check the ticket number and try again.
                    </p>
                  </div>
                )}
                
                {!loading && displayIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => handleTicketSelect(issue)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(issue.status)}
                        <span className="font-mono text-xs font-medium">{issue.ticketNumber}</span>
                      </div>
                      <Badge className={`${getStatusColor(issue.status)} text-xs`}>
                        {issue.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{getCategoryLabel(issue.issueCategory)}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {issue.issueDescription}
                    </p>
                    <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                      <span>{issue.city} - {issue.centreCode}</span>
                      <span>{format(issue.submittedAt, 'MMM dd')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleBackToList}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">Ticket Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {selectedTicket && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{selectedTicket.ticketNumber}</h3>
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Category:</span>
                      <p className="text-muted-foreground">{getCategoryLabel(selectedTicket.issueCategory)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Centre:</span>
                      <p className="text-muted-foreground">{selectedTicket.centreCode}</p>
                    </div>
                    <div>
                      <span className="font-medium">City:</span>
                      <p className="text-muted-foreground">{selectedTicket.city}</p>
                    </div>
                    <div>
                      <span className="font-medium">Submitted:</span>
                      <p className="text-muted-foreground">{format(selectedTicket.submittedAt, 'PPP p')}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <span className="font-medium">Description:</span>
                    <p className="text-muted-foreground mt-1 text-sm">{selectedTicket.issueDescription}</p>
                  </div>

                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 ? (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Paperclip className="h-4 w-4" />
                          <span className="font-medium">Attachments ({selectedTicket.attachments.length})</span>
                        </div>
                        <div className="space-y-2">
                          {selectedTicket.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{attachment.fileName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(attachment.fileSize / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(attachment.downloadUrl, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Separator />
                      <div className="text-xs text-muted-foreground">No attachments uploaded.</div>
                    </>
                  )}

                  {selectedTicket.comments.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="h-4 w-4" />
                          <span className="font-medium">Comments ({selectedTicket.comments.length})</span>
                        </div>
                        <div className="space-y-3 max-h-40 overflow-y-auto">
                          {selectedTicket.comments.map((comment) => (
                            <div key={comment.id} className="p-3 bg-muted rounded-lg">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium">{comment.author}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(comment.timestamp, 'MMM dd, HH:mm')}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedTicket.resolutionNotes && (
                    <>
                      <Separator />
                      <div>
                        <span className="font-medium">Resolution Notes:</span>
                        <p className="text-muted-foreground mt-1 text-sm">{selectedTicket.resolutionNotes}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop: Side by side layout */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6">
        {/* Ticket List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {user ? <User className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              {user ? `Your Issues (${userIssues.length})` : 'Track Any Ticket'}
            </CardTitle>
            
            {!user && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter ticket number (e.g., AWG-2024-001)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleAnonymousSearch()}
                    disabled={searchLoading}
                  />
                </div>
                <Button 
                  onClick={handleAnonymousSearch} 
                  className="w-full" 
                  size="sm"
                  disabled={searchLoading || !searchTerm.trim()}
                >
                  {searchLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    'Search Ticket'
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading tickets...</span>
              </div>
            )}
            
            <div className="space-y-4">
              {!loading && displayIssues.length === 0 && user && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No tickets found</p>
                  <p className="text-sm text-gray-500">
                    You haven't submitted any issues yet.
                  </p>
                </div>
              )}
              
              {!loading && displayIssues.length === 0 && !user && !anonymousTicket && searchTerm && !searchLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Ticket not found</p>
                  <p className="text-sm text-gray-500">
                    Please check the ticket number and try again.
                  </p>
                </div>
              )}
              
              {!loading && displayIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedTicket?.id === issue.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedTicket(issue)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(issue.status)}
                      <span className="font-mono text-sm font-medium">{issue.ticketNumber}</span>
                    </div>
                    <Badge className={getStatusColor(issue.status)}>
                      {issue.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mb-1">{getCategoryLabel(issue.issueCategory)}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {issue.issueDescription}
                  </p>
                  <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                    <span>{issue.city} - {issue.centreCode}</span>
                    <span>{format(issue.submittedAt, 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ticket Details */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTicket ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{selectedTicket.ticketNumber}</h3>
                  <Badge className={getStatusColor(selectedTicket.status)}>
                    {selectedTicket.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Category:</span>
                    <p className="text-muted-foreground">{getCategoryLabel(selectedTicket.issueCategory)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Centre:</span>
                    <p className="text-muted-foreground">{selectedTicket.centreCode}</p>
                  </div>
                  <div>
                    <span className="font-medium">City:</span>
                    <p className="text-muted-foreground">{selectedTicket.city}</p>
                  </div>
                  <div>
                    <span className="font-medium">Submitted:</span>
                    <p className="text-muted-foreground">{format(selectedTicket.submittedAt, 'PPP p')}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <span className="font-medium">Description:</span>
                  <p className="text-muted-foreground mt-1">{selectedTicket.issueDescription}</p>
                </div>

                {selectedTicket.attachments && selectedTicket.attachments.length > 0 ? (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Paperclip className="h-4 w-4" />
                        <span className="font-medium">Attachments ({selectedTicket.attachments.length})</span>
                      </div>
                      <div className="space-y-2">
                        {selectedTicket.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{attachment.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(attachment.fileSize / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(attachment.downloadUrl, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Separator />
                    <div className="text-xs text-muted-foreground">No attachments uploaded.</div>
                  </>
                )}

                {selectedTicket.comments.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium">Comments ({selectedTicket.comments.length})</span>
                      </div>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {selectedTicket.comments.map((comment) => (
                          <div key={comment.id} className="p-3 bg-muted rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">{comment.author}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(comment.timestamp, 'MMM dd, HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedTicket.resolutionNotes && (
                  <>
                    <Separator />
                    <div>
                      <span className="font-medium">Resolution Notes:</span>
                      <p className="text-muted-foreground mt-1">{selectedTicket.resolutionNotes}</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {user ? 'Select a ticket to view details' : 'Search for a ticket to view details'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
