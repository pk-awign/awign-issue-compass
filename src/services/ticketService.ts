import { supabase } from '../integrations/supabase/client';
import { EmailService } from './emailService';
import { generateTicketNumber } from '../utils/ticketNumberGenerator';
import { toast } from 'sonner';

export interface IssueFormData {
  centreCode: string;
  city: string;
  resourceId: string;
  issueCategory: string;
  issueDescription: string;
  issueDate: Date;
  severity: string;
  isAnonymous: boolean;
  submittedBy: string;
  submittedByUserId?: string | null;
  attachments: File[];
  awignAppTicketId?: string | null;
  isTesting?: boolean;
  phoneNumber?: string; // Optional phone number for WhatsApp
}

export class TicketService {
  static async getTickets() {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('*');

  if (error) {
    console.error("Error fetching tickets:", error);
    return [];
  }

    return tickets;
  }

  static async getTicketByNumber(ticketNumber: string) {

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_number', ticketNumber)
      .single();

    if (error) {
      console.error("Error fetching ticket:", error);
      return null;
    }

    return ticket;
  }

  static async updateTicketStatus(ticketNumber: string, newStatus: string, userName: string) {

    try {
    // Get the existing ticket
    const { data: existingTicket, error: selectError } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_number', ticketNumber)
      .single();

    if (selectError) {
      console.error("Error fetching existing ticket:", selectError);
      throw new Error(`Failed to fetch ticket: ${selectError.message}`);
    }

    if (!existingTicket) {
      throw new Error("Ticket not found");
    }

    const oldStatus = existingTicket.status;

    // Update the ticket status
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .update({ status: newStatus })
      .eq('ticket_number', ticketNumber)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating ticket status:", updateError);
      throw new Error(`Failed to update ticket status: ${updateError.message}`);
    }

    // Get the user details (replace with your actual user fetching logic)
    const user = {
      id: updatedTicket.submitted_by_user_id || 'anonymous',
      name: userName || updatedTicket.submitted_by || 'Anonymous',
      email: 'test@example.com', // Replace with actual email
      whatsappOptIn: true, // Replace with actual opt-in status
      phone: '919999999999' // Replace with actual phone number
    };

    // Notify the status change
    // await NotificationService.notifyStatusChanged(updatedTicket, user, oldStatus, newStatus);

    return updatedTicket;
  } catch (error: any) {
      console.error("Error in updateTicketStatus:", error);
      throw error;
    }
  }

  static async submitIssue(issueData: IssueFormData): Promise<string> {

    try {
    console.log('🎫 [TICKET SERVICE] Starting ticket submission...');
    console.log('🎫 [TICKET SERVICE] Issue data:', {
      centreCode: issueData.centreCode,
      city: issueData.city,
      resourceId: issueData.resourceId,
      submittedBy: issueData.submittedBy,
      issueCategory: issueData.issueCategory
    });

    // Generate a unique ticket number
    const ticketNumber = generateTicketNumber();
    console.log('🎫 [TICKET SERVICE] Generated ticket number:', ticketNumber);

    // Prepare ticket data for database
    const ticketInsertData = {
      ticket_number: ticketNumber,
      centre_code: issueData.centreCode,
      city: issueData.city,
      resource_id: issueData.resourceId,
      issue_category: issueData.issueCategory,
      issue_description: issueData.issueDescription,
      issue_date: issueData.issueDate,
      severity: issueData.severity,
      is_anonymous: issueData.isAnonymous,
      submitted_by: issueData.isAnonymous ? null : issueData.submittedBy,
      submitted_by_user_id: issueData.submittedByUserId || null,
      status: 'open' as const,
      awign_app_ticket_id: issueData.awignAppTicketId || null,
      is_testing: issueData.isTesting || false
    };

    console.log('🎫 [TICKET SERVICE] Inserting ticket into database...');

    // Insert the ticket into the database
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        ...ticketInsertData,
        issue_date: ticketInsertData.issue_date.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [TICKET SERVICE] Database insertion error:', error);
      throw new Error(`Failed to create ticket: ${error.message}`);
    }

    console.log('✅ [TICKET SERVICE] Ticket created successfully:', {
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      status: ticket.status
    });

    // Handle attachments if any
    if (issueData.attachments && issueData.attachments.length > 0) {
      console.log('📎 [TICKET SERVICE] Processing attachments...', issueData.attachments.length);
      
      try {
        for (const attachment of issueData.attachments) {
          const attachmentData = {
            ticket_id: ticket.id,
            file_name: attachment.name,
            file_type: attachment.type,
            file_size: attachment.size,
            storage_path: `tickets/${ticket.id}/${attachment.name}`,
          };

          const { error: attachmentError } = await supabase
            .from('attachments')
            .insert(attachmentData);

          if (attachmentError) {
            console.error('❌ [TICKET SERVICE] Attachment error:', attachmentError);
          } else {
            console.log('✅ [TICKET SERVICE] Attachment saved:', attachment.name);
          }
        }
      } catch (attachmentError) {
        console.error('❌ [TICKET SERVICE] Error processing attachments:', attachmentError);
        // Don't fail the entire ticket creation for attachment errors
      }
    }

    // Send notifications (email and WhatsApp)
    console.log('📧 [TICKET SERVICE] Starting notification process...');
    
    try {
      // Prepare notification data
      const notificationData = {
        ticketNumber: ticket.ticket_number,
        centreCode: ticket.centre_code,
        city: ticket.city,
        resourceId: ticket.resource_id,
        issueCategory: ticket.issue_category,
        issueDescription: ticket.issue_description,
        submittedBy: ticket.submitted_by || 'Anonymous',
        submittedAt: new Date(ticket.submitted_at),
        severity: ticket.severity,
        ticketLink: `${window.location.origin}/track/${ticket.ticket_number}`
      };

      console.log('📧 [TICKET SERVICE] Notification data prepared:', {
        ticketNumber: notificationData.ticketNumber,
        resourceId: notificationData.resourceId,
        submittedBy: notificationData.submittedBy,
        ticketLink: notificationData.ticketLink
      });

      // Send email notification (existing functionality)
      console.log('📧 [TICKET SERVICE] Sending email notification...');
      try {
        await EmailService.sendTicketCreatedNotification(notificationData);
        console.log('✅ [TICKET SERVICE] Email notification sent successfully');
      } catch (emailError) {
        console.error('❌ [TICKET SERVICE] Email notification failed:', emailError);
        // Don't fail ticket creation for email errors
      }

      // Send WhatsApp notification to ticket raiser
      console.log('📱 [TICKET SERVICE] Sending WhatsApp notification to ticket raiser...');
      try {
        // Import WhatsApp service dynamically to avoid circular dependencies
        const { WhatsAppService } = await import('./whatsappService');
        
        const whatsappSuccess = await WhatsAppService.sendTicketCreationNotification(
          notificationData,
          issueData.phoneNumber // Use phone number from form if provided
        );

        if (whatsappSuccess) {
          console.log('✅ [TICKET SERVICE] WhatsApp notification sent successfully');
          toast.success('WhatsApp notification sent to ticket raiser');
        } else {
          console.warn('⚠️ [TICKET SERVICE] WhatsApp notification failed');
          toast.warning('WhatsApp notification could not be sent');
        }
      } catch (whatsappError) {
        console.error('❌ [TICKET SERVICE] WhatsApp notification error:', whatsappError);
        toast.warning(`WhatsApp notification failed: ${whatsappError.message}`);
        // Don't fail ticket creation for WhatsApp errors
      }

    } catch (notificationError) {
      console.error('❌ [TICKET SERVICE] Notification process error:', notificationError);
      // Don't fail ticket creation for notification errors
      toast.warning('Ticket created successfully, but some notifications may have failed');
    }

    console.log('✅ [TICKET SERVICE] Ticket submission completed successfully');
    toast.success(`Ticket ${ticketNumber} created successfully!`);
    
    return ticketNumber;

  } catch (error) {
      console.error('❌ [TICKET SERVICE] Ticket submission failed:', error);
      toast.error(`Failed to create ticket: ${error.message}`);
      throw error;
    }
  }
}

export const getTickets = TicketService.getTickets;
export const getTicketByNumber = TicketService.getTicketByNumber;
export const updateTicketStatus = TicketService.updateTicketStatus;
export const submitIssue = TicketService.submitIssue;
