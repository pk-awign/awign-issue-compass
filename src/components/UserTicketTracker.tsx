
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ticket, Search, Calendar, MapPin, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthService } from '@/services/authService';
import { format } from 'date-fns';

interface UserTicket {
  id: string;
  ticket_number: string;
  issue_category: string;
  issue_description: string;
  status: string;
  severity: string;
  city: string;
  centre_code: string;
  created_at: string;
}

export const UserTicketTracker: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<UserTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadUserTickets();
    }
  }, [user]);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm]);

  const loadUserTickets = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const userTickets = await AuthService.getUserTickets(user.id);
      setTickets(userTickets);
    } catch (error) {
      console.error('Error loading user tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTickets = () => {
    if (!searchTerm) {
      setFilteredTickets(tickets);
      return;
    }

    const filtered = tickets.filter(ticket =>
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.issue_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.issue_category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTickets(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'sev1': return 'bg-red-100 text-red-800';
      case 'sev2': return 'bg-orange-100 text-orange-800';
      case 'sev3': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please login to view your tickets</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          My Tickets ({filteredTickets.length})
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">Search tickets</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Search by ticket number, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={loadUserTickets} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              {tickets.length === 0 ? 'No tickets found' : 'No tickets match your search'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{ticket.ticket_number}</span>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getSeverityColor(ticket.severity)}>
                      {ticket.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/track/${ticket.ticket_number}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
                
                <h3 className="font-medium mb-2">{formatCategory(ticket.issue_category)}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ticket.issue_description}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {ticket.city}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {ticket.centre_code}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(ticket.created_at), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
