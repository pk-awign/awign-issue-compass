import React, { createContext, useContext, useState, useEffect } from 'react';
import { Issue, Comment, User } from '@/types/issue';
import { AdminService } from '@/services/adminService';
import { submitIssue, getTicketByNumber } from '@/services/ticketService';

interface IssueContextType {
  issues: Issue[];
  loading: boolean;
  refreshIssues: () => Promise<void>;
  addIssue: (issueData: any) => Promise<string>;
  getIssuesByCity: (city: string) => Promise<Issue[]>;
  addComment: (ticketNumber: string, commentData: Omit<Comment, 'id' | 'timestamp'>) => Promise<void>;
}

const IssueContext = createContext<IssueContextType>({
  issues: [],
  loading: false,
  refreshIssues: async () => {},
  addIssue: async () => '',
  getIssuesByCity: async () => [],
  addComment: async () => {},
});

export const IssueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshIssues = async () => {
    setLoading(true);
    try {
      const { tickets } = await AdminService.getAllTickets(false, 1, 1000);
      setIssues(tickets);
    } catch (error) {
      console.error('Error refreshing issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const addIssueToContext = async (issueData: any): Promise<string> => {
    try {
      const ticketNumber = await submitIssue(issueData);
      await refreshIssues();
      return ticketNumber;
    } catch (error) {
      console.error('Error adding issue:', error);
      throw error;
    }
  };

  const getIssuesByCity = async (city: string): Promise<Issue[]> => {
    try {
      const { tickets } = await AdminService.getAllTickets(false, 1, 1000);
      return tickets.filter(issue => issue.city === city);
    } catch (error) {
      console.error('Error getting issues by city:', error);
      return [];
    }
  };

  const addCommentToTicket = async (ticketNumber: string, commentData: Omit<Comment, 'id' | 'timestamp'>) => {
    try {
      // For now, just refresh issues
      await refreshIssues();
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  };

  useEffect(() => {
    refreshIssues();
  }, []);

  return (
    <IssueContext.Provider value={{
      issues,
      loading,
      refreshIssues,
      addIssue: addIssueToContext,
      getIssuesByCity,
      addComment: addCommentToTicket,
    }}>
      {children}
    </IssueContext.Provider>
  );
};

export const useIssues = () => {
  return useContext(IssueContext);
};