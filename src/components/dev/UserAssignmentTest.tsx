import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AdminService } from '@/services/adminService';
import { toast } from 'sonner';

export const UserAssignmentTest: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'resolved': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const testAssignments = async () => {
    setLoading(true);
    try {
      console.log('🔍 [ASSIGNMENT TEST] Starting user assignment test...');
      
      const ticketResult = await AdminService.getAllTickets();
      const tickets = ticketResult.tickets;
      console.log('🔍 [ASSIGNMENT TEST] Retrieved tickets with assignees:', tickets.length);
      
      const assignedTickets = tickets.filter(ticket => 
        ticket.assignedResolver || ticket.assignedApprover || ticket.assignedTicketAdmin
      );
      
      console.log('🔍 [ASSIGNMENT TEST] Assigned tickets:', assignedTickets.length);
      
      setResult({
        totalTickets: tickets.length,
        assignedTickets: assignedTickets.length,
        unassignedTickets: tickets.length - assignedTickets.length,
        tickets: tickets.slice(0, 10), // Show first 10 for testing
        statusBreakdown: tickets.reduce((acc, ticket) => {
          acc[ticket.status] = (acc[ticket.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });
      
      toast.success(`Test completed! Found ${assignedTickets.length} assigned tickets`);
      
    } catch (error: any) {
      console.error('❌ [ASSIGNMENT TEST] Error:', error);
      toast.error('Assignment test failed');
      setResult({ error: error?.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>🧪 User Assignment Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testAssignments} disabled={loading}>
            {loading ? 'Testing...' : 'Test User Assignments'}
          </Button>
          {result && (
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          )}
        </div>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="font-semibold">Total Tickets</div>
                <div className="text-2xl">{result.totalTickets || 0}</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="font-semibold">Assigned</div>
                <div className="text-2xl">{result.assignedTickets || 0}</div>
              </div>
              <div className="p-3 bg-red-50 rounded">
                <div className="font-semibold">Unassigned</div>
                <div className="text-2xl">{result.unassignedTickets || 0}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold">Status Breakdown:</div>
              <div className="flex flex-wrap gap-2">
                {result.statusBreakdown && Object.entries(
                  result.statusBreakdown as Record<string, number>
                ).map(([status, count]) => (
                  <Badge key={status} className={getStatusColor(status)}>
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">📋 Sample Tickets:</h3>
              {result.tickets && result.tickets.slice(0, 5).map((ticket: any) => (
                <div key={ticket.id} className="p-3 border rounded">
                  <div className="font-medium">{ticket.ticketNumber}</div>
                  <div className="text-sm text-gray-600">
                    {ticket.issueCategory} - {ticket.city}
                  </div>
                  <div className="text-xs text-gray-500">
                    Resolver: {ticket.assignedResolver || 'Unassigned'} | 
                    Approver: {ticket.assignedApprover || 'Unassigned'}
                  </div>
                </div>
              ))}
            </div>

            {result.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <div className="font-semibold text-red-800">Error:</div>
                <div className="text-red-700">{String(result.error)}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};