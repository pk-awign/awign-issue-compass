import { toast } from 'sonner';

// SMS API Configuration
const SMS_CONFIG = {
  API_URL: 'https://core-api.awign.com/api/v1/sms/to_number',
  ACCESS_TOKEN: import.meta.env.VITE_SMS_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyNTAxMzgyIiwiaWF0IjoxNzU2NzkzMTk2LCJleHAiOjE3NTkzODUxOTYsIm9hdXRoX3R5cGUiOiJDQVMiLCJST0xFUyI6W119.Yfnd1HZvhKqlIYVtpjE50-FChhc5m1ahqiuxGtQFUy8',
  CLIENT: import.meta.env.VITE_SMS_CLIENT || '6Ok5D1iEP4zcV8S25HJmNA',
  UID: import.meta.env.VITE_SMS_UID || '110986717252553637625',
  CLIENT_ID: import.meta.env.VITE_SMS_CLIENT_ID || 'core',
  SENDER_ID: import.meta.env.VITE_SMS_SENDER_ID || 'IAWIGN',
  CHANNEL: import.meta.env.VITE_SMS_CHANNEL || 'telspiel',
  TICKET_CREATION_TEMPLATE_ID: import.meta.env.VITE_SMS_TICKET_CREATION_TEMPLATE_ID || '1107175742280378486',
  TICKET_UPDATE_TEMPLATE_ID: import.meta.env.VITE_SMS_TICKET_UPDATE_TEMPLATE_ID || '1107175742272376773'
};

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
   * Format phone number for SMS (ensure it's 10 digits without country code)
   */
  static formatPhoneNumber(phoneNumber: string): string | null {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 91 (India country code), remove it
    if (digits.startsWith('91') && digits.length === 12) {
      return digits.substring(2);
    }
    
    // If it's 10 digits, use as is
    if (digits.length === 10) {
      return digits;
    }
    
    // If it's 11 digits and starts with 0, remove the 0
    if (digits.length === 11 && digits.startsWith('0')) {
      return digits.substring(1);
    }
    
    console.warn('Invalid phone number format:', phoneNumber);
    return null;
  }

  /**
   * Send SMS message
   */
  static async sendSMSMessage(messageData: SMSMessageData): Promise<boolean> {
    try {
      console.log('📱 [SMS SERVICE] Sending SMS message:', {
        mobile_number: messageData.sms.mobile_number,
        template_id: messageData.sms.template_id,
        sender_id: messageData.sms.sender_id
      });

      const response = await fetch(SMS_CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access-token': SMS_CONFIG.ACCESS_TOKEN,
          'client': SMS_CONFIG.CLIENT,
          'uid': SMS_CONFIG.UID,
          'X-CLIENT_ID': SMS_CONFIG.CLIENT_ID
        },
        body: JSON.stringify(messageData)
      });

      const result = await response.json();
      
      console.log('📱 [SMS SERVICE] SMS API response:', {
        status: response.status,
        ok: response.ok,
        result: result
      });

      if (response.ok) {
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
   * Send ticket creation notification via SMS
   */
  static async sendTicketCreationNotification(
    smsData: SMSNotificationData
  ): Promise<boolean> {
    try {
      console.log('📱 [SMS SERVICE] Starting ticket creation SMS notification...');
      console.log('📱 [SMS SERVICE] SMS data:', smsData);

      const formattedPhone = this.formatPhoneNumber(smsData.mobileNumber);
      
      if (!formattedPhone) {
        console.error('❌ [SMS SERVICE] Invalid phone number:', smsData.mobileNumber);
        return false;
      }

      const messageData: SMSMessageData = {
        sms: {
          mobile_number: formattedPhone,
          template_id: SMS_CONFIG.TICKET_CREATION_TEMPLATE_ID,
          message: `Hi ${smsData.name},\nYour ticket has been raised.\n\n- Ticket Number: ${smsData.ticketNumber}\n- Tracking Link: ${smsData.ticketLink}\n\nEscalation Portal -Awign`,
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

      const formattedPhone = this.formatPhoneNumber(smsData.mobileNumber);
      
      if (!formattedPhone) {
        console.error('❌ [SMS SERVICE] Invalid phone number:', smsData.mobileNumber);
        return false;
      }

      const messageData: SMSMessageData = {
        sms: {
          mobile_number: formattedPhone,
          template_id: SMS_CONFIG.TICKET_UPDATE_TEMPLATE_ID,
          message: `Hi ${smsData.name},\nThere has been an update on your ticket.\n\n- Ticket Number: ${smsData.ticketNumber}\n- Track the update here - ${smsData.ticketLink}\n\nEscalation Portal -Awign`,
          sender_id: SMS_CONFIG.SENDER_ID,
          channel: SMS_CONFIG.CHANNEL
        }
      };

      const success = await this.sendSMSMessage(messageData);
      
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

      const success = await this.sendSMSMessage(testMessage);
      
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
