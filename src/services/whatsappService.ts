import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

// WhatsApp API Configuration
const WHATSAPP_CONFIG = {
  API_URL: 'https://waba-v2.360dialog.io/messages',
  API_KEY: 'oa6EI0d9qZ4Pm1EKTYrLmHNrAK', // Test API key - replace with production key later
  NAMESPACE: '9f732540_5143_4e51_bfc2_36cab955cd7f', // Test namespace - replace with production namespace later
  TEMPLATE_NAME: 'myl_supply_initial_1' // Test template - replace with production template later
};

// Google Sheets Configuration
const GOOGLE_SHEETS_CONFIG = {
  SHEET_ID: '1EgLc8pwc8j1AmR3rFMe73LCOSdRKBsTBjO74ytamqwU',
  TAB_NAME: 'Complete Data',
  CONTACT_COLUMN: 'A', // Contact_Number column
  NAME_COLUMN: 'E', // Name column
  ZONE_COLUMN: 'B', // Zone column
  CITY_COLUMN: 'C', // Exam_City column
  RESOURCE_ID_COLUMN: 'D' // Resource_ID column
};

export interface WhatsAppContact {
  contactNumber: string;
  name: string;
  zone: string;
  city: string;
  resourceId: string;
}

export interface WhatsAppMessageData {
  to: string;
  type: 'template';
  messaging_product: 'whatsapp';
  template: {
    namespace: string;
    language: {
      policy: 'deterministic';
      code: 'en';
    };
    name: string;
    components: Array<{
      type: 'body';
      parameters: Array<{
        type: 'text';
        text: string;
      }>;
    }>;
  };
}

export interface TicketNotificationData {
  ticketNumber: string;
  centreCode: string;
  city: string;
  resourceId: string;
  issueCategory: string;
  issueDescription: string;
  submittedBy: string;
  submittedAt: Date;
  severity: string;
  ticketLink: string;
}

