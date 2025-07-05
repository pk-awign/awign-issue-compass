import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MessageSquare, Users, TestTube, Settings, Send } from 'lucide-react';
import { WhatsAppService, WhatsAppContact, TicketNotificationData } from '@/services/whatsappService';
import { toast } from 'sonner';

export const WhatsAppTestComponent: React.FC = () => {
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionTest, setConnectionTest] = useState<boolean | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [testTicketData, setTestTicketData] = useState<TicketNotificationData>({
    ticketNumber: 'AWG-2025-TEST123',
    centreCode: 'TEST001',
    city: 'Mumbai',
    resourceId: 'TEST123',
    issueCategory: 'Technical Issue',
    issueDescription: 'Test ticket for WhatsApp integration',
    submittedBy: 'Test User',
    submittedAt: new Date(),
    severity: 'sev3',
    ticketLink: 'https://awign-invigilation-escalation.netlify.app/track/AWG-2025-TEST123'
  });

  const [bulkResult, setBulkResult] = useState<{
    total: number;
    sent: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Get unique cities from contacts
  const cities = [...new Set(contacts.map(contact => contact.city))].sort();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const fetchedContacts = await WhatsAppService.fetchContactsFromSheet();
      setContacts(fetchedContacts);
      toast.success(`Fetched ${fetchedContacts.length} contacts from Google Sheet`);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const success = await WhatsAppService.testConnection();
      setConnectionTest(success);
      if (success) {
        toast.success('WhatsApp API connection test successful');
      } else {
        toast.error('WhatsApp API connection test failed');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast.error('Connection test failed');
      setConnectionTest(false);
    } finally {
      setLoading(false);
    }
  };

  const sendBulkNotifications = async () => {
    setLoading(true);
    try {
      const result = await WhatsAppService.sendBulkTicketNotifications(testTicketData);
      setBulkResult(result);
    } catch (error) {
      console.error('Bulk notification error:', error);
      toast.error('Failed to send bulk notifications');
    } finally {
      setLoading(false);
    }
  };

  const sendCitySpecificNotifications = async () => {
    if (!selectedCity) {
      toast.error('Please select a city');
      return;
    }

    setLoading(true);
    try {
      const result = await WhatsAppService.sendCitySpecificNotifications(selectedCity, testTicketData);
      setBulkResult(result);
    } catch (error) {
      console.error('City-specific notification error:', error);
      toast.error('Failed to send city-specific notifications');
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async (contact: WhatsAppContact) => {
    try {
      const success = await WhatsAppService.sendTicketNotification(contact, testTicketData);
      if (success) {
        toast.success(`Test message sent to ${contact.name}`);
      } else {
        toast.error(`Failed to send test message to ${contact.name}`);
      }
    } catch (error) {
      console.error('Test message error:', error);
      toast.error(`Error sending test message to ${contact.name}`);
    }
  };

  const getConfig = () => {
    const config = WhatsAppService.getConfig();
    return config;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            WhatsApp Integration Test
          </CardTitle>
          <CardDescription>
            Test WhatsApp integration with 360dialog API and Google Sheets contact management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>API URL:</strong> {getConfig().API_URL}</div>
                <div><strong>API Key:</strong> {getConfig().API_KEY.substring(0, 8)}...</div>
                <div><strong>Namespace:</strong> {getConfig().NAMESPACE}</div>
                <div><strong>Template:</strong> {getConfig().TEMPLATE_NAME}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Google Sheets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Sheet ID:</strong> {getConfig().googleSheetUrl.split('/')[5]}</div>
                <div><strong>Tab:</strong> testing</div>
                <div><strong>Contacts:</strong> {contacts.length}</div>
                <div><strong>Cities:</strong> {cities.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Connection Test */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={testConnection} 
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
              Test API Connection
            </Button>
            
            {connectionTest !== null && (
              <Badge variant={connectionTest ? "default" : "destructive"}>
                {connectionTest ? "Connected" : "Failed"}
              </Badge>
            )}
          </div>

          {/* Test Ticket Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Test Ticket Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ticketNumber">Ticket Number</Label>
                  <Input
                    id="ticketNumber"
                    value={testTicketData.ticketNumber}
                    onChange={(e) => setTestTicketData(prev => ({ ...prev, ticketNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={testTicketData.city}
                    onChange={(e) => setTestTicketData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="issueCategory">Issue Category</Label>
                  <Input
                    id="issueCategory"
                    value={testTicketData.issueCategory}
                    onChange={(e) => setTestTicketData(prev => ({ ...prev, issueCategory: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="submittedBy">Submitted By</Label>
                  <Input
                    id="submittedBy"
                    value={testTicketData.submittedBy}
                    onChange={(e) => setTestTicketData(prev => ({ ...prev, submittedBy: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="issueDescription">Issue Description</Label>
                <Textarea
                  id="issueDescription"
                  value={testTicketData.issueDescription}
                  onChange={(e) => setTestTicketData(prev => ({ ...prev, issueDescription: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={fetchContacts} 
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Refresh Contacts
            </Button>
            
            <Button 
              onClick={sendBulkNotifications} 
              disabled={loading || contacts.length === 0}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Bulk Notifications
            </Button>
          </div>

          {/* City-Specific Notifications */}
          <div className="flex items-center gap-4">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={sendCitySpecificNotifications} 
              disabled={loading || !selectedCity}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to {selectedCity}
            </Button>
          </div>

          {/* Results */}
          {bulkResult && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <span><strong>Total:</strong> {bulkResult.total}</span>
                    <span><strong>Sent:</strong> {bulkResult.sent}</span>
                    <span><strong>Failed:</strong> {bulkResult.failed}</span>
                  </div>
                  {bulkResult.errors.length > 0 && (
                    <div>
                      <strong>Errors:</strong>
                      <ul className="list-disc list-inside mt-1 text-sm">
                        {bulkResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {bulkResult.errors.length > 5 && (
                          <li>... and {bulkResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contacts from Google Sheet ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found. Click "Refresh Contacts" to fetch from Google Sheet.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {contacts.slice(0, 20).map((contact, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {contact.contactNumber} • {contact.city} • {contact.zone}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{contact.resourceId}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendTestMessage(contact)}
                      disabled={loading}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {contacts.length > 20 && (
                <div className="text-center py-4 text-muted-foreground">
                  Showing first 20 contacts. Total: {contacts.length}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 