import React, { createContext, useContext, useState, useEffect } from 'react';
import { Issue, Comment } from '@/types/issue';
import { TicketService } from '@/services/ticketService';
import { supabase } from '@/integrations/supabase/client';
import { NotificationService } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();

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

    // Subscribe to ticket_assignees changes for real-time assignment updates
    const assignmentsChannel = supabase
      .channel('ticket-assignees-changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_assignees'
        },
        (payload) => {
          console.log('Real-time assignment update:', payload);
          refreshIssues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(assignmentsChannel);
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
      const dbUpdates: any = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.resolutionNotes) dbUpdates.resolution_notes = updates.resolutionNotes;
      
      // Handle assignment updates using the new ticket_assignees table
      if (updates.assignedResolver) {
        // Remove existing resolver assignment
        await supabase
          .from('ticket_assignees')
          .delete()
          .eq('ticket_id', issueId)
          .eq('role', 'resolver');
        
        // Add new resolver assignment
        if (updates.assignedResolver) {
          await supabase
            .from('ticket_assignees')
            .insert([{
              ticket_id: issueId,
              user_id: updates.assignedResolver,
              role: 'resolver'
            }]);
        }
      }
      
      if (updates.assignedApprover) {
        // Remove existing approver assignment
        await supabase
          .from('ticket_assignees')
          .delete()
          .eq('ticket_id', issueId)
          .eq('role', 'approver');
        
        // Add new approver assignment
        if (updates.assignedApprover) {
          await supabase
            .from('ticket_assignees')
            .insert([{
              ticket_id: issueId,
              user_id: updates.assignedApprover,
              role: 'approver'
            }]);
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

  const addComment = async (issueId: string, commentData: Omit<Comment, 'id' | 'timestamp'> & { attachments?: File[] }): Promise<void> => {
    await TicketService.addComment(issueId, {...commentData, attachments: commentData.attachments || []});
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
      // First, get the total count of tickets
      const { count: totalCount, error: countError } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      console.log(`📊 [TICKET FETCH] Total tickets in database: ${totalCount}`);
      
      // Fetch all tickets in batches to avoid Supabase's default 1000 limit
      const batchSize = 1000;
      const totalBatches = Math.ceil((totalCount || 0) / batchSize);
      let allTickets: any[] = [];
      
      for (let batch = 0; batch < totalBatches; batch++) {
        const from = batch * batchSize;
        const to = Math.min(from + batchSize - 1, (totalCount || 0) - 1);
        
        console.log(`📊 [TICKET FETCH] Fetching batch ${batch + 1}/${totalBatches} (${from}-${to})`);
        
        const { data: batchData, error: batchError } = await supabase
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
          .order('created_at', { ascending: false })
          .range(from, to);
          
        if (batchError) throw batchError;
        
        allTickets = allTickets.concat(batchData || []);
      }
      
      console.log(`📊 [TICKET FETCH] Successfully fetched ${allTickets.length} tickets`);
      
      // Log sample of ticket assignments for debugging
      const sampleTickets = allTickets.slice(0, 5).map(t => ({
        ticketNumber: t.ticket_number,
        assignedResolver: t.assigned_resolver,
        assignedApprover: t.assigned_approver,
        created_at: t.created_at
      }));
      console.log(`📊 [TICKET FETCH] Sample tickets:`, sampleTickets);
      
      const data = allTickets;

      // Fetch all assignees in batches to avoid Supabase's default 1000 limit
      const { count: totalAssigneesCount, error: assigneesCountError } = await supabase
        .from('ticket_assignees')
        .select('id', { count: 'exact', head: true });
      
      if (assigneesCountError) throw assigneesCountError;
      
      console.log(`📊 [ASSIGNMENT FETCH] Total assignments in database: ${totalAssigneesCount}`);
      
      const assigneesBatchSize = 1000;
      const totalAssigneesBatches = Math.ceil((totalAssigneesCount || 0) / assigneesBatchSize);
      let allAssignees: any[] = [];
      
      for (let batch = 0; batch < totalAssigneesBatches; batch++) {
        const from = batch * assigneesBatchSize;
        const to = Math.min(from + assigneesBatchSize - 1, (totalAssigneesCount || 0) - 1);
        
        console.log(`📊 [ASSIGNMENT FETCH] Fetching batch ${batch + 1}/${totalAssigneesBatches} (${from}-${to})`);
        
        const { data: assigneesBatchData, error: assigneesBatchError } = await supabase
          .from('ticket_assignees')
          .select('*')
          .range(from, to);
          
        if (assigneesBatchError) throw assigneesBatchError;
        
        allAssignees = allAssignees.concat(assigneesBatchData || []);
      }
      
      console.log('📊 [ASSIGNMENT DEBUG] Fetched assignees:', allAssignees.length);
      console.log('📊 [ASSIGNMENT DEBUG] Sample assignees:', allAssignees.slice(0, 5));
      
      // Group assignees by ticket_id
      const assigneesByTicket: Record<string, any[]> = {};
      allAssignees.forEach(a => {
        if (!assigneesByTicket[a.ticket_id]) assigneesByTicket[a.ticket_id] = [];
        assigneesByTicket[a.ticket_id].push(a);
      });
      
      console.log('📊 [ASSIGNMENT DEBUG] Assignees grouped by ticket:', Object.keys(assigneesByTicket).length, 'tickets have assignments');

      const mappedIssues = data.map((ticket: any) => {
        // Get assignments for this ticket
        const ticketAssigns = assigneesByTicket[ticket.id] || [];
        const resolverAssignment = ticketAssigns.find((a: any) => a.role === 'resolver');
        const approverAssignment = ticketAssigns.find((a: any) => a.role === 'approver');
        const ticketAdminAssignment = ticketAssigns.find((a: any) => a.role === 'ticket_admin');
        const normalizedAssignees = {
          resolver: resolverAssignment ? { name: '', role: resolverAssignment.role, id: resolverAssignment.user_id } : undefined,
          approver: approverAssignment ? { name: '', role: approverAssignment.role, id: approverAssignment.user_id } : undefined,
          ticketAdmin: ticketAdminAssignment ? { name: '', role: ticketAdminAssignment.role, id: ticketAdminAssignment.user_id } : undefined,
        };

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

        // Sort comments by timestamp (newest first)
        const sortedComments = ticket.comments?.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          author: comment.author,
          authorRole: comment.author_role,
          timestamp: new Date(comment.created_at),
          isInternal: comment.is_internal,
          isFromInvigilator: comment.author === 'anonymous' || comment.author === 'Anonymous' || comment.author_role === 'invigilator',
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
        })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) || [];

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
          // Use new assignment system, keep compatibility single fields
          assignedResolver: resolverAssignment?.user_id || null,
          assignedApprover: approverAssignment?.user_id || null,
          resolutionNotes: ticket.resolution_notes,
          resolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : undefined,
          comments: sortedComments,
          attachments,
          issueEvidence: [],
          // Expose full list so multiple resolvers are visible to dashboards
          assignees: normalizedAssignees,
        };
      });

      // Sort tickets by last comment timestamp (newest first)
      const sortedIssues = mappedIssues.sort((a, b) => {
        const aLastComment = a.comments && a.comments.length > 0 ? a.comments[0].timestamp : a.submittedAt;
        const bLastComment = b.comments && b.comments.length > 0 ? b.comments[0].timestamp : b.submittedAt;
        return bLastComment.getTime() - aLastComment.getTime();
      });

      setIssues(sortedIssues);
      
      // Process notifications for new invigilator comments (only for assigned tickets)
      NotificationService.processNewComments(sortedIssues, user?.id);
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
