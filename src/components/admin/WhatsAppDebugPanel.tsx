
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WhatsAppDebugService } from '@/services/whatsappDebugService';
import { WhatsAppService } from '@/services/whatsappService';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Settings, 
  TestTube, 
  Search, 
  Phone,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';

export const WhatsAppDebugPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const [testResourceId, setTestResourceId] = useState('');
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [resourceLookupResult, setResourceLookupResult] = useState<any>(null);

  const handleFullSystemDebug = async () => {
    setIsLoading(true);
    try {
      console.log('🔧 [DEBUG PANEL] Starting full system debug...');
      const results = await WhatsAppDebugService.debugWhatsAppSystem();
      setDebugResults(results);
      
      if (results.success) {
        toast.success('System debug completed - all components working!');
      } else {
        toast.error('System debug found issues - check results below');
      }
    } catch (error) {
      console.error('❌ [DEBUG PANEL] System debug failed:', error);
      toast.error(`Debug failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResourceIdTest = async () => {
    if (!testResourceId.trim()) {
      toast.error('Please enter a Resource ID to test');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔧 [DEBUG PANEL] Testing Resource ID lookup:', testResourceId);
      const result = await WhatsAppDebugService.testResourceIdLookup(testResourceId.trim());
      setResourceLookupResult(result);
      
      if (result.success) {
        toast.success(`Resource ID found: ${result.contact?.name}`);
      } else {
        toast.warning(result.details);
      }
    } catch (error) {
      console.error('❌ [DEBUG PANEL] Resource ID test failed:', error);
      toast.error(`Resource ID test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error('Please enter a phone number to test');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔧 [DEBUG PANEL] Sending test message to:', testPhoneNumber);
      const result = await WhatsAppDebugService.sendTestMessage(testPhoneNumber.trim());
      
      if (result.success) {
        toast.success(result.details);
      } else {
        toast.error(result.details);
      }
    } catch (error) {
      console.error('❌ [DEBUG PANEL] Test message failed:', error);
      toast.error(`Test message failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestApiConnection = async () => {
    setIsLoading(true);
    try {
      console.log('🔧 [DEBUG PANEL] Testing WhatsApp API connection...');
      const success = await WhatsAppService.testConnection();
      
      if (success) {
        toast.success('WhatsApp API connection successful!');
      } else {
        toast.error('WhatsApp API connection failed');
      }
    } catch (error) {
      console.error('❌ [DEBUG PANEL] API connection test failed:', error);
      toast.error(`API connection test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Working
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        Issues
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          WhatsApp Debug Panel
        </CardTitle>
        <CardDescription>
          Debug and test WhatsApp integration components
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="system">System Check</TabsTrigger>
            <TabsTrigger value="lookup">Resource Lookup</TabsTrigger>
            <TabsTrigger value="test">Send Test</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Full System Debug</h3>
                <p className="text-sm text-muted-foreground">
                  Check all WhatsApp integration components
                </p>
              </div>
              <Button 
                onClick={handleFullSystemDebug} 
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Run Full Debug
              </Button>
            </div>

            {debugResults && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {getStatusBadge(debugResults.success)}
                  <span className="text-sm font-medium">{debugResults.summary}</span>
                </div>

                <div className="space-y-3">
                  {debugResults.results.map((result: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{result.step}</span>
                        {getStatusBadge(result.success)}
                      </div>
                      <p className="text-sm text-muted-foreground">{result.details}</p>
                      
                      {result.issues && result.issues.length > 0 && (
                        <ul className="text-sm text-red-600 mt-2 ml-4 list-disc">
                          {result.issues.map((issue: string, i: number) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      )}
                      
                      {result.contacts && (
                        <div className="text-sm text-green-600 mt-2">
                          Sample contacts: {result.contacts.map((c: any) => 
                            `${c.name} (${c.resourceId})`
                          ).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="lookup" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Resource ID Lookup Test</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Test if a specific Resource ID can be found in Google Sheets
              </p>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="resourceId">Resource ID</Label>
                  <Input
                    id="resourceId"
                    value={testResourceId}
                    onChange={(e) => setTestResourceId(e.target.value)}
                    placeholder="Enter Resource ID to test (e.g., 35236)"
                  />
                </div>
                
                <Button 
                  onClick={handleResourceIdTest} 
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Test Lookup
                </Button>
              </div>

              {resourceLookupResult && (
                <div className="mt-4 border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(resourceLookupResult.success)}
                    <span className="font-medium">Lookup Result</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{resourceLookupResult.details}</p>
                  
                  {resourceLookupResult.contact && (
                    <div className="mt-2 text-sm">
                      <strong>Contact Found:</strong>
                      <ul className="ml-4 mt-1">
                        <li>Name: {resourceLookupResult.contact.name}</li>
                        <li>Resource ID: {resourceLookupResult.contact.resourceId}</li>
                        <li>Phone: {resourceLookupResult.contact.contactNumber}</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Send Test Message</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Send a test WhatsApp message to verify the API is working
              </p>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="Enter phone number (e.g., 919999999999)"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleTestMessage} 
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )}
                    Send Test Message
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleTestApiConnection} 
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                    Test API Only
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Configuration Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Current WhatsApp and Google Sheets configuration
              </p>
              
              <div className="space-y-4">
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2">WhatsApp API</h4>
                  <div className="text-sm space-y-1">
                    <div>Template: ticke_raised_test</div>
                    <div>Namespace: 74a67158_77ff_47a7_a86e_3b004a21d236</div>
                    <div>API Key: mOxReS*** (configured)</div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2">Google Sheets</h4>
                  <div className="text-sm space-y-1">
                    <div>Sheet ID: 1-FJJ3fLMhMQbZWQ2DRswuC2MPrNP0AhUes1NoWQD-l8</div>
                    <div>Tab: Sheet1</div>
                    <div>API Key: {import.meta.env.VITE_GOOGLE_SHEETS_API_KEY ? 'Configured' : 'Not configured'}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <ExternalLink className="w-3 h-3" />
                      <a 
                        href="https://docs.google.com/spreadsheets/d/1-FJJ3fLMhMQbZWQ2DRswuC2MPrNP0AhUes1NoWQD-l8/edit" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Google Sheet
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2">Environment</h4>
                  <div className="text-sm space-y-1">
                    <div>Mode: {import.meta.env.DEV ? 'Development' : 'Production'}</div>
                    <div>Netlify Functions: {window.location.hostname.includes('netlify') ? 'Available' : 'Local/Not Available'}</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
