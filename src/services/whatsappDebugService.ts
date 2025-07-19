
import { WhatsAppService } from './whatsappService';
import { toast } from 'sonner';

export class WhatsAppDebugService {
  /**
   * Comprehensive WhatsApp system debug
   */
  static async debugWhatsAppSystem(): Promise<{
    success: boolean;
    results: any[];
    summary: string;
  }> {
    console.log('🔍 [DEBUG] Starting comprehensive WhatsApp system debug...');
    
    const results: any[] = [];
    let overallSuccess = true;

    try {
      // 1. Test environment variables
      console.log('🔍 [DEBUG] Step 1: Checking environment variables...');
      const envCheck = this.checkEnvironmentVariables();
      results.push({
        step: 'Environment Variables',
        success: envCheck.success,
        details: envCheck.details,
        issues: envCheck.issues
      });
      if (!envCheck.success) overallSuccess = false;

      // 2. Test Google Sheets access
      console.log('🔍 [DEBUG] Step 2: Testing Google Sheets access...');
      const sheetsCheck = await this.testGoogleSheetsAccess();
      results.push({
        step: 'Google Sheets Access',
        success: sheetsCheck.success,
        details: sheetsCheck.details,
        contacts: sheetsCheck.contacts?.slice(0, 3) // Show first 3 contacts
      });
      if (!sheetsCheck.success) overallSuccess = false;

      // 3. Test WhatsApp API connection
      console.log('🔍 [DEBUG] Step 3: Testing WhatsApp API connection...');
      const apiCheck = await this.testWhatsAppAPI();
      results.push({
        step: 'WhatsApp API Connection',
        success: apiCheck.success,
        details: apiCheck.details
      });
      if (!apiCheck.success) overallSuccess = false;

      // 4. Test Netlify function
      console.log('🔍 [DEBUG] Step 4: Testing Netlify function...');
      const netlifyCheck = await this.testNetlifyFunction();
      results.push({
        step: 'Netlify Function',
        success: netlifyCheck.success,
        details: netlifyCheck.details
      });
      if (!netlifyCheck.success) overallSuccess = false;

      const summary = overallSuccess 
        ? '✅ All WhatsApp components are working correctly'
        : '❌ Some WhatsApp components have issues - check details above';

      console.log('🔍 [DEBUG] Debug complete:', { overallSuccess, summary });
      
      return {
        success: overallSuccess,
        results,
        summary
      };

    } catch (error) {
      console.error('❌ [DEBUG] Debug process failed:', error);
      return {
        success: false,
        results: [...results, {
          step: 'Debug Process',
          success: false,
          details: `Debug failed: ${error}`
        }],
        summary: '❌ Debug process encountered an error'
      };
    }
  }

  /**
   * Check environment variables
   */
  private static checkEnvironmentVariables(): {
    success: boolean;
    details: string;
    issues: string[];
  } {
    const issues: string[] = [];
    const checks = {
      isDevelopment: import.meta.env.DEV,
      hasGoogleApiKey: !!import.meta.env.VITE_GOOGLE_SHEETS_API_KEY,
      googleApiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY?.substring(0, 10) + '...' || 'Not set'
    };

    console.log('🔍 [ENV CHECK]', checks);

    if (!checks.hasGoogleApiKey) {
      issues.push('Google Sheets API key not configured (VITE_GOOGLE_SHEETS_API_KEY)');
    }

    if (checks.isDevelopment) {
      issues.push('Running in development mode - some features may be simulated');
    }

    const success = issues.length === 0;
    const details = success 
      ? 'All required environment variables are configured'
      : `Found ${issues.length} configuration issues`;

    return { success, details, issues };
  }

