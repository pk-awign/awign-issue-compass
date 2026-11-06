
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PublicIssueForm } from '@/components/PublicIssueForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useIssues } from '@/contexts/IssueContext';
import { useAuth } from '@/contexts/AuthContext';

const TrackTicketContent = () => {
  const [searchParams] = useSearchParams();
  const ticketNumber = searchParams.get('id');
  const navigate = useNavigate();
  const { addIssue } = useIssues();
  const { user } = useAuth();

  const handleSubmitIssue = (issueData: any) => {
    // Pass user ID if logged in, otherwise undefined for anonymous
    return addIssue(issueData, user?.id);
  };

  const handleAdminLogin = () => {
    navigate('/login');
  };

  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            size="sm"
            className="h-9"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          {ticketNumber && (
            <p className="min-w-0 truncate rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Tracking <span className="font-mono font-semibold">{ticketNumber}</span>
            </p>
          )}
        </div>
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
