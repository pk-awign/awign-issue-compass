import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { SMSService } from '../../services/smsService';
import { toast } from 'sonner';

export const SMSTestComponent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  // Test data for ticket creation SMS
  const [ticketCreationData, setTicketCreationData] = useState({
    mobileNumber: '7060700600',
    name: 'Test User',
    ticketNumber: 'AWG-2024-TEST01',
    ticketLink: 'https://awign-invigilation-escalation.netlify.app/track?id=AWG-2024-TEST01'
  });

  // Test data for ticket update SMS
  const [ticketUpdateData, setTicketUpdateData] = useState({
    mobileNumber: '7060700600',
    name: 'Test User',
    ticketNumber: 'AWG-2024-TEST01',
    ticketLink: 'https://awign-invigilation-escalation.netlify.app/track?id=AWG-2024-TEST01'
  });

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSMSConnection = async () => {
    setIsLoading(true);
    addResult('Testing SMS connection...');
    
    try {
      const result = await SMSService.testSMSConnection();
      if (result) {
        addResult('✅ SMS connection test successful');
        toast.success('SMS connection test successful');
      } else {
        addResult('❌ SMS connection test failed');
        toast.error('SMS connection test failed');
      }
    } catch (error) {
      addResult(`❌ SMS connection test error: ${error.message}`);
      toast.error('SMS connection test error');
    } finally {
      setIsLoading(false);
    }
  };

  const testTicketCreationSMS = async () => {
    setIsLoading(true);
    addResult('Testing ticket creation SMS...');
    
    try {
      const result = await SMSService.sendTicketCreationNotification(ticketCreationData);
      if (result) {
        addResult('✅ Ticket creation SMS sent successfully');
        toast.success('Ticket creation SMS sent successfully');
      } else {
        addResult('❌ Ticket creation SMS failed');
        toast.error('Ticket creation SMS failed');
      }
    } catch (error) {
      addResult(`❌ Ticket creation SMS error: ${error.message}`);
      toast.error('Ticket creation SMS error');
    } finally {
      setIsLoading(false);
    }
  };

  const testTicketUpdateSMS = async () => {
    setIsLoading(true);
    addResult('Testing ticket update SMS...');
    
    try {
      const result = await SMSService.sendTicketUpdateNotification(ticketUpdateData);
      if (result) {
        addResult('✅ Ticket update SMS sent successfully');
        toast.success('Ticket update SMS sent successfully');
      } else {
        addResult('❌ Ticket update SMS failed');
        toast.error('Ticket update SMS failed');
      }
    } catch (error) {
      addResult(`❌ Ticket update SMS error: ${error.message}`);
      toast.error('Ticket update SMS error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SMS Integration Test</CardTitle>
          <CardDescription>
            Test the SMS service integration with Telspiel API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testSMSConnection} 
              disabled={isLoading}
              variant="outline"
            >
              Test SMS Connection
            </Button>
            <Button 
              onClick={clearResults} 
              disabled={isLoading}
              variant="outline"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Creation SMS Test</CardTitle>
          <CardDescription>
            Test sending ticket creation notification via SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="creation-mobile">Mobile Number</Label>
              <Input
                id="creation-mobile"
                value={ticketCreationData.mobileNumber}
                onChange={(e) => setTicketCreationData(prev => ({
                  ...prev,
                  mobileNumber: e.target.value
                }))}
                placeholder="7060700600"
              />
            </div>
            <div>
              <Label htmlFor="creation-name">Name</Label>
              <Input
                id="creation-name"
                value={ticketCreationData.name}
                onChange={(e) => setTicketCreationData(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="Test User"
              />
            </div>
            <div>
              <Label htmlFor="creation-ticket">Ticket Number</Label>
              <Input
                id="creation-ticket"
                value={ticketCreationData.ticketNumber}
                onChange={(e) => setTicketCreationData(prev => ({
                  ...prev,
                  ticketNumber: e.target.value
                }))}
                placeholder="AWG-2024-TEST01"
              />
            </div>
            <div>
              <Label htmlFor="creation-link">Ticket Link</Label>
              <Input
                id="creation-link"
                value={ticketCreationData.ticketLink}
                onChange={(e) => setTicketCreationData(prev => ({
                  ...prev,
                  ticketLink: e.target.value
                }))}
                placeholder="https://awign-invigilation-escalation.netlify.app/track?id=AWG-2024-TEST01"
              />
            </div>
          </div>
          <Button 
            onClick={testTicketCreationSMS} 
            disabled={isLoading}
            className="w-full"
          >
            Send Ticket Creation SMS
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Update SMS Test</CardTitle>
          <CardDescription>
            Test sending ticket update notification via SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="update-mobile">Mobile Number</Label>
              <Input
                id="update-mobile"
                value={ticketUpdateData.mobileNumber}
                onChange={(e) => setTicketUpdateData(prev => ({
                  ...prev,
                  mobileNumber: e.target.value
                }))}
                placeholder="7060700600"
              />
            </div>
            <div>
              <Label htmlFor="update-name">Name</Label>
              <Input
                id="update-name"
                value={ticketUpdateData.name}
                onChange={(e) => setTicketUpdateData(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="Test User"
              />
            </div>
            <div>
              <Label htmlFor="update-ticket">Ticket Number</Label>
              <Input
                id="update-ticket"
                value={ticketUpdateData.ticketNumber}
                onChange={(e) => setTicketUpdateData(prev => ({
                  ...prev,
                  ticketNumber: e.target.value
                }))}
                placeholder="AWG-2024-TEST01"
              />
            </div>
            <div>
              <Label htmlFor="update-link">Ticket Link</Label>
              <Input
                id="update-link"
                value={ticketUpdateData.ticketLink}
                onChange={(e) => setTicketUpdateData(prev => ({
                  ...prev,
                  ticketLink: e.target.value
                }))}
                placeholder="https://awign-invigilation-escalation.netlify.app/track?id=AWG-2024-TEST01"
              />
            </div>
          </div>
          <Button 
            onClick={testTicketUpdateSMS} 
            disabled={isLoading}
            className="w-full"
          >
            Send Ticket Update SMS
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            View the results of SMS tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-muted-foreground">No test results yet. Run a test to see results.</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono bg-muted p-2 rounded">
                  {result}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
