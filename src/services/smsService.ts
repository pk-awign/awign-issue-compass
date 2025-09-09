import { toast } from 'sonner';
import { SharedContactService, SharedContact } from './sharedContactService';

// SMS API Configuration
const SMS_CONFIG = {
  API_URL: 'https://core-api.awign.com/api/v1/sms/to_number',
  ACCESS_TOKEN: import.meta.env.VITE_SMS_ACCESS_TOKEN,
  CLIENT: import.meta.env.VITE_SMS_CLIENT,
  UID: import.meta.env.VITE_SMS_UID,
  CLIENT_ID: import.meta.env.VITE_SMS_CLIENT_ID || 'core',
  SENDER_ID: import.meta.env.VITE_SMS_SENDER_ID || 'IAWIGN',
  CHANNEL: import.meta.env.VITE_SMS_CHANNEL || 'telspiel',
  TICKET_CREATION_TEMPLATE_ID: import.meta.env.VITE_SMS_TICKET_CREATION_TEMPLATE_ID,
  TICKET_UPDATE_TEMPLATE_ID: import.meta.env.VITE_SMS_TICKET_UPDATE_TEMPLATE_ID
};

// Remove unused Google Sheets configuration and methods since we use SharedContactService

export interface SMSContact {
  contactNumber: string;
  resourceId: string;
  name: string;
  emailId: string;
  zone: string;
  city: string;
}

export interface SMSNotificationData {
  mobileNumber: string;
  name: string;
  ticketNumber: string;
  ticketLink: string;
}

export interface SMSMessageData {
  sms: {
    mobile_number: string;
    template_id: string;
    message: string;
    sender_id: string;
    channel: string;
  };
}

export class SMSService {
  /**
   * Validate SMS configuration
   */
  private static validateConfig(): boolean {
    const requiredVars = [
      'ACCESS_TOKEN',
      'CLIENT', 
      'UID',
      'TICKET_CREATION_TEMPLATE_ID',
      'TICKET_UPDATE_TEMPLATE_ID'
    ];
    
    const missing = requiredVars.filter(key => !SMS_CONFIG[key as keyof typeof SMS_CONFIG]);
    
    if (missing.length > 0) {
      console.error('❌ [SMS SERVICE] Missing required environment variables:', missing);
      return false;
    }
    
    return true;
  }

