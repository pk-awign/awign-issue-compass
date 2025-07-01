import { Issue } from '@/types/issue';
import { TicketService } from './ticketService';

export interface EmailNotificationData {
  ticketNumber: string;
  centreCode: string;
  city: string;
  resourceId?: string;
  issueCategory: string;
  issueDescription: string;
  submittedBy: string;
  submittedAt: Date;
  severity: string;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    fileType: string;
  }>;
}

export class EmailService {
  private static readonly NOTIFICATION_EMAIL = 'issue_management@awign.com';
  private static readonly EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || 'https://api.emailjs.com/api/v1.0/email/send';
  private static readonly EMAIL_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  private static readonly EMAIL_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  private static readonly EMAIL_USER_ID = import.meta.env.VITE_EMAILJS_USER_ID;

  static async sendTicketCreatedNotification(ticketData: EmailNotificationData, recipient?: string): Promise<boolean> {
    try {
      const to = recipient || this.NOTIFICATION_EMAIL;
      const emailContent = this.generateTicketEmailContent(ticketData);
      
      console.log('🔍 DEBUG: Email Service Configuration:', {
        EMAIL_SERVICE_ID: this.EMAIL_SERVICE_ID ? '✅ Set' : '❌ Missing',
        EMAIL_TEMPLATE_ID: this.EMAIL_TEMPLATE_ID ? '✅ Set' : '❌ Missing',
        EMAIL_USER_ID: this.EMAIL_USER_ID ? '✅ Set' : '❌ Missing',
        EMAIL_API_URL: this.EMAIL_API_URL
      });

      console.log('📧 DEBUG: Generated email content for ticket creation:', {
        to,
        subject: `New Ticket Created: ${ticketData.ticketNumber}`,
        content: emailContent,
        ticketData
      });

      // Option 1: Using EmailJS (if configured)
      if (this.EMAIL_SERVICE_ID && this.EMAIL_TEMPLATE_ID && this.EMAIL_USER_ID) {
        console.log('🚀 Attempting to send via EmailJS...');
        const result = await this.sendViaEmailJS(emailContent, to, ticketData);
        console.log('📧 EmailJS result:', result);
        return result;
      }

      // Option 2: Using a custom API endpoint
      if (this.EMAIL_API_URL && this.EMAIL_API_URL !== 'https://api.emailjs.com/api/v1.0/email/send') {
        console.log('🚀 Attempting to send via Custom API...');
        const result = await this.sendViaCustomAPI(emailContent, to);
        console.log('📧 Custom API result:', result);
        return result;
      }

      // Option 3: Console log for development (fallback)
      console.log('📧 EMAIL NOTIFICATION (Development Mode):', {
        to,
        subject: `New Ticket Created: ${ticketData.ticketNumber}`,
        content: emailContent,
        ticketData
      });

      return true;
    } catch (error) {
      console.error('❌ Error sending email notification:', error);
      return false;
    }
  }

  private static generateTicketEmailContent(ticketData: EmailNotificationData): string {
    const attachmentInfo = ticketData.attachments && ticketData.attachments.length > 0
      ? `\n\nAttachment List (${ticketData.attachments.length}):\n${ticketData.attachments.map(att => 
          `- ${att.fileName} (${(att.fileSize / 1024).toFixed(1)} KB, ${att.fileType})`
        ).join('\n')}`
      : '\n\nNo attachments';

    return `
Hi team,

There's an update:

• Ticket Number: ${ticketData.ticketNumber}
• Centre Code & City: ${ticketData.centreCode}, ${ticketData.city}
• Resource ID (if specified): ${ticketData.resourceId || 'Not specified'}
• Issue Category & Severity: ${ticketData.issueCategory}, ${ticketData.severity}
• Submitted By & Timestamp: ${ticketData.submittedBy}, ${ticketData.submittedAt.toLocaleString()}
• Full Issue Description: ${ticketData.issueDescription}
${attachmentInfo}

---
This is an automated notification from the AWIGN Escalation Management System.
    `.trim();
  }

