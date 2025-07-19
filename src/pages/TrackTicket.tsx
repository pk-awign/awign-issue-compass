import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useIssues } from '@/contexts/IssueContext';

const TrackTicket = () => {
  const { ticketNumber } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 md:px-6 py-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="mb-4"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
        
        {ticketNumber && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-800 text-sm">
              Tracking ticket: <span className="font-mono font-semibold">{ticketNumber}</span>
            </p>
          </div>
        )}
        
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-4">Track Ticket</h2>
          <p className="text-muted-foreground">This feature is being enhanced.</p>
        </div>
      </div>
    </div>
  );
};

export default TrackTicket;