  /**
   * Test Google Sheets access
   */
  private static async testGoogleSheetsAccess(): Promise<{
    success: boolean;
    details: string;
    contacts?: any[];
  }> {
    try {
      console.log('🔍 [SHEETS TEST] Fetching contacts from Google Sheets...');
      const contacts = await WhatsAppService.fetchContactsFromSheet();
      
      const success = contacts.length > 0;
      const details = success 
        ? `Successfully fetched ${contacts.length} contacts from Google Sheets`
        : 'No contacts found in Google Sheets or access failed';

      console.log('🔍 [SHEETS TEST] Result:', { success, contactCount: contacts.length });

      return {
        success,
        details,
        contacts
      };
    } catch (error) {
      console.error('❌ [SHEETS TEST] Failed:', error);
      return {
        success: false,
        details: `Google Sheets access failed: ${error}`
      };
    }
  }

  /**
   * Test WhatsApp API connection
   */
  private static async testWhatsAppAPI(): Promise<{
    success: boolean;
    details: string;
  }> {
    try {
      console.log('🔍 [API TEST] Testing WhatsApp API connection...');
      const success = await WhatsAppService.testConnection();
      
      const details = success 
        ? 'WhatsApp API connection successful'
        : 'WhatsApp API connection failed';

      console.log('🔍 [API TEST] Result:', { success });

      return { success, details };
    } catch (error) {
      console.error('❌ [API TEST] Failed:', error);
      return {
        success: false,
        details: `WhatsApp API test failed: ${error}`
      };
    }
  }

  /**
   * Test Netlify function
   */
  private static async testNetlifyFunction(): Promise<{
    success: boolean;
    details: string;
  }> {
    try {
      console.log('🔍 [NETLIFY TEST] Testing Netlify function...');
      
      const response = await fetch('/.netlify/functions/whatsapp-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'testConnection'
        }),
      });

      const success = response.ok;
      const result = await response.json();
      
      const details = success 
        ? 'Netlify function is working correctly'
        : `Netlify function error: ${result.error || 'Unknown error'}`;

      console.log('🔍 [NETLIFY TEST] Result:', { success, status: response.status });

      return { success, details };
    } catch (error) {
      console.error('❌ [NETLIFY TEST] Failed:', error);
      return {
        success: false,
        details: `Netlify function test failed: ${error}`
      };
    }
  }

  /**
   * Test specific resource ID lookup
   */
  static async testResourceIdLookup(resourceId: string): Promise<{
    success: boolean;
    contact?: any;
    details: string;
  }> {
    try {
      console.log(`🔍 [RESOURCE TEST] Looking up Resource ID: ${resourceId}`);
      
      const contacts = await WhatsAppService.fetchContactsFromSheet();
      const matchingContact = contacts.find(contact => 
        contact.resourceId === resourceId
      );

      const success = !!matchingContact;
      const details = success 
        ? `Found contact: ${matchingContact.name} (${matchingContact.contactNumber})`
        : `No contact found with Resource ID: ${resourceId}`;

      console.log('🔍 [RESOURCE TEST] Result:', { success, contact: matchingContact });

      return {
        success,
        contact: matchingContact,
        details
      };
    } catch (error) {
      console.error('❌ [RESOURCE TEST] Failed:', error);
      return {
        success: false,
        details: `Resource ID lookup failed: ${error}`
      };
    }
  }

  /**
   * Send test WhatsApp message
   */
  static async sendTestMessage(phoneNumber: string, testData?: any): Promise<{
    success: boolean;
    details: string;
  }> {
    try {
      console.log(`🔍 [MESSAGE TEST] Sending test message to: ${phoneNumber}`);
      
      const ticketData = testData || {
        ticketNumber: 'TEST-' + Date.now(),
        submittedBy: 'Debug Test User',
        ticketLink: `${window.location.origin}/track/TEST-${Date.now()}`
      };

      const success = await WhatsAppService.sendTicketCreationNotification(
        ticketData,
        phoneNumber
      );

      const details = success 
        ? `Test message sent successfully to ${phoneNumber}`
        : `Failed to send test message to ${phoneNumber}`;

      console.log('🔍 [MESSAGE TEST] Result:', { success });

      return { success, details };
    } catch (error) {
      console.error('❌ [MESSAGE TEST] Failed:', error);
      return {
        success: false,
        details: `Test message failed: ${error}`
      };
    }
  }
}