export class WhatsAppService {
  /**
   * Fetch contacts from Google Sheets
   */
  static async fetchContactsFromSheet(): Promise<WhatsAppContact[]> {
    try {
      // Using Google Sheets API v4
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.TAB_NAME}!A2:Z`;
      
      // Note: In production, you'll need to implement proper Google Sheets API authentication
      // For now, we'll use a simplified approach that requires the sheet to be publicly accessible
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
      }

      const data = await response.json();
      const rows = data.values || [];

      return rows
        .filter((row: any[]) => row.length >= 5) // Ensure we have enough columns
        .map((row: any[]) => ({
          contactNumber: row[0]?.toString() || '', // Contact_Number
          name: row[4]?.toString() || '', // Name
          zone: row[1]?.toString() || '', // Zone
          city: row[2]?.toString() || '', // Exam_City
          resourceId: row[3]?.toString() || '' // Resource_ID
        }))
        .filter((contact: WhatsAppContact) => 
          contact.contactNumber && 
          contact.contactNumber.length >= 10 &&
          contact.name.trim() !== ''
        );

    } catch (error) {
      console.error('Error fetching contacts from Google Sheet:', error);
      toast.error('Failed to fetch contacts from Google Sheet');
      return [];
    }
  }

  /**
   * Send WhatsApp message using 360dialog API
   */
  static async sendWhatsAppMessage(messageData: WhatsAppMessageData): Promise<boolean> {
    try {
      const response = await fetch(WHATSAPP_CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'D360-API-KEY': WHATSAPP_CONFIG.API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('WhatsApp API Error:', response.status, errorData);
        throw new Error(`WhatsApp API Error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('WhatsApp message sent successfully:', result);
      return true;

    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast.error('Failed to send WhatsApp message');
      return false;
    }
  }

  /**
   * Send ticket notification to specific contact
   */
  static async sendTicketNotification(
    contact: WhatsAppContact, 
    ticketData: TicketNotificationData
  ): Promise<boolean> {
    try {
      // Format phone number (remove any non-digit characters and ensure it starts with country code)
      const formattedPhone = this.formatPhoneNumber(contact.contactNumber);
      
      if (!formattedPhone) {
        console.error('Invalid phone number:', contact.contactNumber);
        return false;
      }

      const messageData: WhatsAppMessageData = {
        to: formattedPhone,
        type: 'template',
        messaging_product: 'whatsapp',
        template: {
          namespace: WHATSAPP_CONFIG.NAMESPACE,
          language: {
            policy: 'deterministic',
            code: 'en'
          },
          name: WHATSAPP_CONFIG.TEMPLATE_NAME,
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: contact.name
                },
                {
                  type: 'text',
                  text: ticketData.submittedBy
                },
                {
                  type: 'text',
                  text: `Ticket ${ticketData.ticketNumber} - ${ticketData.issueCategory}`
                },
                {
                  type: 'text',
                  text: ticketData.ticketLink
                }
              ]
            }
          ]
        }
      };

      return await this.sendWhatsAppMessage(messageData);

    } catch (error) {
      console.error('Error sending ticket notification:', error);
      return false;
    }
  }

  /**
   * Send bulk ticket notifications to all contacts
   */
  static async sendBulkTicketNotifications(ticketData: TicketNotificationData): Promise<{
    total: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const contacts = await this.fetchContactsFromSheet();
      
      if (contacts.length === 0) {
        toast.error('No contacts found in Google Sheet');
        return { total: 0, sent: 0, failed: 0, errors: ['No contacts found'] };
      }

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      // Send messages with a small delay to avoid rate limiting
      for (const contact of contacts) {
        try {
          const success = await this.sendTicketNotification(contact, ticketData);
          if (success) {
            sent++;
          } else {
            failed++;
            errors.push(`Failed to send to ${contact.name} (${contact.contactNumber})`);
          }
          
          // Add delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          failed++;
          errors.push(`Error sending to ${contact.name}: ${error}`);
        }
      }

      const result = { total: contacts.length, sent, failed, errors };
      
      // Show summary toast
      if (sent > 0) {
        toast.success(`WhatsApp notifications sent: ${sent}/${contacts.length} successful`);
      }
      if (failed > 0) {
        toast.error(`Failed to send ${failed} notifications. Check console for details.`);
      }

      return result;

    } catch (error) {
      console.error('Error in bulk notification:', error);
      toast.error('Failed to send bulk notifications');
      return { total: 0, sent: 0, failed: 1, errors: [error.toString()] };
    }
  }

  /**
   * Send notification to contacts in specific city
   */
  static async sendCitySpecificNotifications(
    city: string, 
    ticketData: TicketNotificationData
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    try {
      const allContacts = await this.fetchContactsFromSheet();
      const cityContacts = allContacts.filter(contact => 
        contact.city.toLowerCase() === city.toLowerCase()
      );

      if (cityContacts.length === 0) {
        toast.error(`No contacts found for city: ${city}`);
        return { total: 0, sent: 0, failed: 0, errors: [`No contacts found for ${city}`] };
      }

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const contact of cityContacts) {
        try {
          const success = await this.sendTicketNotification(contact, ticketData);
          if (success) {
            sent++;
          } else {
            failed++;
            errors.push(`Failed to send to ${contact.name} (${contact.contactNumber})`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          failed++;
          errors.push(`Error sending to ${contact.name}: ${error}`);
        }
      }

      const result = { total: cityContacts.length, sent, failed, errors };
      
      if (sent > 0) {
        toast.success(`WhatsApp notifications sent to ${city}: ${sent}/${cityContacts.length} successful`);
      }
      if (failed > 0) {
        toast.error(`Failed to send ${failed} notifications to ${city}. Check console for details.`);
      }

      return result;

    } catch (error) {
      console.error('Error in city-specific notification:', error);
      toast.error(`Failed to send notifications to ${city}`);
      return { total: 0, sent: 0, failed: 1, errors: [error.toString()] };
    }
  }

  /**
   * Format phone number for WhatsApp API
   */
  private static formatPhoneNumber(phoneNumber: string): string | null {
    try {
      // Remove all non-digit characters
      const digits = phoneNumber.replace(/\D/g, '');
      
      // If it's a 10-digit Indian number, add +91
      if (digits.length === 10) {
        return `91${digits}`;
      }
      
      // If it already has country code (11+ digits), return as is
      if (digits.length >= 11) {
        return digits;
      }
      
      // If it's less than 10 digits, it's invalid
      return null;
      
    } catch (error) {
      console.error('Error formatting phone number:', error);
      return null;
    }
  }

  /**
   * Test WhatsApp API connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      // Send a test message to a dummy number
      const testMessage: WhatsAppMessageData = {
        to: '919999999999', // Dummy number for testing
        type: 'template',
        messaging_product: 'whatsapp',
        template: {
          namespace: WHATSAPP_CONFIG.NAMESPACE,
          language: {
            policy: 'deterministic',
            code: 'en'
          },
          name: WHATSAPP_CONFIG.TEMPLATE_NAME,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'Test' },
                { type: 'text', text: 'Test' },
                { type: 'text', text: 'Test' },
                { type: 'text', text: 'https://example.com' }
              ]
            }
          ]
        }
      };

      const response = await fetch(WHATSAPP_CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'D360-API-KEY': WHATSAPP_CONFIG.API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      });

      // Even if it fails due to invalid number, if we get a proper API response, the connection is working
      const result = await response.json();
      
      if (response.ok) {
        console.log('WhatsApp API connection test successful');
        return true;
      } else {
        // Check if it's just an invalid number error (which means API is working)
        if (result.error?.code === 'invalid_phone_number') {
          console.log('WhatsApp API connection test successful (invalid number expected)');
          return true;
        }
        throw new Error(`API Error: ${result.error?.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('WhatsApp API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get WhatsApp configuration (for admin panel)
   */
  static getConfig() {
    return {
      ...WHATSAPP_CONFIG,
      googleSheetUrl: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/edit#gid=1021776551`
    };
  }

  /**
   * Update WhatsApp configuration (for admin panel)
   */
  static updateConfig(newConfig: Partial<typeof WHATSAPP_CONFIG>) {
    Object.assign(WHATSAPP_CONFIG, newConfig);
    console.log('WhatsApp configuration updated:', WHATSAPP_CONFIG);
  }
} 