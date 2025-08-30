import React, { createContext, useContext, useState, useEffect } from 'react';
import { Issue, Comment } from '@/types/issue';
import { TicketService } from '@/services/ticketService';
import { supabase } from '@/integrations/supabase/client';

interface IssueContextType {
  issues: Issue[];
  loading: boolean;
  addIssue: (issueData: Omit<Issue, 'id' | 'ticketNumber' | 'severity' | 'status' | 'submittedAt' | 'comments'>, userId?: string) => Promise<string>;
  updateIssue: (issueId: string, updates: Partial<Issue>) => Promise<void>;
  addComment: (issueId: string, commentData: Omit<Comment, 'id' | 'timestamp'>) => Promise<void>;
  getIssuesByCity: (city: string) => Promise<Issue[]>;
  getIssuesByAssignedResolver: (resolver: string) => Issue[];
  getIssuesByUser: (userId: string) => Promise<Issue[]>;
  getIssueByTicketNumber: (ticketNumber: string) => Promise<Issue | null>;
  assignResolver: (issueId: string, resolver: string) => Promise<void>;
  updateStatus: (issueId: string, status: Issue['status'], resolutionNotes?: string, userRole?: string) => Promise<void>;
  getIssuesForApproval: (city: string) => Issue[];
  refreshIssues: () => Promise<void>;
}

const IssueContext = createContext<IssueContextType | null>(null);

export const useIssues = () => {
  const context = useContext(IssueContext);
  if (!context) {
    throw new Error('useIssues must be used within IssueProvider');
  }
  return context;
};