  private static async sendViaEmailJS(emailContent: string, to: string, ticketData: EmailNotificationData): Promise<boolean> {
    try {
      // Create template parameters with all ticket data
      const templateParams = {
        to_email: to,
        subject: `New Ticket Created: ${ticketData.ticketNumber}`,
        message: emailContent,
        // Additional parameters for EmailJS template
        ticket_number: ticketData.ticketNumber,
        centre_code: ticketData.centreCode,
        city: ticketData.city,
        resource_id: ticketData.resourceId || 'Not specified',
        issue_category: ticketData.issueCategory,
        issue_description: ticketData.issueDescription,
        submitted_by: ticketData.submittedBy,
        submitted_at: ticketData.submittedAt.toLocaleString(),
        severity: ticketData.severity,
        attachments_count: ticketData.attachments?.length || 0
      };

      console.log('📤 Sending to EmailJS with params:', {
        service_id: this.EMAIL_SERVICE_ID,
        template_id: this.EMAIL_TEMPLATE_ID,
        user_id: this.EMAIL_USER_ID,
        template_params: templateParams
      });

      const response = await fetch(this.EMAIL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: this.EMAIL_SERVICE_ID,
          template_id: this.EMAIL_TEMPLATE_ID,
          user_id: this.EMAIL_USER_ID,
          template_params: templateParams,
        }),
      });

      const responseText = await response.text();
      console.log('📥 EmailJS Response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      if (!response.ok) {
        console.error('❌ EmailJS API error:', response.status, responseText);
        return false;
      }

      console.log('✅ EmailJS email sent successfully');
      return true;
    } catch (error) {
      console.error('❌ EmailJS error:', error);
      return false;
    }
  }

  private static async sendViaCustomAPI(emailContent: string, to: string): Promise<boolean> {
    try {
      const response = await fetch(this.EMAIL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject: 'New Ticket Created',
          content: emailContent,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Custom API error:', error);
      return false;
    }
  }

  // Method to send notification for status changes
  static async sendStatusChangeNotification(
    ticketNumber: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
    resolutionNotes?: string,
    recipient?: string
  ): Promise<boolean> {
    try {
      const to = recipient || this.NOTIFICATION_EMAIL;
      const emailContent = `
Ticket Status Updated

Ticket Number: ${ticketNumber}
Status Changed: ${oldStatus} → ${newStatus}
Changed By: ${changedBy}
Changed At: ${new Date().toLocaleString()}
${resolutionNotes ? `Resolution Notes: ${resolutionNotes}` : ''}

---
This is an automated notification from the AWIGN Escalation Management System.
      `.trim();

      console.log('DEBUG: Generated email content for status change:', emailContent);

      if (this.EMAIL_SERVICE_ID && this.EMAIL_TEMPLATE_ID && this.EMAIL_USER_ID) {
        return await this.sendViaEmailJS(emailContent, to, {
          ticketNumber,
          centreCode: '',
          city: '',
          issueCategory: '',
          issueDescription: '',
          submittedBy: changedBy,
          submittedAt: new Date(),
          severity: ''
        });
      }
      if (this.EMAIL_API_URL && this.EMAIL_API_URL !== 'https://api.emailjs.com/api/v1.0/email/send') {
        return await this.sendViaCustomAPI(emailContent, to);
      }
      console.log('📧 STATUS CHANGE EMAIL (Development Mode):', {
        to,
        subject: `Ticket Status Updated: ${ticketNumber}`,
        content: emailContent
      });
      return true;
    } catch (error) {
      console.error('Error sending status change email:', error);
      return false;
    }
  }

  // Helper for dev: send email for the last ticket
  static async sendEmailForLastTicket() {
    const lastTicket = await TicketService.getLastTicket();
    if (!lastTicket) {
      console.error('No last ticket found');
      return false;
    }
    return EmailService.sendTicketCreatedNotification({
      ticketNumber: lastTicket.ticketNumber,
      centreCode: lastTicket.centreCode,
      city: lastTicket.city,
      resourceId: lastTicket.resourceId,
      issueCategory: lastTicket.issueCategory,
      issueDescription: lastTicket.issueDescription,
      submittedBy: lastTicket.submittedBy,
      submittedAt: lastTicket.submittedAt,
      severity: lastTicket.severity,
      attachments: lastTicket.attachments || []
    });
  }

  // Debug method to check EmailJS configuration
  static debugEmailJSConfig() {
    console.log('🔍 EmailJS Configuration Debug:', {
      EMAIL_SERVICE_ID: this.EMAIL_SERVICE_ID,
      EMAIL_TEMPLATE_ID: this.EMAIL_TEMPLATE_ID,
      EMAIL_USER_ID: this.EMAIL_USER_ID,
      EMAIL_API_URL: this.EMAIL_API_URL,
      isConfigured: !!(this.EMAIL_SERVICE_ID && this.EMAIL_TEMPLATE_ID && this.EMAIL_USER_ID)
    });
  }
} 