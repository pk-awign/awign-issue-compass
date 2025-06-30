import { supabase } from '../integrations/supabase/client';
import { Issue, Comment, Attachment, TimelineEvent, StatusTransition, TicketDetails } from '../types/issue';
import { toast } from 'sonner';
import { EmailService } from './emailService';

export class TicketService {
  static async createTicket(issueData: Omit<Issue, 'id' | 'ticketNumber' | 'severity' | 'status' | 'submittedAt' | 'comments'> & { issueEvidence?: File[] }, userId?: string): Promise<string> {
    try {
      const ticketNumber = await this.generateTicketNumber();
      
      // Serialize issue_date for database storage
      const issueDate = {
        type: issueData.issueDate.type,
        dates:
          issueData.issueDate.type === 'multiple'
            ? issueData.issueDate.dates?.map((d: any) =>
                typeof d === 'object' && d.date
                  ? { date: d.date instanceof Date ? d.date.toISOString() : d.date, description: d.description || '' }
                  : { date: d instanceof Date ? d.toISOString() : d, description: '' }
              )
            : issueData.issueDate.dates?.map((date: any) => date instanceof Date ? date.toISOString() : date),
        startDate: issueData.issueDate.startDate?.toISOString(),
        endDate: issueData.issueDate.endDate?.toISOString()
      };

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          ticket_number: ticketNumber,
          centre_code: issueData.centreCode,
          city: issueData.city,
          resource_id: issueData.resourceId || 'NOT_SPECIFIED',
          awign_app_ticket_id: issueData.awignAppTicketId,
          issue_category: issueData.issueCategory,
          issue_description: issueData.issueDescription,
          issue_date: issueDate,
          severity: 'sev3', // Default severity
          status: 'open', // Default status
          is_anonymous: issueData.isAnonymous,
          submitted_by: issueData.submittedBy || 'Anonymous',
          submitted_by_user_id: userId,
          assigned_resolver: issueData.assignedResolver,
          assigned_approver: issueData.assignedApprover,
        })
        .select('id')
        .single();

      if (error) throw error;

      const ticketId = data.id;

      // Upload attachments if any
      let uploadedAttachments: Array<{ fileName: string; fileSize: number; fileType: string }> = [];
      if (issueData.issueEvidence && issueData.issueEvidence.length > 0) {
        await this.uploadAttachments(ticketId, issueData.issueEvidence);
        uploadedAttachments = issueData.issueEvidence.map(file => ({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        }));
      }

      // Log to ticket_history
      await this.addTicketHistoryEvent({
        ticketId,
        actionType: 'created',
        oldValue: null,
        newValue: 'open',
        performedBy: issueData.submittedBy || 'Anonymous',
        performedByRole: null,
        details: { ticket_number: ticketNumber, severity: 'sev3' },
      });

      // Send email notification
      try {
        await EmailService.sendTicketCreatedNotification({
          ticketNumber,
          centreCode: issueData.centreCode,
          city: issueData.city,
          resourceId: issueData.resourceId,
          issueCategory: issueData.issueCategory,
          issueDescription: issueData.issueDescription,
          submittedBy: issueData.submittedBy || 'Anonymous',
          submittedAt: new Date(),
          severity: 'sev3',
          attachments: uploadedAttachments
        });
        console.log('📧 Email notification sent successfully for ticket:', ticketNumber);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the ticket creation if email fails
      }

