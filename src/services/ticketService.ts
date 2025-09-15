import { supabase } from '../integrations/supabase/client';
import { Issue, Comment, Attachment, TimelineEvent, StatusTransition, TicketDetails } from '../types/issue';
import { toast } from 'sonner';
import { EmailService } from './emailService';
import { WhatsAppService } from './whatsappService';
import { SMSService } from './smsService';
import { SharedContactService } from './sharedContactService';

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

      // Skip logging to ticket_history to avoid function errors
      console.log('Ticket created successfully:', ticketNumber);

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
          attachments: uploadedAttachments,
          ticketLink: `https://awign-invigilation-escalation.netlify.app/track?id=${ticketNumber}`
        });
        console.log('📧 Email notification sent successfully for ticket:', ticketNumber);
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the ticket creation if email fails
      }

      // Send WhatsApp notification to city-specific contacts
      try {
        const ticketData = {
          ticketNumber,
          centreCode: issueData.centreCode,
          city: issueData.city,
          resourceId: issueData.resourceId || 'NOT_SPECIFIED',
          issueCategory: issueData.issueCategory,
          issueDescription: issueData.issueDescription,
          submittedBy: issueData.submittedBy || 'Anonymous',
          submittedAt: new Date(),
          severity: 'sev3',
          ticketLink: `https://awign-invigilation-escalation.netlify.app/track?id=${ticketNumber}`
        };

        const result = await WhatsAppService.sendCitySpecificNotifications(issueData.city, ticketData);
        console.log('📱 WhatsApp notifications sent for ticket:', ticketNumber, result);
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp notification:', whatsappError);
        // Don't fail the ticket creation if WhatsApp fails
      }

      // Send WhatsApp notification to ticket raiser by Resource ID (like SMS)
      try {
        console.log('🔍 [WHATSAPP DEBUG] Starting WhatsApp notification process by Resource ID...');
        console.log('🔍 [WHATSAPP DEBUG] Resource ID for WhatsApp lookup:', issueData.resourceId);

        const ticketData = {
          ticketNumber,
          centreCode: issueData.centreCode,
          city: issueData.city,
          resourceId: issueData.resourceId || 'NOT_SPECIFIED',
          issueCategory: issueData.issueCategory,
          issueDescription: issueData.issueDescription,
          submittedBy: issueData.submittedBy || 'Anonymous',
          submittedAt: new Date(),
          severity: 'sev3',
          ticketLink: `https://awign-invigilation-escalation.netlify.app/track?id=${ticketNumber}`
        };

        console.log('📱 [WHATSAPP DEBUG] Preparing to send WhatsApp notification with data:', ticketData);
        
        // Let WhatsApp service do the Resource ID lookup (don't pass phone number)
        const result = await WhatsAppService.sendTicketCreationNotification(ticketData);
        console.log('📱 [WHATSAPP DEBUG] Ticket creation notification result:', result);
        console.log('✅ [WHATSAPP DEBUG] WhatsApp notification process completed successfully');
      } catch (whatsappError) {
        console.error('❌ [WHATSAPP DEBUG] Failed to send ticket creation notification:', whatsappError);
        console.error('❌ [WHATSAPP DEBUG] WhatsApp error details:', {
          message: whatsappError.message,
          stack: whatsappError.stack,
          name: whatsappError.name
        });
        // Don't fail the ticket creation if WhatsApp fails
      }

      // Send SMS notification to ticket raiser by Resource ID (like WhatsApp)
      try {
        console.log('📱 [SMS DEBUG] Starting SMS notification process by Resource ID...');
        
        if (issueData.resourceId && issueData.resourceId !== 'NOT_SPECIFIED') {
          const smsResult = await SMSService.sendTicketCreationNotificationByResourceId(
            issueData.resourceId,
            {
              ticketNumber: ticketNumber,
              submittedBy: issueData.submittedBy || 'Anonymous',
              ticketLink: `https://awign-invigilation-escalation.netlify.app/track?id=${ticketNumber}`
            }
          );
          console.log('📱 [SMS DEBUG] SMS notification result:', smsResult);
        } else {
          console.log('📱 [SMS DEBUG] No Resource ID provided, skipping SMS notification');
        }
      } catch (smsError) {
        console.error('❌ [SMS DEBUG] Failed to send SMS notification:', smsError);
        // Don't fail the ticket creation if SMS fails
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
        (ticketData as any).assigned_resolver ? this.getUserDetails((ticketData as any).assigned_resolver) : null,
        (ticketData as any).assigned_approver ? this.getUserDetails((ticketData as any).assigned_approver) : null,
        ticketData.submitted_by_user_id ? this.getUserDetails(ticketData.submitted_by_user_id) : null,
      ]);

      // Get comments with their attachments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          comment_attachments (
            id,
            file_name,
            file_size,
            file_type,
            storage_path,
            uploaded_at
          )
        `)
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
    // Resolver: All movements require comments
    const RESOLVER_TRANSITIONS: Record<Issue['status'], Issue['status'][]> = {
      open: ['in_progress'],
      in_progress: ['send_for_approval', 'user_dependency', 'ops_input_required', 'ops_user_dependency'],
      ops_input_required: ['in_progress'],
      user_dependency: ['in_progress', 'ops_input_required', 'ops_user_dependency', 'send_for_approval'],
      ops_user_dependency: ['in_progress'],
      send_for_approval: [],
      approved: ['resolved'],
      resolved: [],
    };
    // Approver: SEND FOR APPROVAL → APPROVED/IN PROGRESS, APPROVED → RESOLVED
    const APPROVER_TRANSITIONS: Record<Issue['status'], Issue['status'][]> = {
      open: [],
      in_progress: [],
      ops_input_required: [],
      user_dependency: [],
      ops_user_dependency: [],
      send_for_approval: ['approved', 'in_progress'],
      approved: [],
      resolved: [],
    };
    // Super Admin: can move to any status (including backward for management)
    const SUPER_ADMIN_TRANSITIONS: Record<Issue['status'], Issue['status'][]> = {
      open: ['in_progress', 'ops_input_required', 'user_dependency', 'ops_user_dependency', 'send_for_approval', 'approved', 'resolved'],
      in_progress: ['open', 'ops_input_required', 'user_dependency', 'ops_user_dependency', 'send_for_approval', 'approved', 'resolved'],
      ops_input_required: ['open', 'in_progress', 'user_dependency', 'ops_user_dependency', 'send_for_approval', 'approved', 'resolved'],
      user_dependency: ['open', 'in_progress', 'ops_input_required', 'ops_user_dependency', 'send_for_approval', 'approved', 'resolved'],
      ops_user_dependency: ['open', 'in_progress', 'ops_input_required', 'user_dependency', 'send_for_approval', 'approved', 'resolved'],
      send_for_approval: ['open', 'in_progress', 'ops_input_required', 'user_dependency', 'ops_user_dependency', 'approved', 'resolved'],
      approved: ['open', 'in_progress', 'ops_input_required', 'user_dependency', 'ops_user_dependency', 'send_for_approval', 'resolved'],
      resolved: ['open', 'in_progress', 'ops_input_required', 'user_dependency', 'ops_user_dependency', 'send_for_approval', 'approved'],
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
      
      // Super admin bypass - they can move to any status
      if (role === 'super_admin') {
        console.log('[DEBUG] Super admin bypass - allowing transition');
      } else if (!allowed.includes(newStatus)) {
        console.log('[DEBUG] Transition not allowed for role:', role, 'from', oldStatus, 'to', newStatus);
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
      // Skip logging to avoid function signature issues
      console.log('Status updated from', oldStatus, 'to', newStatus);

      // Automatically assign SUMANT OPS when ticket moves to Ops Dependency or Ops + User Dependency
      if (newStatus === 'ops_input_required' || newStatus === 'ops_user_dependency') {
        try {
          const SUMANT_OPS_ID = '297af7f9-4532-4cd5-b2c4-418e3015dc6e';
          
          // Check if SUMANT OPS is already assigned
          const { data: existingAssignments } = await supabase
            .from('ticket_assignees')
            .select('*')
            .eq('ticket_id', ticketId)
            .eq('user_id', SUMANT_OPS_ID)
            .eq('role', 'ops');
          
          if (!existingAssignments || existingAssignments.length === 0) {
            // Assign SUMANT OPS
            const { error: assignError } = await supabase
              .from('ticket_assignees')
              .insert({
                ticket_id: ticketId,
                user_id: SUMANT_OPS_ID,
                role: 'ops',
                assigned_at: new Date().toISOString(),
                assigned_by: userId
              });
            
            if (assignError) {
              console.error('Failed to assign SUMANT OPS:', assignError);
            } else {
              console.log('✅ SUMANT OPS automatically assigned to ticket:', ticketId);
            }
          } else {
            console.log('ℹ️ SUMANT OPS already assigned to ticket:', ticketId);
          }
        } catch (assignError) {
          console.error('Error in automatic SUMANT OPS assignment:', assignError);
          // Don't fail the status update if assignment fails
        }
      }

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

      // Send SMS and WhatsApp notifications ONLY when status is changed to "RESOLVED"
      if (newStatus === 'resolved') {
        try {
          // Get ticket details for notifications
          const { data: ticketData, error: ticketError } = await supabase
            .from('tickets')
            .select('ticket_number, resource_id, submitted_by')
            .eq('id', ticketId)
            .single();

          if (!ticketError && ticketData) {
            console.log('🎉 [RESOLUTION NOTIFICATION] Ticket resolved, sending notifications to ticket raiser');

            // Send WhatsApp notification for resolution
            try {
              const resolutionNotificationData = {
                ticketNumber: ticketData.ticket_number,
                resourceId: ticketData.resource_id || 'NOT_SPECIFIED',
                submittedBy: ticketData.submitted_by || 'Anonymous',
                ticketLink: `https://awign-invigilation-escalation.netlify.app/track?id=${ticketData.ticket_number}`
              };

              console.log('📱 [RESOLUTION WHATSAPP] Sending resolution notification with data:', resolutionNotificationData);
              const whatsappResult = await WhatsAppService.sendCommentNotification(resolutionNotificationData);
              console.log('📱 [RESOLUTION WHATSAPP] Resolution notification result:', whatsappResult);
            } catch (whatsappError) {
              console.error('❌ [RESOLUTION WHATSAPP] Failed to send resolution notification:', whatsappError);
            }

            // Send SMS notification for resolution
            try {
              if (ticketData.resource_id && ticketData.resource_id !== 'NOT_SPECIFIED') {
                // Use shared contact service to find contact
                const contact = await SharedContactService.findContactByResourceId(ticketData.resource_id);

                if (contact) {
                  const formattedPhone = SharedContactService.formatPhoneNumberForSMS(contact.contactNumber);
                  if (formattedPhone) {
                    const smsData = {
                      mobileNumber: formattedPhone,
                      name: contact.name,
                      ticketNumber: ticketData.ticket_number,
                      ticketLink: `https://awign-invigilation-escalation.netlify.app/track?id=${ticketData.ticket_number}`
                    };

                    console.log('📱 [RESOLUTION SMS] Sending resolution SMS notification with data:', smsData);
                    const smsResult = await SMSService.sendTicketUpdateNotification(smsData);
                    console.log('📱 [RESOLUTION SMS] Resolution SMS notification result:', smsResult);
                  } else {
                    console.log('📱 [RESOLUTION SMS] Invalid phone number for contact:', contact.contactNumber);
                  }
                } else {
                  console.log('📱 [RESOLUTION SMS] No contact found with Resource ID:', ticketData.resource_id);
                }
              } else {
                console.log('📱 [RESOLUTION SMS] No Resource ID provided, skipping resolution SMS notification');
              }
            } catch (smsError) {
              console.error('❌ [RESOLUTION SMS] Failed to send resolution SMS notification:', smsError);
            }
          }
        } catch (resolutionNotificationError) {
          console.error('❌ [RESOLUTION NOTIFICATION] Failed to send resolution notifications:', resolutionNotificationError);
          // Don't fail the status update if notifications fail
        }
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
        .eq('submitted_by_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((ticket: any) => ({
        ...ticket,
        comments: (ticket.comments || []).map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          author: comment.author,
          authorRole: comment.author_role,
          timestamp: comment.created_at ? new Date(comment.created_at) : null,
          isInternal: comment.is_internal,
          attachments: (comment.comment_attachments || []).map((att: any) => {
            const { data: pub } = supabase.storage.from('comment-attachments').getPublicUrl(att.storage_path);
            return {
              id: att.id,
              fileName: att.file_name,
              fileSize: att.file_size,
              fileType: att.file_type,
              uploadedAt: att.uploaded_at ? new Date(att.uploaded_at) : undefined,
              downloadUrl: pub.publicUrl,
            };
          })
        })),
        attachments: (ticket.attachments || []).map((att: any) => {
          const { data: pub } = supabase.storage.from('ticket-attachments').getPublicUrl(att.storage_path);
          return {
            id: att.id,
            fileName: att.file_name,
            fileSize: att.file_size,
            fileType: att.file_type,
            uploadedAt: att.uploaded_at ? new Date(att.uploaded_at) : undefined,
            downloadUrl: pub.publicUrl,
          };
        })
      }));
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
        .eq('city', city)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((ticket: any) => ({
        ...ticket,
        comments: (ticket.comments || []).map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          author: comment.author,
          authorRole: comment.author_role,
          timestamp: comment.created_at ? new Date(comment.created_at) : null,
          isInternal: comment.is_internal,
          attachments: (comment.comment_attachments || []).map((att: any) => {
            const { data: pub } = supabase.storage.from('comment-attachments').getPublicUrl(att.storage_path);
            return {
              id: att.id,
              fileName: att.file_name,
              fileSize: att.file_size,
              fileType: att.file_type,
              uploadedAt: att.uploaded_at ? new Date(att.uploaded_at) : undefined,
              downloadUrl: pub.publicUrl,
            };
          })
        })),
        attachments: (ticket.attachments || []).map((att: any) => {
          const { data: pub } = supabase.storage.from('ticket-attachments').getPublicUrl(att.storage_path);
          return {
            id: att.id,
            fileName: att.file_name,
            fileSize: att.file_size,
            fileType: att.file_type,
            uploadedAt: att.uploaded_at ? new Date(att.uploaded_at) : undefined,
            downloadUrl: pub.publicUrl,
          };
        })
      }));
    } catch (error) {
      console.error('Error fetching city tickets:', error);
      return [];
    }
  }

  // --- Log assignment add ---
  static async addAssignee(ticketId: string, userId: string, role: string, performedBy: string, performedByName: string, performedByRole: string) {
    console.log('🔍 [ASSIGNMENT DEBUG] addAssignee called with:', {
      ticketId,
      userId,
      role,
      performedBy,
      performedByName,
      performedByRole
    });
    
    // Role validation: Allow super_admin and ticket_admin to assign
    const allowedAssignRoles = ['super_admin', 'ticket_admin'];
    if ((role === 'resolver' || role === 'approver') && !allowedAssignRoles.includes(performedByRole || '')) {
      console.error('❌ [ASSIGNMENT DEBUG] Role validation failed:', {
        role,
        performedByRole,
        allowedAssignRoles
      });
      throw new Error('Only super admins or ticket admins can assign');
    }
    
    console.log('✅ [ASSIGNMENT DEBUG] Role validation passed, proceeding with assignment');

    const { error } = await supabase.from('ticket_assignees').insert([{
      ticket_id: ticketId,
      user_id: userId,
      role,
      assigned_at: new Date().toISOString(),
      performed_by: performedBy
    }]);
    
    if (error) {
      console.error('❌ [ASSIGNMENT DEBUG] Database insert error:', error);
    } else {
      console.log('✅ [ASSIGNMENT DEBUG] Assignment inserted successfully');
    }
    
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

      // Auto-move to in_progress when a resolver is assigned (only if ticket is in OPEN status)
      try {
        if (role === 'resolver') {
          const { data: ticket } = await supabase
            .from('tickets')
            .select('status')
            .eq('id', ticketId)
            .single();
          const currentStatus = ticket?.status as Issue['status'];
          // Only move to in_progress if the ticket is currently in OPEN status
          if (currentStatus === 'open') {
            await supabase
              .from('tickets')
              .update({ status: 'in_progress', updated_at: new Date().toISOString() })
              .eq('id', ticketId);
          }
        }
      } catch (autoErr) {
        console.error('Auto-move to in_progress failed:', autoErr);
      }
    }
    return { error };
  }

  // --- Log assignment remove ---
  static async removeAssignee(ticketId: string, userId: string, role: string, performedBy: string, performedByName: string, performedByRole: string) {
    // Role validation: Allow super_admin and ticket_admin to remove
    const allowedRemoveRoles = ['super_admin', 'ticket_admin'];
    if ((role === 'resolver' || role === 'approver') && !allowedRemoveRoles.includes(performedByRole || '')) {
      throw new Error('Only super admins or ticket admins can remove assignments');
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
  static async addComment(ticketId: string, commentData: Omit<Comment, 'id' | 'timestamp'> & { attachments?: File[] }): Promise<void> {
    try {
      console.log('Adding comment with data:', {
        ticketId,
        content: commentData.content,
        author: commentData.author,
        authorRole: commentData.authorRole,
        isInternal: commentData.isInternal,
        attachments: commentData.attachments?.length || 0
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

      // Upload comment attachments if any
      const commentId = data[0].id;
      if (commentData.attachments && commentData.attachments.length > 0) {
        await this.uploadCommentAttachments(commentId, commentData.attachments);
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
        details: { 
          is_internal: commentData.isInternal,
          attachments_count: commentData.attachments?.length || 0
        },
      });

      // Send WhatsApp notification for non-internal comments (only if NOT from ticket raiser)
      if (!commentData.isInternal) {
        try {
          // Get ticket details for notification
          const { data: ticketData, error: ticketError } = await supabase
            .from('tickets')
            .select('ticket_number, resource_id, submitted_by')
            .eq('id', ticketId)
            .single();

          if (!ticketError && ticketData) {
            // Check if the comment author is the same as the ticket submitter or anonymous
            const isCommentFromTicketRaiser = commentData.author === ticketData.submitted_by;
            const isCommentFromAnonymous = commentData.author === 'anonymous' || commentData.author === 'Anonymous';
            
            if (isCommentFromTicketRaiser || isCommentFromAnonymous) {
              console.log('📱 [WHATSAPP DEBUG] Comment is from ticket raiser or anonymous, skipping WhatsApp notification');
            } else {
              console.log('📱 [WHATSAPP DEBUG] Comment is from someone else, proceeding with WhatsApp notification');
              const commentNotificationData = {
                ticketNumber: ticketData.ticket_number,
                resourceId: ticketData.resource_id || 'NOT_SPECIFIED',
                submittedBy: ticketData.submitted_by || 'Anonymous',
                ticketLink: `https://awign-invigilation-escalation.netlify.app/track?id=${ticketData.ticket_number}`
              };

              console.log('📱 [WHATSAPP DEBUG] Sending comment notification with data:', commentNotificationData);
              const result = await WhatsAppService.sendCommentNotification(commentNotificationData);
              console.log('📱 [WHATSAPP DEBUG] Comment notification result:', result);
            }
          }
        } catch (whatsappError) {
          console.error('❌ [WHATSAPP DEBUG] Failed to send comment notification:', whatsappError);
          // Don't fail the comment addition if WhatsApp notification fails
        }

        // Send SMS notification for non-internal comments (only if NOT from ticket raiser)
        try {
          // Get ticket details for SMS notification
          const { data: ticketData, error: ticketError } = await supabase
            .from('tickets')
            .select('ticket_number, resource_id, submitted_by')
            .eq('id', ticketId)
            .single();

          if (!ticketError && ticketData) {
            // Check if the comment author is the same as the ticket submitter or anonymous
            const isCommentFromTicketRaiser = commentData.author === ticketData.submitted_by;
            const isCommentFromAnonymous = commentData.author === 'anonymous' || commentData.author === 'Anonymous';

            if (isCommentFromTicketRaiser || isCommentFromAnonymous) {
              console.log('📱 [SMS DEBUG] Comment is from ticket raiser or anonymous, skipping SMS notification');
            } else {
              console.log('📱 [SMS DEBUG] Comment is from someone else, proceeding with SMS notification');
              console.log('📱 [SMS DEBUG] Resource ID for comment SMS lookup:', ticketData.resource_id);
              
              if (ticketData.resource_id && ticketData.resource_id !== 'NOT_SPECIFIED') {
                // Use shared contact service to avoid duplicate parsing
                const contact = await SharedContactService.findContactByResourceId(ticketData.resource_id);
                
                if (contact) {
                  const formattedPhone = SharedContactService.formatPhoneNumberForSMS(contact.contactNumber);
                  if (formattedPhone) {
                    const smsData = {
                      mobileNumber: formattedPhone,
                      name: contact.name,
                      ticketNumber: ticketData.ticket_number,
                      ticketLink: `https://awign-invigilation-escalation.netlify.app/track?id=${ticketData.ticket_number}`
                    };
                    
                    console.log('📱 [SMS DEBUG] Sending comment update SMS notification with data:', smsData);
                    const smsResult = await SMSService.sendTicketUpdateNotification(smsData);
                    console.log('📱 [SMS DEBUG] Comment SMS notification result:', smsResult);
                  } else {
                    console.log('📱 [SMS DEBUG] Invalid phone number for contact:', contact.contactNumber);
                  }
                } else {
                  console.log('📱 [SMS DEBUG] No contact found with Resource ID:', ticketData.resource_id);
                }
              } else {
                console.log('📱 [SMS DEBUG] No Resource ID provided, skipping comment SMS notification');
              }
            }
          }
        } catch (smsError) {
          console.error('❌ [SMS DEBUG] Failed to send comment SMS notification:', smsError);
          // Don't fail the comment addition if SMS notification fails
        }
      }
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

  private static async uploadCommentAttachments(commentId: string, files: File[]): Promise<void> {
    for (const file of files) {
      try {
        const fileName = `${commentId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('comment-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('comment_attachments')
          .insert({
            comment_id: commentId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: fileName,
          });

        if (dbError) throw dbError;
      } catch (error) {
        console.error('Error uploading comment attachment:', error);
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
    const attachments = Array.isArray(data.attachments) ? data.attachments.map((att: any) => {
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
      submittedAt: (() => {
        if (!data.submitted_at) {
          console.error('Ticket missing submitted_at:', data);
          return new Date();
        }
        const timestamp = new Date(data.submitted_at);
        if (isNaN(timestamp.getTime())) {
          console.error('Invalid ticket submitted_at:', data.submitted_at, 'for ticket:', data);
          return new Date();
        }
        return timestamp;
      })(),
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
      comments: data.comments?.map((comment: any) => {
        // Add logging to debug timestamp issues
        if (!comment.created_at) {
          console.error('Comment missing created_at:', comment);
        } else {
          const timestamp = new Date(comment.created_at);
          if (isNaN(timestamp.getTime())) {
            console.error('Invalid comment timestamp:', comment.created_at, 'for comment:', comment);
          }
        }
        
        return {
          id: comment.id,
          content: comment.content,
          author: comment.author,
          authorRole: comment.author_role,
          timestamp: comment.created_at ? new Date(comment.created_at) : new Date(),
          isInternal: comment.is_internal,
          attachments: (comment.comment_attachments || []).map((att: any) => {
            const { data: pub } = supabase.storage.from('comment-attachments').getPublicUrl(att.storage_path);
            return {
              id: att.id,
              fileName: att.file_name,
              fileSize: att.file_size,
              fileType: att.file_type,
              downloadUrl: pub.publicUrl,
              uploadedAt: att.uploaded_at ? new Date(att.uploaded_at) : undefined,
            };
          }),
        };
      }) || [],
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

  // Get last status for multiple tickets (for filtering purposes)
  static async getLastStatusForTickets(ticketIds: string[]): Promise<Map<string, string>> {
    try {
      if (ticketIds.length === 0) return new Map();
      
      const { data, error } = await supabase
        .from('ticket_history')
        .select('ticket_id, old_value, new_value, performed_at')
        .eq('action_type', 'status_change')
        .in('ticket_id', ticketIds)
        .order('performed_at', { ascending: false });
      
      if (error) throw error;
      
      const lastStatusByTicket = new Map<string, string>();
      
      if (data && data.length > 0) {
        // Group by ticket_id and find the most recent status change
        const ticketStatusChanges = new Map<string, Array<{old_value: string, new_value: string, performed_at: string}>>();
        
        data.forEach(entry => {
          if (!ticketStatusChanges.has(entry.ticket_id)) {
            ticketStatusChanges.set(entry.ticket_id, []);
          }
          ticketStatusChanges.get(entry.ticket_id)!.push({
            old_value: entry.old_value,
            new_value: entry.new_value,
            performed_at: entry.performed_at
          });
        });
        
        // For each ticket, find the most recent status change and get the old_value (previous status)
        ticketStatusChanges.forEach((changes, ticketId) => {
          if (changes.length > 0) {
            // Sort by performed_at descending to get most recent first
            changes.sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime());
            
            // Get the old_value from the most recent change (which is the previous status)
            const mostRecentChange = changes[0];
            lastStatusByTicket.set(ticketId, mostRecentChange.old_value);
          }
        });
      }
      
      return lastStatusByTicket;
    } catch (error) {
      console.error('Error getting last status for tickets:', error);
      return new Map();
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
