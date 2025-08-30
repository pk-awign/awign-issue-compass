import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useIssues } from '../../contexts/IssueContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export const UserAssignmentTest: React.FC = () => {
  const { user } = useAuth();
  const { issues } = useIssues();
  const [userTickets, setUserTickets] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !issues) return;

    // Filter tickets assigned to current user
    const assignedTickets = issues.filter(issue => {
      // Check both assignees array and direct assignment fields
      const hasAssigneeMatch = (issue as any).assignees?.some((a: any) => a.user_id === user.id);
      const hasResolverMatch = issue.assignedResolver === user.id;
      const hasApproverMatch = issue.assignedApprover === user.id;
      
      return hasAssigneeMatch || hasResolverMatch || hasApproverMatch;
    });

    setUserTickets(assignedTickets);
  }, [user, issues]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'ops_input_required': return 'bg-purple-100 text-purple-800';
      case 'send_for_approval': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssignmentType = (issue: any) => {
    if (issue.assignedResolver === user?.id) return 'Resolver';
    if (issue.assignedApprover === user?.id) return 'Approver';
    if ((issue as any).assignees?.some((a: any) => a.user_id === user?.id)) {
      const assignee = (issue as any).assignees.find((a: any) => a.user_id === user?.id);
      return assignee?.role || 'Assignee';
    }
    return 'Unknown';
  };

  if (!user) {
    return <div>Please log in to see your assigned tickets.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>User Assignment Test - {user.name}</CardTitle>
          <p className="text-sm text-gray-600">
            User ID: {user.id} | Role: {user.role}
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">
              📊 Total Assigned Tickets: {userTickets.length}
            </h3>
            
            {/* Status breakdown */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(
                userTickets.reduce((acc, ticket) => {
                  acc[ticket.status] = (acc[ticket.status] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([status, count]) => (
                <Badge key={status} className={getStatusColor(status)}>
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">📋 Assigned Tickets:</h3>
            {userTickets.length === 0 ? (
              <div className="text-gray-500">No tickets assigned to this user.</div>
            ) : (
              userTickets.map((ticket, index) => (
                <Card key={ticket.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{ticket.ticketNumber}</h4>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                      <Badge variant="outline">
                        {getAssignmentType(ticket)}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                    <div><strong>Severity:</strong> {ticket.severity}</div>
                    <div><strong>City:</strong> {ticket.city}</div>
                    <div><strong>Centre:</strong> {ticket.centreCode}</div>
                    <div><strong>Created:</strong> {new Date(ticket.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="mt-2 text-sm">
                    <strong>Description:</strong> {ticket.issueDescription.substring(0, 100)}
                    {ticket.issueDescription.length > 100 && '...'}
                  </div>
                  
                  {/* Debug info */}
                  <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                    <strong>Debug Info:</strong>
                    <br />
                    assignedResolver: {ticket.assignedResolver || 'null'}
                    <br />
                    assignedApprover: {ticket.assignedApprover || 'null'}
                    <br />
                    assignees: {JSON.stringify((ticket as any).assignees || [])}
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
