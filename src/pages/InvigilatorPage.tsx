import React, { useState, useEffect } from 'react';
import { Header } from '@/components/navigation/Header';
import { TicketTracker } from '@/components/TicketTracker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useIssues } from '@/contexts/IssueContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Issue } from '@/types/issue';

export const InvigilatorPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { getIssuesByCity } = useIssues();
  const navigate = useNavigate();
  const [assignedIssues, setAssignedIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const loadAssignedIssues = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const issues = await getIssuesByCity(user.city);
      setAssignedIssues(issues);
    } catch (error) {
      console.error('Error loading assigned issues:', error);
      toast.error('Failed to load assigned issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignedIssues();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-4 md:space-y-6">
          <div className="text-center space-y-2 md:space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Invigilator Dashboard</h2>
            <p className="text-sm md:text-base text-gray-600">Manage assigned centres and track issues in your jurisdiction</p>
            {user && (
              <div className="bg-blue-50 p-4 md:p-6 rounded-lg">
                <p className="text-blue-800 text-sm md:text-base">Assigned to: {user.city} - {user.centreCode}</p>
                <p className="text-xs md:text-sm text-blue-600 mt-2">
                  You have {assignedIssues.length} assigned issue(s)
                </p>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Your Tickets & City Issues</CardTitle>
              <p className="text-sm text-gray-600">
                View and comment on your own tickets and all issues in {user?.city}. You can add comments to any ticket in your jurisdiction.
              </p>
            </CardHeader>
            <CardContent>
              <TicketTracker />
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t bg-muted/50 py-4 md:py-6 mt-8 md:mt-12">
        <div className="container mx-auto px-4 text-center text-xs md:text-sm text-muted-foreground">
          <p>© 2024 Awign Technologies. Escalation Management System for TCS Examination Operations.</p>
          <p className="mt-1">For technical support, contact: support@awign.com</p>
        </div>
      </footer>
    </div>
  );
};
