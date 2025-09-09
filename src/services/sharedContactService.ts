// Shared contact service to avoid duplicate Google Sheets parsing
export interface SharedContact {
  resourceId: string;
  name: string;
  contactNumber: string;
  emailId: string;
  zone: string;
  city: string;
}

// Google Sheets Configuration
const GOOGLE_SHEETS_CONFIG = {
  SHEET_ID: '1-FJJ3fLMhMQbZWQ2DRswuC2MPrNP0AhUes1NoWQD-l8',
  TAB_NAME: 'Sheet1', // Default sheet name
  RESOURCE_ID_COLUMN: 'A', // Resource_ID column
  NAME_COLUMN: 'B', // Name column
  CONTACT_COLUMN: 'C' // Contact_Number column
};

export class SharedContactService {
  private static contactsCache: SharedContact[] | null = null;
  private static lastFetchTime: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch contacts from Google Sheets with caching
   */
  static async fetchContactsFromSheet(): Promise<SharedContact[]> {
    // Return cached data if still valid
    const now = Date.now();
    if (this.contactsCache && (now - this.lastFetchTime) < this.CACHE_DURATION) {
      console.log('📋 [SHARED CONTACTS] Using cached contacts:', this.contactsCache.length);
      return this.contactsCache;
    }

    try {
      console.log('🔍 [SHARED CONTACTS] Starting to fetch contacts...');
      console.log('🔍 [SHARED CONTACTS] Sheet ID:', GOOGLE_SHEETS_CONFIG.SHEET_ID);
      console.log('🔍 [SHARED CONTACTS] Tab Name:', GOOGLE_SHEETS_CONFIG.TAB_NAME);
      
      // Try multiple approaches to access the Google Sheet
      let response: Response;
      let url: string;
      
      // Approach 1: Try with API key (if available)
      const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
      if (apiKey) {
        console.log('🔍 [SHARED CONTACTS] Trying with API key...');
        url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.TAB_NAME}!A2:Z?key=${apiKey}`;
        response = await fetch(url);
        
        if (response.ok) {
          console.log('✅ [SHARED CONTACTS] Successfully fetched with API key');
        } else {
          console.log('❌ [SHARED CONTACTS] API key approach failed, trying public access...');
        }
      }
      
      // Approach 2: Try public access (requires sheet to be publicly accessible)
      if (!apiKey || !response?.ok) {
        console.log('🔍 [SHARED CONTACTS] Trying public access...');
        url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.TAB_NAME}!A2:Z`;
        response = await fetch(url);
      }
      
      // Approach 3: Try CSV export (fallback)
      if (!response?.ok) {
        console.log('🔍 [SHARED CONTACTS] Trying CSV export approach...');
        url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${GOOGLE_SHEETS_CONFIG.TAB_NAME}`;
        response = await fetch(url);
      }
      
      // Approach 4: Try direct CSV download (another fallback)
      if (!response?.ok) {
        console.log('🔍 [SHARED CONTACTS] Trying direct CSV download...');
        url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/export?format=csv&gid=0`;
        response = await fetch(url);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.text();
      console.log('📊 [SHARED CONTACTS] Raw data received, length:', data.length);
      
      // Parse CSV data (same approach as WhatsApp service)
      const lines = data.split('\n').filter(line => line.trim());
      console.log('📊 [SHARED CONTACTS] Total lines:', lines.length);
      
      if (lines.length < 2) {
        console.warn('⚠️ [SHARED CONTACTS] No data rows found');
        return [];
      }
      
      // Skip header row and parse data
      const contacts: SharedContact[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Simple CSV parsing (same as WhatsApp service)
        const fields = line.replace(/"/g, '').split(',').map(cell => cell.trim());
        
        if (fields.length >= 6) {
          const contact: SharedContact = {
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
      
      console.log('✅ [SHARED CONTACTS] Successfully parsed contacts:', contacts.length);
      console.log('📋 [SHARED CONTACTS] Sample contacts:', contacts.slice(0, 3));
      
      // Cache the results
      this.contactsCache = contacts;
      this.lastFetchTime = now;
      
      return contacts;
      
    } catch (error) {
      console.error('❌ [SHARED CONTACTS] Error fetching contacts:', error);
      throw error;
    }
  }

  /**
   * Find contact by Resource ID
   */
  static async findContactByResourceId(resourceId: string): Promise<SharedContact | null> {
    try {
      const contacts = await this.fetchContactsFromSheet();
      const matchingContact = contacts.find(contact => 
        contact.resourceId === resourceId
      );
      
      if (matchingContact) {
        console.log('✅ [SHARED CONTACTS] Found contact for Resource ID:', resourceId, matchingContact);
      } else {
        console.log('⚠️ [SHARED CONTACTS] No contact found for Resource ID:', resourceId);
      }
      
      return matchingContact || null;
    } catch (error) {
      console.error('❌ [SHARED CONTACTS] Error finding contact:', error);
      return null;
    }
  }

  /**
   * Format phone number (same logic as both services)
   */
  static formatPhoneNumber(phoneNumber: string): string | null {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.length === 10) {
      // Add country code for 10-digit numbers
      return `91${digits}`;
    } else if (digits.length === 12 && digits.startsWith('91')) {
      // Already has country code
      return digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      // Remove leading 0 and add country code
      return `91${digits.substring(1)}`;
    }
    
    console.warn('⚠️ [SHARED CONTACTS] Invalid phone number format:', phoneNumber);
    return null;
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    this.contactsCache = null;
    this.lastFetchTime = 0;
    console.log('🗑️ [SHARED CONTACTS] Cache cleared');
  }
}
