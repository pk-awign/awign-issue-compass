import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmailService } from '@/services/emailService';
import { toast } from 'sonner';

export const EmailTestComponent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testData, setTestData] = useState({
    ticketNumber: 'TEST-001',
    centreCode: 'CENTRE001',
    city: 'Mumbai',
    resourceId: 'RES001',
    issueCategory: 'TECHNICAL_ISSUE',
    issueDescription: 'This is a test email to verify the data flow from Netlify to EmailJS',
    submittedBy: 'Test User',
    severity: 'sev3'
  });

  const handleTestEmail = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Starting email test...');
      
      // Debug EmailJS configuration
      EmailService.debugEmailJSConfig();
      
      const result = await EmailService.sendTicketCreatedNotification({
        ...testData,
        submittedAt: new Date(),
        attachments: [
          { fileName: 'test-screenshot.png', fileSize: 1024 * 100, fileType: 'image/png' },
          { fileName: 'test-log.txt', fileSize: 1024 * 5, fileType: 'text/plain' }
        ]
      });

      if (result) {
        toast.success('✅ Test email sent successfully! Check console for details.');
        console.log('✅ Email test completed successfully');
      } else {
        toast.error('❌ Test email failed! Check console for details.');
        console.log('❌ Email test failed');
      }
    } catch (error) {
      console.error('❌ Email test error:', error);
      toast.error('❌ Email test error! Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckConfig = () => {
    console.log('🔍 Checking EmailJS configuration...');
    EmailService.debugEmailJSConfig();
    toast.info('Configuration check completed! Check console for details.');
  };

  const handleTestLastTicket = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing email for last ticket...');
      const result = await EmailService.sendEmailForLastTicket();
      
      if (result) {
        toast.success('✅ Last ticket email sent successfully!');
      } else {
        toast.error('❌ Last ticket email failed!');
      }
    } catch (error) {
      console.error('❌ Last ticket email error:', error);
      toast.error('❌ Last ticket email error!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Email Data Flow Test</CardTitle>
        <CardDescription>
          Test the email communication flow from Netlify to EmailJS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ticketNumber">Ticket Number</Label>
            <Input
              id="ticketNumber"
              value={testData.ticketNumber}
              onChange={(e) => setTestData(prev => ({ ...prev, ticketNumber: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="centreCode">Centre Code</Label>
            <Input
              id="centreCode"
              value={testData.centreCode}
              onChange={(e) => setTestData(prev => ({ ...prev, centreCode: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={testData.city}
              onChange={(e) => setTestData(prev => ({ ...prev, city: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="resourceId">Resource ID</Label>
            <Input
              id="resourceId"
              value={testData.resourceId}
              onChange={(e) => setTestData(prev => ({ ...prev, resourceId: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="issueCategory">Issue Category</Label>
            <Input
              id="issueCategory"
              value={testData.issueCategory}
              onChange={(e) => setTestData(prev => ({ ...prev, issueCategory: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="severity">Severity</Label>
            <Input
              id="severity"
              value={testData.severity}
              onChange={(e) => setTestData(prev => ({ ...prev, severity: e.target.value }))}
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="submittedBy">Submitted By</Label>
          <Input
            id="submittedBy"
            value={testData.submittedBy}
            onChange={(e) => setTestData(prev => ({ ...prev, submittedBy: e.target.value }))}
          />
        </div>
        
        <div>
          <Label htmlFor="issueDescription">Issue Description</Label>
          <Textarea
            id="issueDescription"
            value={testData.issueDescription}
            onChange={(e) => setTestData(prev => ({ ...prev, issueDescription: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleCheckConfig} 
            variant="outline"
            className="flex-1"
          >
            🔍 Check Config
          </Button>
          <Button 
            onClick={handleTestEmail} 
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? '📧 Sending...' : '📧 Send Test Email'}
          </Button>
          <Button 
            onClick={handleTestLastTicket} 
            disabled={isLoading}
            variant="secondary"
            className="flex-1"
          >
            {isLoading ? '📧 Sending...' : '📧 Test Last Ticket'}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>💡 Check the browser console for detailed debug information</p>
          <p>📧 Emails will be sent to: issue_management@awign.com</p>
        </div>
      </CardContent>
    </Card>
  );
}; 