
import React, { useState } from 'react';
import { PublicIssueForm } from '@/components/PublicIssueForm';
import { useIssues } from '@/contexts/IssueContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const WorkforcePage: React.FC = () => {
  const { addIssue } = useIssues();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const handleSubmitIssue = async (issueData: any) => {
    // Pass user ID if logged in, otherwise undefined for anonymous
    const ticketNumber = await addIssue(issueData, user?.id);
    return ticketNumber;
  };

  const handleAdminLogin = () => {
    setShowAdminLogin(true);
    navigate('/login');
  };

  return (
    <PublicIssueForm 
      onSubmit={handleSubmitIssue}
      onAdminLogin={handleAdminLogin}
    />
  );
};
