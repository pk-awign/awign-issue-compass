import React, { useState } from 'react';
import { AdminService } from '../../services/adminService';
import { Issue } from '../../types/issue';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export const GurpreetTicketQuery: React.FC = () => {
  const [tickets, setTickets] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryGurpreetTickets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await AdminService.getTicketsByResolverName('Gurpreet Singh');
      setTickets(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Group tickets by status
  const statusCounts = tickets.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Gurpreet Singh - Ticket Assignment Query</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={queryGurpreetTickets} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? 'Querying...' : 'Query Gurpreet Singh Tickets'}
          </Button>

          {error && (
            <div className="text-red-600 mb-4">
              Error: {error}
            </div>
          )}

          {tickets.length > 0 && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  📊 Total Tickets: {tickets.length}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <Badge key={status} className={getStatusColor(status)}>
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">📋 Ticket Details:</h3>
                {tickets.map((ticket, index) => (
                  <Card key={ticket.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{ticket.ticketNumber}</h4>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div><strong>Severity:</strong> {ticket.severity}</div>
                      <div><strong>City:</strong> {ticket.city}</div>
                      <div><strong>Centre:</strong> {ticket.centreCode}</div>
                      <div><strong>Created:</strong> {new Date(ticket.submittedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="mt-2 text-sm">
                      <strong>Description:</strong> {ticket.issueDescription.substring(0, 150)}
                      {ticket.issueDescription.length > 150 && '...'}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tickets.length === 0 && !loading && !error && (
            <div className="text-gray-500">
              Click the button above to query tickets assigned to Gurpreet Singh
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
