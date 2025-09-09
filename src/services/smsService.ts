import { toast } from 'sonner';

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

// Google Sheets Configuration (same as WhatsApp service)
const GOOGLE_SHEETS_CONFIG = {
  SHEET_ID: '1-FJJ3fLMhMQbZWQ2DRswuC2MPrNP0AhUes1NoWQD-l8',
  TAB_NAME: 'Sheet1', // Default sheet name
  RESOURCE_ID_COLUMN: 'A', // Resource_ID column
  NAME_COLUMN: 'B', // Name column
  CONTACT_COLUMN: 'C' // Contact_Number column
};

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
   * Fetch contacts from Google Sheets (same logic as WhatsApp service)
   */
  static async fetchContactsFromSheet(): Promise<SMSContact[]> {
    try {
      console.log('🔍 [SMS GOOGLE SHEETS] Starting to fetch contacts...');
      console.log('🔍 [SMS GOOGLE SHEETS] Sheet ID:', GOOGLE_SHEETS_CONFIG.SHEET_ID);
      console.log('🔍 [SMS GOOGLE SHEETS] Tab Name:', GOOGLE_SHEETS_CONFIG.TAB_NAME);
      
      // Try multiple approaches to access the Google Sheet
      let response: Response;
      let url: string;
      
      // Approach 1: Try with API key (if available)
      const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
      if (apiKey) {
        console.log('🔍 [SMS GOOGLE SHEETS] Trying with API key...');
        url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.TAB_NAME}!A2:Z?key=${apiKey}`;
        response = await fetch(url);
        
        if (response.ok) {
          console.log('✅ [SMS GOOGLE SHEETS] Successfully fetched with API key');
        } else {
          console.log('❌ [SMS GOOGLE SHEETS] API key approach failed, trying public access...');
        }
      }
      
      // Approach 2: Try public access (requires sheet to be publicly accessible)
      if (!apiKey || !response?.ok) {
        console.log('🔍 [SMS GOOGLE SHEETS] Trying public access...');
        url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.TAB_NAME}!A2:Z`;
        response = await fetch(url);
      }
      
      // Approach 3: Try CSV export (fallback)
      if (!response?.ok) {
        console.log('🔍 [SMS GOOGLE SHEETS] Trying CSV export approach...');
        url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${GOOGLE_SHEETS_CONFIG.TAB_NAME}`;
        response = await fetch(url);
      }
      
      // Approach 4: Try direct CSV download (another fallback)
      if (!response?.ok) {
        console.log('🔍 [SMS GOOGLE SHEETS] Trying direct CSV download...');
        url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/export?format=csv&gid=0`;
        response = await fetch(url);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.text();
      console.log('📊 [SMS GOOGLE SHEETS] Raw data received, length:', data.length);
      
      // Parse CSV data
      const lines = data.split('\n').filter(line => line.trim());
      console.log('📊 [SMS GOOGLE SHEETS] Total lines:', lines.length);
      
      if (lines.length < 2) {
        console.warn('⚠️ [SMS GOOGLE SHEETS] No data rows found');
        return [];
      }
      
      // Skip header row and parse data
      const contacts: SMSContact[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Parse CSV line (handle commas within quoted fields)
        const fields = this.parseCSVLine(line);
        
        if (fields.length >= 6) {
          const contact: SMSContact = {
            resourceId: fields[0]?.trim() || '',
            name: fields[1]?.trim() || '',
            contactNumber: fields[2]?.trim() || '',
            emailId: fields[3]?.trim() || '',
            zone: fields[4]?.trim() || '',
            city: fields[5]?.trim() || ''
          };
          
          // Only add contacts with valid Resource ID and Contact Number
          if (contact.resourceId && contact.contactNumber) {
            contacts.push(contact);
          }
        }
      }
      
      console.log('✅ [SMS GOOGLE SHEETS] Successfully parsed contacts:', contacts.length);
      console.log('📋 [SMS GOOGLE SHEETS] Sample contacts:', contacts.slice(0, 3));
      
      return contacts;
      
    } catch (error) {
      console.error('❌ [SMS GOOGLE SHEETS] Error fetching contacts:', error);
      throw error;
    }
  }

  /**
   * Parse CSV line handling quoted fields
   */
  private static parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    fields.push(current);
    return fields;
  }
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
      
      // Fetch contacts from Google Sheets
      const contacts = await this.fetchContactsFromSheet();
      console.log('🔍 [SMS SERVICE] Fetched contacts count:', contacts.length);
      
      // Find contact by Resource ID
      const matchingContact = contacts.find(contact => 
        contact.resourceId === resourceId
      );
      
      if (!matchingContact) {
        console.warn('⚠️ [SMS SERVICE] No contact found with Resource ID:', resourceId);
        return false;
      }
      
      console.log('✅ [SMS SERVICE] Found matching contact:', matchingContact);
      
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(matchingContact.contactNumber);
      console.log('📱 [SMS SERVICE] Formatted phone:', formattedPhone);
      
      if (!formattedPhone) {
        console.error('❌ [SMS SERVICE] Invalid phone number for contact:', matchingContact.contactNumber);
        return false;
      }
      
      // Send SMS
      const smsData: SMSNotificationData = {
        mobileNumber: formattedPhone,
        name: matchingContact.name,
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

      const formattedPhone = this.formatPhoneNumber(smsData.mobileNumber);
      
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

      const formattedPhone = this.formatPhoneNumber(smsData.mobileNumber);
      
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
