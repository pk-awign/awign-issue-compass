// NotificationService: Centralized notification logic for email, WhatsApp, and SMS
import { EmailService } from './emailService';
import { SMSService } from './smsService';
// import { WhatsAppAdapter } from './whatsappAdapter'; // Placeholder for WhatsApp integration

interface NotificationLog {
  userId: string;
  type: string;
  channels: string[];
  status: string;
  timestamp: Date;
}

const INTERNAL_GROUP_EMAIL = 'awign-escalation@googlegroups.com';

export class NotificationService {
  // Notify on ticket creation
  static async notifyTicketCreated(ticket: any, user: any) {
    await EmailService.sendTicketCreatedNotification(ticket, INTERNAL_GROUP_EMAIL);
    // Placeholder: Replace with your WhatsApp message generator
    const whatsappContent = `Your ticket ${ticket.ticketNumber} has been created.`;

    // Send Email
    let emailStatus = 'not_sent';
    if (user.email) {
      const sent = await EmailService.sendTicketCreatedNotification(ticket);
      emailStatus = sent ? 'sent' : 'failed';
    }

    // Send WhatsApp (if user has opted in)
    let whatsappStatus = 'not_sent';
    if (user.whatsappOptIn && user.phone) {
      // await WhatsAppAdapter.send(user.phone, whatsappContent);
      whatsappStatus = 'sent'; // Simulate success
    }

    // Send SMS (if user has phone number)
    let smsStatus = 'not_sent';
    if (user.phone) {
      try {
        const smsData = {
          mobileNumber: user.phone,
          name: user.name || ticket.submittedBy,
          ticketNumber: ticket.ticketNumber,
          ticketLink: ticket.ticketLink || `https://awign-invigilation-escalation.netlify.app/track?id=${ticket.ticketNumber}`
        };
        const sent = await SMSService.sendTicketCreationNotification(smsData);
        smsStatus = sent ? 'sent' : 'failed';
      } catch (error) {
        console.error('SMS notification error:', error);
        smsStatus = 'failed';
      }
    }

    // Log the notification (replace with DB logging if needed)
    console.log('NotificationLog', {
      userId: user.id,
      type: 'ticket_created',
      channels: ['email', 'whatsapp', 'sms'],
      status: `${emailStatus},${whatsappStatus},${smsStatus}`,
      timestamp: new Date()
    });
  }

  // Notify on ticket status change
  static async notifyStatusChanged(ticket: any, user: any, oldStatus: string, newStatus: string) {
    await EmailService.sendStatusChangeNotification(ticket.ticketNumber, oldStatus, newStatus, user.name, undefined, INTERNAL_GROUP_EMAIL);
    // Placeholder: Replace with your WhatsApp message generator
    const whatsappContent = `Ticket ${ticket.ticketNumber} status changed: ${oldStatus} → ${newStatus}`;

    // Send Email
    let emailStatus = 'not_sent';
    if (user.email) {
      const sent = await EmailService.sendStatusChangeNotification(ticket.ticketNumber, oldStatus, newStatus, user.name);
      emailStatus = sent ? 'sent' : 'failed';
    }

    // Send WhatsApp (if user has opted in)
    let whatsappStatus = 'not_sent';
    if (user.whatsappOptIn && user.phone) {
      // await WhatsAppAdapter.send(user.phone, whatsappContent);
      whatsappStatus = 'sent'; // Simulate success
    }

    // Send SMS (if user has phone number)
    let smsStatus = 'not_sent';
    if (user.phone) {
      try {
        const smsData = {
          mobileNumber: user.phone,
          name: user.name || ticket.submittedBy,
          ticketNumber: ticket.ticketNumber,
          ticketLink: ticket.ticketLink || `https://awign-invigilation-escalation.netlify.app/track?id=${ticket.ticketNumber}`
        };
        const sent = await SMSService.sendTicketUpdateNotification(smsData);
        smsStatus = sent ? 'sent' : 'failed';
      } catch (error) {
        console.error('SMS notification error:', error);
        smsStatus = 'failed';
      }
    }

    // Log the notification
    console.log('NotificationLog', {
      userId: user.id,
      type: 'status_changed',
      channels: ['email', 'whatsapp', 'sms'],
      status: `${emailStatus},${whatsappStatus},${smsStatus}`,
      timestamp: new Date()
    });
  }

  // Add more notification types as needed...
} 