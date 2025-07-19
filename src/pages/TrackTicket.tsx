
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicIssueForm } from '@/components/PublicIssueForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useIssues } from '@/contexts/IssueContext';

const TrackTicketContent = () => {
  const { ticketNumber } = useParams();
  const navigate = useNavigate();
  const { addIssue } = useIssues();

  const handleSubmitIssue = (issueData: any) => {
    return addIssue(issueData);
  };

  const handleAdminLogin = () => {
    navigate('/login');
  };

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
      </div>
      
      <PublicIssueForm 
        onSubmit={handleSubmitIssue} 
        onAdminLogin={handleAdminLogin}
        defaultTab="track"
        searchTerm={ticketNumber || ''}
      />
    </div>
  );
};

const TrackTicket = () => {
  return <TrackTicketContent />;
};

export default TrackTicket;