export const IssueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  // Real-time subscription for ticket updates
  useEffect(() => {
    const channel = supabase
      .channel('tickets-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tickets' 
        }, 
        (payload) => {
          console.log('Real-time ticket update:', payload);
          // Refresh issues when changes occur
          refreshIssues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addIssue = async (issueData: Omit<Issue, 'id' | 'ticketNumber' | 'severity' | 'status' | 'submittedAt' | 'comments'>, userId?: string): Promise<string> => {
    setLoading(true);
    try {
      const ticketNumber = await TicketService.createTicket(issueData, userId);
      await refreshIssues();
      return ticketNumber;
    } finally {
      setLoading(false);
    }
  };

  const updateIssue = async (issueId: string, updates: Partial<Issue>): Promise<void> => {
    setLoading(true);
    try {
      // Convert Issue updates to database format
      // Convert Issue updates to database format
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.resolutionNotes) dbUpdates.resolution_notes = updates.resolutionNotes;
      
      // Keep legacy assignment fields in sync with ticket_assignees
      // Resolver assignment
      if (typeof updates.assignedResolver !== 'undefined') {
        // Remove existing resolver assignment in junction table
        await supabase
          .from('ticket_assignees')
          .delete()
          .eq('ticket_id', issueId)
          .eq('role', 'resolver');
        
        // Add new resolver assignment if provided
        if (updates.assignedResolver) {
          await supabase
            .from('ticket_assignees')
            .insert([{ 
              ticket_id: issueId, 
              user_id: updates.assignedResolver, 
              role: 'resolver' 
            }]);
          // Update legacy column for backward compatibility
          dbUpdates.assigned_resolver = updates.assignedResolver;
        } else {
          // Explicitly clear legacy column if unassigning
          dbUpdates.assigned_resolver = null;
        }
      }
      
      // Approver assignment
      if (typeof updates.assignedApprover !== 'undefined') {
        // Remove existing approver assignment in junction table
        await supabase
          .from('ticket_assignees')
          .delete()
          .eq('ticket_id', issueId)
          .eq('role', 'approver');
        
        // Add new approver assignment if provided
        if (updates.assignedApprover) {
          await supabase
            .from('ticket_assignees')
            .insert([{ 
              ticket_id: issueId, 
              user_id: updates.assignedApprover, 
              role: 'approver' 
            }]);
          // Update legacy column for backward compatibility
          dbUpdates.assigned_approver = updates.assignedApprover;
        } else {
          // Explicitly clear legacy column if unassigning
          dbUpdates.assigned_approver = null;
        }
      }
      
      const { error } = await supabase
        .from('tickets')
        .update(dbUpdates)
        .eq('id', issueId);


      if (error) throw error;
      await refreshIssues();
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (issueId: string, commentData: Omit<Comment, 'id' | 'timestamp'>): Promise<void> => {
    await TicketService.addComment(issueId, commentData as any);
    await refreshIssues();
  };

  const getIssuesByCity = async (city: string): Promise<Issue[]> => {
    return await TicketService.getTicketsByCity(city);
  };

  const getIssuesByAssignedResolver = (resolver: string): Issue[] => {
    return issues.filter(issue => issue.assignedResolver === resolver);
  };

  const getIssuesByUser = async (userId: string): Promise<Issue[]> => {
    return await TicketService.getTicketsByUser(userId);
  };

  const getIssueByTicketNumber = async (ticketNumber: string): Promise<Issue | null> => {
    return await TicketService.getTicketByNumber(ticketNumber);
  };

  const assignResolver = async (issueId: string, resolver: string): Promise<void> => {
    await updateIssue(issueId, { assignedResolver: resolver });
  };

  const updateStatus = async (issueId: string, status: Issue['status'], resolutionNotes?: string, userRole?: string): Promise<void> => {
    // Note: This method needs userId which we don't have in this context
    // For now, we'll use a placeholder. Components should use TicketService directly
    await TicketService.updateTicketStatus(issueId, status, 'system', resolutionNotes, userRole);
    await refreshIssues();
  };

  const getIssuesForApproval = (city: string): Issue[] => {
    return issues.filter(issue => issue.city === city && issue.status === 'resolved');
  };

  const refreshIssues = async (): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          comments (
            id,
            content,
            author,
            author_role,
            is_internal,
            created_at,
            comment_attachments (
              id,
              file_name,
              file_size,
              file_type,
              storage_path,
              uploaded_at
            )
          ),
          attachments (
            id,
            file_name,
            file_size,
            file_type,
            storage_path,
            uploaded_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch all assignees in one go
      const { data: assigneesData, error: assigneesError } = await supabase
        .from('ticket_assignees')
        .select('*');
      if (assigneesError) throw assigneesError;
      // Group assignees by ticket_id
      const assigneesByTicket: Record<string, any[]> = {};
      (assigneesData || []).forEach(a => {
        if (!assigneesByTicket[a.ticket_id]) assigneesByTicket[a.ticket_id] = [];
        assigneesByTicket[a.ticket_id].push(a);
      });

      const mappedIssues = data.map((ticket: any) => {
        // Get assignments for this ticket
        const ticketAssigns = assigneesByTicket[ticket.id] || [];
        const resolverAssignment = ticketAssigns.find((a: any) => a.role === 'resolver');
        const approverAssignment = ticketAssigns.find((a: any) => a.role === 'approver');

        // Map attachments with download URLs via Supabase helper
        const attachments = Array.isArray(ticket.attachments) ? ticket.attachments.map((att: any) => {
          const { data: pub } = supabase.storage.from('ticket-attachments').getPublicUrl(att.storage_path);
          return {
            id: att.id,
            fileName: att.file_name,
            fileSize: att.file_size,
            fileType: att.file_type,
            uploadedAt: att.uploaded_at ? new Date(att.uploaded_at) : undefined,
            downloadUrl: pub.publicUrl,
          };
        }) : [];

        return {
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          centreCode: ticket.centre_code,
          city: ticket.city,
          resourceId: ticket.resource_id,
          awignAppTicketId: ticket.awign_app_ticket_id,
          issueCategory: ticket.issue_category,
          issueDescription: ticket.issue_description,
          issueDate: ticket.issue_date,
          severity: ticket.severity,
          status: ticket.status,
          isAnonymous: ticket.is_anonymous,
          submittedBy: ticket.submitted_by,
          submittedByUserId: ticket.submitted_by_user_id,
          submittedAt: new Date(ticket.submitted_at),
          // Use new assignment data if available, fallback to legacy fields
          assignedResolver: resolverAssignment?.user_id || ticket.assigned_resolver,
          assignedApprover: approverAssignment?.user_id || ticket.assigned_approver,
          resolutionNotes: ticket.resolution_notes,
          resolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : undefined,
          comments: ticket.comments?.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            author: comment.author,
            authorRole: comment.author_role,
            timestamp: new Date(comment.created_at),
            isInternal: comment.is_internal,
            attachments: comment.comment_attachments?.map((att: any) => {
              const { data: pub } = supabase.storage.from('comment-attachments').getPublicUrl(att.storage_path);
              return {
                id: att.id,
                fileName: att.file_name,
                fileSize: att.file_size,
                fileType: att.file_type,
                downloadUrl: pub.publicUrl,
                uploadedAt: att.uploaded_at ? new Date(att.uploaded_at) : undefined,
              };
            }) || [],
          })) || [],
          attachments,
          issueEvidence: [],
          assignees: assigneesByTicket[ticket.id] || [],
        };
      });

      setIssues(mappedIssues);
    } catch (error) {
      console.error('Error refreshing issues:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    refreshIssues();
  }, []);

  return (
    <IssueContext.Provider value={{ 
      issues, 
      loading,
      addIssue, 
      updateIssue, 
      addComment, 
      getIssuesByCity, 
      getIssuesByAssignedResolver,
      getIssuesByUser,
      getIssueByTicketNumber,
      assignResolver,
      updateStatus,
      getIssuesForApproval,
      refreshIssues
    }}>
      {children}
    </IssueContext.Provider>
  );
};