      toast.success(`Ticket ${ticketNumber} created successfully`);
      return ticketNumber;
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
      throw error;
    }
  }

  static async getTicketByNumber(ticketNumber: string): Promise<Issue | null> {
    try {
      console.log('DEBUG: Raw ticket data from Supabase:', { ticketNumber });
      
      // First get the ticket details
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_number', ticketNumber)
        .single();

      if (ticketError) {
        if (ticketError.code === 'PGRST116') {
          return null; // No ticket found
        }
        throw ticketError;
      }

      // Get user details for assigned users (handle missing fields gracefully)
      const [resolverDetails, approverDetails, submittedByDetails] = await Promise.all([
        ticketData.assigned_resolver ? this.getUserDetails(ticketData.assigned_resolver) : null,
        ticketData.assigned_approver ? this.getUserDetails(ticketData.assigned_approver) : null,
        ticketData.submitted_by_user_id ? this.getUserDetails(ticketData.submitted_by_user_id) : null,
      ]);

      // Get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('ticket_id', ticketData.id)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Get attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('attachments')
        .select('*')
        .eq('ticket_id', ticketData.id)
        .order('uploaded_at', { ascending: true });

      if (attachmentsError) throw attachmentsError;

      console.log('DEBUG: Raw ticket data from Supabase:', ticketData);
      
      return this.mapDatabaseToIssue({
        ...ticketData,
        comments: commentsData || [],
        attachments: attachmentsData || [],
        assigned_resolver_name: resolverDetails?.name,
        assigned_resolver_role: resolverDetails?.role,
        assigned_approver_name: approverDetails?.name,
        assigned_approver_role: approverDetails?.role,
        submitted_by_name: submittedByDetails?.name,
        submitted_by_role: submittedByDetails?.role,
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      return null;
    }
  }

  private static async getUserDetails(userId: string): Promise<{ name: string; role: string } | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', userId)
        .single();

      if (error || !data) return null;
      return { name: data.name, role: data.role };
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  }

  static async getTicketTimeline(ticketId: string): Promise<TimelineEvent[]> {
    try {
      const { data, error } = await supabase
        .from('ticket_timeline')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((event: any) => ({
        id: event.id,
        eventType: event.event_type,
        oldValue: event.old_value,
        newValue: event.new_value,
        performedBy: event.performed_by,
        performedByName: event.performed_by_name,
        performedByRole: event.performed_by_role,
        details: event.details,
        createdAt: new Date(event.created_at),
      }));
    } catch (error) {
      console.error('Error fetching ticket timeline:', error);
      return [];
    }
  }

  static getAllowedStatusTransitions(role: string, currentStatus: Issue['status']): Issue['status'][] {
    // Corrected status flow
    const empty: Issue['status'][] = [];
    // Resolver: OPEN → IN PROGRESS, IN PROGRESS → SEND FOR APPROVAL
    const RESOLVER_TRANSITIONS: Record<Issue['status'], Issue['status'][]> = {
      open: ['in_progress'],
      in_progress: ['send_for_approval'],
      send_for_approval: [],
      approved: [],
      resolved: [],
    };
    // Approver: SEND FOR APPROVAL → APPROVED, APPROVED → RESOLVED
    const APPROVER_TRANSITIONS: Record<Issue['status'], Issue['status'][]> = {
      open: [],
      in_progress: [],
      send_for_approval: ['approved'],
      approved: ['resolved'],
      resolved: [],
    };
    // Super Admin: can move forward through any step
    const SUPER_ADMIN_TRANSITIONS: Record<Issue['status'], Issue['status'][]> = {
      open: ['in_progress'],
      in_progress: ['send_for_approval'],
      send_for_approval: ['approved'],
      approved: ['resolved'],
      resolved: [],
    };
    switch (role) {
      case 'approver':
        return APPROVER_TRANSITIONS[currentStatus] || empty;
      case 'resolver':
        return RESOLVER_TRANSITIONS[currentStatus] || empty;
      case 'super_admin':
        return SUPER_ADMIN_TRANSITIONS[currentStatus] || empty;
      default:
        return empty;
    }
  }

  static async getStatusTransitions(role: string, currentStatus: Issue['status']): Promise<Issue['status'][]> {
    return this.getAllowedStatusTransitions(role, currentStatus);
  }

  /**
   * Add a ticket history event
   */
  static async addTicketHistoryEvent({
    ticketId,
    actionType,
    oldValue = null,
    newValue = null,
    performedBy = null,
    performedByRole = null,
    details = null,
    performedAt = null,
  }: {
    ticketId: string;
    actionType: string;
    oldValue?: string | null;
    newValue?: string | null;
    performedBy?: string | null;
    performedByRole?: string | null;
    details?: any;
    performedAt?: string | null;
  }) {
    return supabase.from('ticket_history').insert([
      {
        ticket_id: ticketId,
        action_type: actionType,
        old_value: oldValue,
        new_value: newValue,
        performed_by: performedBy,
        performed_by_role: performedByRole,
        performed_at: performedAt || new Date().toISOString(),
        details,
      },
    ]);
  }

  // --- Log status change ---
  static async updateTicketStatus(
    ticketId: string,
    newStatus: Issue['status'],
    userId: string,
    resolutionNotes?: string,
    userRole?: string,
    currentStatus?: Issue['status']
  ): Promise<boolean> {
    try {
      // Fetch old status for logging
      const { data: oldTicket } = await supabase.from('tickets').select('status').eq('id', ticketId).single();
      const oldStatus = oldTicket?.status as Issue['status'];
      // Enforce allowed transitions
      const role = userRole || 'resolver';
      const allowed = this.getAllowedStatusTransitions(role, oldStatus);
      // DEBUG LOG
      console.log('[DEBUG] updateTicketStatus:', {
        ticketId,
        oldStatus,
        newStatus,
        userRole: role,
        allowedTransitions: allowed
      });
      if (role !== 'super_admin' && !allowed.includes(newStatus)) {
        toast.error('Status transition not allowed.');
        return false;
      }
      // Super admin can move tickets in any direction for management purposes
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (resolutionNotes) {
        updates.resolution_notes = resolutionNotes;
      }
      if (newStatus === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId);
      if (error) throw error;
      // Log to ticket_history
      await this.addTicketHistoryEvent({
        ticketId,
        actionType: 'status_change',
        oldValue: oldStatus,
        newValue: newStatus,
        performedBy: userId,
        performedByRole: userRole,
        details: resolutionNotes ? { resolution_notes: resolutionNotes } : null,
      });

      // Send email notification for status change
      try {
        // Get ticket number for email
        const { data: ticketData } = await supabase
          .from('tickets')
          .select('ticket_number')
          .eq('id', ticketId)
          .single();
        
        if (ticketData) {
          // Get user details for the email
          const userDetails = await this.getUserDetails(userId);
          const changedBy = userDetails?.name || userId;
          
          await EmailService.sendStatusChangeNotification(
            ticketData.ticket_number,
            oldStatus,
            newStatus,
            changedBy,
            resolutionNotes
          );
          console.log('📧 Status change email notification sent for ticket:', ticketData.ticket_number);
        }
      } catch (emailError) {
        console.error('Failed to send status change email notification:', emailError);
        // Don't fail the status update if email fails
      }

      toast.success(`Ticket status updated to ${newStatus}`);
      return true;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status');
      return false;
    }
  }

  // --- Log severity change ---
  static async updateTicketSeverity(ticketId: string, newSeverity: Issue['severity'], userId: string): Promise<boolean> {
    try {
      // Fetch old severity for logging
      const { data: oldTicket } = await supabase.from('tickets').select('severity').eq('id', ticketId).single();
      const oldSeverity = oldTicket?.severity;
      const { error } = await supabase
        .from('tickets')
        .update({ 
          severity: newSeverity,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);
      if (error) throw error;
      // Log to ticket_history
      await this.addTicketHistoryEvent({
        ticketId,
        actionType: 'severity_change',
        oldValue: oldSeverity,
        newValue: newSeverity,
        performedBy: userId,
      });
      toast.success(`Ticket severity updated to ${newSeverity}`);
      return true;
    } catch (error) {
      console.error('Error updating ticket severity:', error);
      toast.error('Failed to update ticket severity');
      return false;
    }
  }

  static async getTicketsByUser(userId: string): Promise<Issue[]> {
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
            created_at
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
        .eq('submitted_by_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapDatabaseToIssue);
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      return [];
    }
  }

  static async getTicketsByCity(city: string): Promise<Issue[]> {
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
            created_at
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
        .eq('city', city)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(this.mapDatabaseToIssue);
    } catch (error) {
      console.error('Error fetching city tickets:', error);
      return [];
    }
  }

  // --- Log assignment add ---
  static async addAssignee(ticketId: string, userId: string, role: string, performedBy: string, performedByName: string, performedByRole: string) {
    // Role validation: Only super_admin can assign resolvers
    if (role === 'resolver' && performedByRole !== 'super_admin') {
      throw new Error('Only super admins can assign resolvers');
    }
    
    // Role validation: Only super_admin can assign approvers
    if (role === 'approver' && performedByRole !== 'super_admin') {
      throw new Error('Only super admins can assign approvers');
    }

    const { error } = await supabase.from('ticket_assignees').insert([{
      ticket_id: ticketId,
      user_id: userId,
      role,
      assigned_at: new Date().toISOString()
    }]);
    if (!error) {
      await this.addTimelineEvent({
        ticketId,
        eventType: 'assigned',
        performedBy,
        performedByName,
        performedByRole,
        details: { action: 'added', user_id: userId, role },
      });
      // Log to ticket_history
      await this.addTicketHistoryEvent({
        ticketId,
        actionType: 'assignment',
        oldValue: null,
        newValue: userId,
        performedBy,
        performedByRole: performedByRole,
        details: { action: 'added', user_id: userId, role },
      });
    }
    return { error };
  }

  // --- Log assignment remove ---
  static async removeAssignee(ticketId: string, userId: string, role: string, performedBy: string, performedByName: string, performedByRole: string) {
    // Role validation: Only super_admin can remove resolver assignments
    if (role === 'resolver' && performedByRole !== 'super_admin') {
      throw new Error('Only super admins can remove resolver assignments');
    }
    
    // Role validation: Only super_admin can remove approver assignments
    if (role === 'approver' && performedByRole !== 'super_admin') {
      throw new Error('Only super admins can remove approver assignments');
    }

    const { error } = await supabase.from('ticket_assignees').delete().match({ ticket_id: ticketId, user_id: userId, role });
    if (!error) {
      await this.addTimelineEvent({
        ticketId,
        eventType: 'assigned',
        performedBy,
        performedByName,
        performedByRole,
        details: { action: 'removed', user_id: userId, role },
      });
      // Log to ticket_history
      await this.addTicketHistoryEvent({
        ticketId,
        actionType: 'assignment',
        oldValue: userId,
        newValue: null,
        performedBy,
        performedByRole: performedByRole,
        details: { action: 'removed', user_id: userId, role },
      });
    }
    return { error };
  }

  /**
   * Add a timeline event for a ticket
   */
  static async addTimelineEvent({
    ticketId,
    eventType,
    oldValue = null,
    newValue = null,
    performedBy = null,
    performedByName = null,
    performedByRole = null,
    details = null,
  }: {
    ticketId: string;
    eventType: string;
    oldValue?: string | null;
    newValue?: string | null;
    performedBy?: string | null;
    performedByName?: string | null;
    performedByRole?: string | null;
    details?: any;
  }) {
    return supabase.from('ticket_timeline').insert([
      {
        ticket_id: ticketId,
        event_type: eventType,
        old_value: oldValue,
        new_value: newValue,
        performed_by: performedBy,
        performed_by_name: performedByName,
        performed_by_role: performedByRole,
        details,
      },
    ]);
  }

  /**
   * Add a comment as a timeline event
   */
  static async addComment(ticketId: string, commentData: Omit<Comment, 'id' | 'timestamp'>): Promise<void> {
    try {
      console.log('Adding comment with data:', {
        ticketId,
        content: commentData.content,
        author: commentData.author,
        authorRole: commentData.authorRole,
        isInternal: commentData.isInternal
      });

      const { data, error } = await supabase
        .from('comments')
        .insert({
          ticket_id: ticketId,
          content: commentData.content,
          author: commentData.author,
          author_role: commentData.authorRole,
          is_internal: commentData.isInternal,
        })
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Comment added successfully:', data);
      toast.success('Comment added successfully');
      
      // Log to ticket_history
      await this.addTicketHistoryEvent({
        ticketId,
        actionType: 'comment_added',
        oldValue: null,
        newValue: commentData.content,
        performedBy: commentData.author,
        performedByRole: commentData.authorRole,
        details: { is_internal: commentData.isInternal },
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error('Failed to add comment');
      throw error;
    }
  }

  private static async generateTicketNumber(): Promise<string> {
    // Generate a dynamic alphanumeric ticket number: AWG-YYYY-XXXXXX (X = alphanumeric)
    const currentYear = new Date().getFullYear();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomStr = '';
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `AWG-${currentYear}-${randomStr}`;
  }

  private static async uploadAttachments(ticketId: string, files: File[]): Promise<void> {
    for (const file of files) {
      try {
        const fileName = `${ticketId}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('attachments')
          .insert({
            ticket_id: ticketId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: fileName,
          });

        if (dbError) throw dbError;
      } catch (error) {
        console.error('Error uploading attachment:', error);
        // Continue with other files even if one fails
      }
    }
  }

  private static mapDatabaseToIssue(data: any): Issue {
    // Deserialize issue_date from database
    const issueDate = {
      type: data.issue_date.type,
      dates:
        data.issue_date.type === 'multiple'
          ? data.issue_date.dates?.map((d: any) =>
              typeof d === 'object' && d.date
                ? { date: new Date(d.date), description: d.description || '' }
                : { date: new Date(d), description: '' }
            ) || []
          : data.issue_date.dates?.map((dateStr: string) => new Date(dateStr)) || [],
      startDate: data.issue_date.startDate ? new Date(data.issue_date.startDate) : undefined,
      endDate: data.issue_date.endDate ? new Date(data.issue_date.endDate) : undefined
    };

    // Map attachments with safe fallback
    const attachments = Array.isArray(data.attachments) ? data.attachments.map((att: any) => ({
      id: att.id,
      fileName: att.file_name,
      fileSize: att.file_size,
      fileType: att.file_type,
      uploadedAt: att.uploaded_at ? new Date(att.uploaded_at) : undefined,
      downloadUrl: `${import.meta.env.VITE_SUPABASE_URL || 'https://mvwxlfvvxwhzobyjpxsg.supabase.co'}/storage/v1/object/public/ticket-attachments/${att.storage_path}`
    })) : [];

    return {
      id: data.id,
      ticketNumber: data.ticket_number,
      centreCode: data.centre_code,
      city: data.city,
      resourceId: data.resource_id,
      awignAppTicketId: data.awign_app_ticket_id,
      issueCategory: data.issue_category,
      issueDescription: data.issue_description,
      issueDate: issueDate,
      severity: data.severity,
      status: data.status,
      isAnonymous: data.is_anonymous,
      submittedBy: data.submitted_by,
      submittedByUserId: data.submitted_by_user_id,
      submittedAt: new Date(data.submitted_at),
      assignedResolver: data.assigned_resolver,
      assignedApprover: data.assigned_approver,
      assignedResolverDetails: data.assigned_resolver_name ? {
        name: data.assigned_resolver_name,
        role: data.assigned_resolver_role || 'resolver'
      } : undefined,
      assignedApproverDetails: data.assigned_approver_name ? {
        name: data.assigned_approver_name,
        role: data.assigned_approver_role || 'approver'
      } : undefined,
      resolutionNotes: data.resolution_notes,
      resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
      comments: data.comments?.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        author: comment.author,
        authorRole: comment.author_role,
        timestamp: new Date(comment.created_at),
        isInternal: comment.is_internal,
      })) || [],
      attachments,
      issueEvidence: [], // Will be populated separately if needed
      
      // New fields for enhanced ticket management (with safe fallbacks)
      reopenCount: data.reopen_count || 0,
      lastReopenedAt: data.last_reopened_at ? new Date(data.last_reopened_at) : undefined,
      reopenedBy: data.reopened_by,
      reopenedByDetails: data.reopened_by_name ? {
        name: data.reopened_by_name,
        role: data.reopened_by_role || 'super_admin'
      } : undefined,
      statusChangedAt: data.status_changed_at ? new Date(data.status_changed_at) : undefined,
      statusChangedBy: data.status_changed_by,
      statusChangedByDetails: data.status_changed_by_name ? {
        name: data.status_changed_by_name,
        role: data.status_changed_by_role || 'system'
      } : undefined,
    };
  }

  static async getTicketHistory(ticketId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ticket_history')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('performed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching ticket history:', error);
      return [];
    }
  }

  static async getAssignees(ticketId: string) {
    const { data, error } = await supabase
      .from('ticket_assignees')
      .select('*')
      .eq('ticket_id', ticketId);
    return { data, error };
  }

  static async getLastTicket(): Promise<Issue | null> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) return null;
      return this.mapDatabaseToIssue(data[0]);
    } catch (error) {
      console.error('Error fetching last ticket:', error);
      return null;
    }
  }
}