  /**
   * Send SMS message via proxy
   */
  static async sendSMSMessageViaProxy(action: string, data: any): Promise<boolean> {
    try {
      console.log('📱 [SMS SERVICE] Sending SMS via proxy:', { action, data });

      // Use Netlify function proxy to avoid CORS issues
      const proxyUrl = '/.netlify/functions/sms-proxy';
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          data
        })
      });

      const result = await response.json();
      
      console.log('📱 [SMS SERVICE] SMS proxy response:', {
        status: response.status,
        ok: response.ok,
        result: result
      });

      if (response.ok && result.success) {
        console.log('✅ [SMS SERVICE] SMS sent successfully');
        return true;
      } else {
        console.error('❌ [SMS SERVICE] SMS failed:', result);
        return false;
      }

    } catch (error) {
      console.error('❌ [SMS SERVICE] Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Send ticket creation notification via SMS by Resource ID (like WhatsApp)
   */
  static async sendTicketCreationNotificationByResourceId(
    resourceId: string,
    ticketData: {
      ticketNumber: string;
      submittedBy: string;
      ticketLink: string;
    }
  ): Promise<boolean> {
    if (!this.validateConfig()) {
      console.error('❌ [SMS SERVICE] Configuration validation failed');
      return false;
    }

    try {
      console.log('🔍 [SMS SERVICE] Looking up contact by Resource ID:', resourceId);
      
      // Use shared contact service to avoid duplicate parsing
      const contact = await SharedContactService.findContactByResourceId(resourceId);
      
      if (!contact) {
        console.warn('⚠️ [SMS SERVICE] No contact found with Resource ID:', resourceId);
        return false;
      }
      
      console.log('✅ [SMS SERVICE] Found matching contact:', contact);
      
      // Format phone number using shared service
      const formattedPhone = SharedContactService.formatPhoneNumber(contact.contactNumber);
      console.log('📱 [SMS SERVICE] Formatted phone:', formattedPhone);
      
      if (!formattedPhone) {
        console.error('❌ [SMS SERVICE] Invalid phone number for contact:', contact.contactNumber);
        return false;
      }
      
      // Send SMS
      const smsData: SMSNotificationData = {
        mobileNumber: formattedPhone,
        name: contact.name,
        ticketNumber: ticketData.ticketNumber,
        ticketLink: ticketData.ticketLink
      };
      
      return await this.sendSMSMessageViaProxy('sendTicketCreationNotification', smsData);
      
    } catch (error) {
      console.error('❌ [SMS SERVICE] Error sending SMS by Resource ID:', error);
      return false;
    }
  }

  /**
   * Send ticket creation notification via SMS
   */
  static async sendTicketCreationNotification(
    smsData: SMSNotificationData
  ): Promise<boolean> {
    try {
      console.log('📱 [SMS SERVICE] Starting ticket creation SMS notification...');
      console.log('📱 [SMS SERVICE] SMS data:', smsData);

      const formattedPhone = SharedContactService.formatPhoneNumber(smsData.mobileNumber);
      
      if (!formattedPhone) {
        console.error('❌ [SMS SERVICE] Invalid phone number:', smsData.mobileNumber);
        return false;
      }

      const messageData: SMSMessageData = {
        sms: {
          mobile_number: formattedPhone,
          template_id: SMS_CONFIG.TICKET_CREATION_TEMPLATE_ID,
          message: `Hi ${smsData.name},
Your ticket has been raised.

- Ticket Number: ${smsData.ticketNumber}
- Tracking Link: https://awign-invigilation-escalation.netlify.app/track?id=${smsData.ticketNumber}

Escalation Portal -Awign`,
          sender_id: SMS_CONFIG.SENDER_ID,
          channel: SMS_CONFIG.CHANNEL
        }
      };

      const success = await this.sendSMSMessage(messageData);
      
      if (success) {
        console.log('✅ [SMS SERVICE] Ticket creation SMS sent to:', smsData.name);
        toast.success(`SMS notification sent to ${smsData.name}`);
      } else {
        console.error('❌ [SMS SERVICE] Failed to send ticket creation SMS');
        toast.error(`Failed to send SMS to ${smsData.name}`);
      }
      
      return success;

    } catch (error) {
      console.error('❌ [SMS SERVICE] Error sending ticket creation SMS:', error);
      toast.error('Error sending SMS notification');
      return false;
    }
  }

  /**
   * Send ticket update notification via SMS
   */
  static async sendTicketUpdateNotification(
    smsData: SMSNotificationData
  ): Promise<boolean> {
    try {
      console.log('📱 [SMS SERVICE] Starting ticket update SMS notification...');
      console.log('📱 [SMS SERVICE] SMS data:', smsData);

      const formattedPhone = SharedContactService.formatPhoneNumber(smsData.mobileNumber);
      
      if (!formattedPhone) {
        console.error('❌ [SMS SERVICE] Invalid phone number:', smsData.mobileNumber);
        return false;
      }

      const messageData: SMSMessageData = {
        sms: {
          mobile_number: formattedPhone,
          template_id: SMS_CONFIG.TICKET_UPDATE_TEMPLATE_ID,
          message: `Hi ${smsData.name},
There has been an update on your ticket.

- Ticket Number: ${smsData.ticketNumber}
- Track the update here - https://awign-invigilation-escalation.netlify.app/track?id=${smsData.ticketNumber}

Escalation Portal -Awign`,
          sender_id: SMS_CONFIG.SENDER_ID,
          channel: SMS_CONFIG.CHANNEL
        }
      };

      const success = await this.sendSMSMessageViaProxy('sendTicketUpdateNotification', smsData);
      
      if (success) {
        console.log('✅ [SMS SERVICE] Ticket update SMS sent to:', smsData.name);
        toast.success(`SMS update notification sent to ${smsData.name}`);
      } else {
        console.error('❌ [SMS SERVICE] Failed to send ticket update SMS');
        toast.error(`Failed to send SMS update to ${smsData.name}`);
      }
      
      return success;

    } catch (error) {
      console.error('❌ [SMS SERVICE] Error sending ticket update SMS:', error);
      toast.error('Error sending SMS update notification');
      return false;
    }
  }

  /**
   * Test SMS connection with dummy data
   */
  static async testSMSConnection(): Promise<boolean> {
    try {
      console.log('🔍 [SMS SERVICE] Testing SMS connection...');

      const testMessage: SMSMessageData = {
        sms: {
          mobile_number: '7060700600', // Test number from your curl
          template_id: SMS_CONFIG.TICKET_CREATION_TEMPLATE_ID,
          message: 'Hi Test User,\nYour ticket has been raised.\n\n- Ticket Number: TEST123\n- Tracking Link: https://awign-invigilation-escalation.netlify.app/track?id=TEST123\n\nEscalation Portal -Awign',
          sender_id: SMS_CONFIG.SENDER_ID,
          channel: SMS_CONFIG.CHANNEL
        }
      };

      const success = await this.sendSMSMessageViaProxy('testSMS', {
        mobileNumber: '7060700600'
      });
      
      if (success) {
        console.log('✅ [SMS SERVICE] SMS connection test successful');
        toast.success('SMS connection test successful');
      } else {
        console.error('❌ [SMS SERVICE] SMS connection test failed');
        toast.error('SMS connection test failed');
      }
      
      return success;

    } catch (error) {
      console.error('❌ [SMS SERVICE] Error testing SMS connection:', error);
      toast.error('Error testing SMS connection');
      return false;
    }
  }
}
