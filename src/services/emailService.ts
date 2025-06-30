import { Issue } from '@/types/issue';

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

  static async sendTicketCreatedNotification(ticketData: EmailNotificationData): Promise<boolean> {
    try {
      // For now, we'll use a simple approach that can be easily replaced
      // with any email service (SendGrid, Resend, EmailJS, etc.)
      
      const emailContent = this.generateTicketEmailContent(ticketData);
      
      // Option 1: Using EmailJS (if configured)
      if (this.EMAIL_SERVICE_ID && this.EMAIL_TEMPLATE_ID && this.EMAIL_USER_ID) {
        return await this.sendViaEmailJS(emailContent);
      }
      
      // Option 2: Using a custom API endpoint
      if (this.EMAIL_API_URL && this.EMAIL_API_URL !== 'https://api.emailjs.com/api/v1.0/email/send') {
        return await this.sendViaCustomAPI(emailContent);
      }
      
      // Option 3: Console log for development (fallback)
      console.log('📧 EMAIL NOTIFICATION (Development Mode):', {
        to: this.NOTIFICATION_EMAIL,
        subject: `New Ticket Created: ${ticketData.ticketNumber}`,
        content: emailContent
      });
      
      return true;
    } catch (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
  }

  private static generateTicketEmailContent(ticketData: EmailNotificationData): string {
    const attachmentInfo = ticketData.attachments && ticketData.attachments.length > 0
      ? `\n\nAttachments (${ticketData.attachments.length}):\n${ticketData.attachments.map(att => 
          `- ${att.fileName} (${(att.fileSize / 1024).toFixed(1)} KB, ${att.fileType})`
        ).join('\n')}`
      : '\n\nNo attachments';

    return `
New Ticket Created

Ticket Number: ${ticketData.ticketNumber}
Centre Code: ${ticketData.centreCode}
City: ${ticketData.city}
Resource ID: ${ticketData.resourceId || 'Not specified'}
Category: ${ticketData.issueCategory}
Severity: ${ticketData.severity}
Submitted By: ${ticketData.submittedBy}
Submitted At: ${ticketData.submittedAt.toLocaleString()}

Description:
${ticketData.issueDescription}
${attachmentInfo}

---
This is an automated notification from the AWIGN Issue Management System.
    `.trim();
  }

  private static async sendViaEmailJS(emailContent: string): Promise<boolean> {
    try {
      const response = await fetch(this.EMAIL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: this.EMAIL_SERVICE_ID,
          template_id: this.EMAIL_TEMPLATE_ID,
          user_id: this.EMAIL_USER_ID,
          template_params: {
            to_email: this.NOTIFICATION_EMAIL,
            subject: 'New Ticket Created',
            message: emailContent,
          },
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('EmailJS error:', error);
      return false;
    }
  }

  private static async sendViaCustomAPI(emailContent: string): Promise<boolean> {
    try {
      const response = await fetch(this.EMAIL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: this.NOTIFICATION_EMAIL,
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
    resolutionNotes?: string
  ): Promise<boolean> {
    try {
      const emailContent = `
Ticket Status Updated

Ticket Number: ${ticketNumber}
Status Changed: ${oldStatus} → ${newStatus}
Changed By: ${changedBy}
Changed At: ${new Date().toLocaleString()}
${resolutionNotes ? `Resolution Notes: ${resolutionNotes}` : ''}

---
This is an automated notification from the AWIGN Issue Management System.
      `.trim();

      // Use the same sending logic as ticket creation
      if (this.EMAIL_SERVICE_ID && this.EMAIL_TEMPLATE_ID && this.EMAIL_USER_ID) {
        return await this.sendViaEmailJS(emailContent);
      }
      
      if (this.EMAIL_API_URL && this.EMAIL_API_URL !== 'https://api.emailjs.com/api/v1.0/email/send') {
        return await this.sendViaCustomAPI(emailContent);
      }
      
      console.log('📧 STATUS CHANGE EMAIL (Development Mode):', {
        to: this.NOTIFICATION_EMAIL,
        subject: `Ticket Status Updated: ${ticketNumber}`,
        content: emailContent
      });
      
      return true;
    } catch (error) {
      console.error('Error sending status change email:', error);
      return false;
    }
  }
} 