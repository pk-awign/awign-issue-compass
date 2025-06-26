import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Upload, FileText, Users, Copy, AlertCircle, Ticket, ExternalLink, LogOut, Download, MessageCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Issue } from '@/types/issue';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TicketTracker } from './TicketTracker';
import { generateTicketFile, generateWhatsAppMessage } from '@/utils/ticketDownload';

interface PublicIssueFormProps {
  onSubmit: (issue: Omit<Issue, 'id' | 'ticketNumber' | 'severity' | 'status' | 'submittedAt' | 'comments'>) => Promise<string>;
  onAdminLogin: () => void;
  defaultTab?: string;
  searchTerm?: string;
}

export const PublicIssueForm: React.FC<PublicIssueFormProps> = ({ 
  onSubmit, 
  onAdminLogin, 
  defaultTab = "report",
  searchTerm = ""
}) => {
  const { user, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [trackSearchTerm, setTrackSearchTerm] = useState(searchTerm);
  
  const [formData, setFormData] = useState({
    centreCode: '',
    city: '',
    resourceId: '',
    issueCategory: '' as Issue['issueCategory'] | '',
    issueDescription: '',
    dateType: 'single' as 'single' | 'range' | 'multiple' | 'ongoing',
    singleDate: undefined as Date | undefined,
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    multipleDates: [] as Date[],
    isAnonymous: false,
    submittedBy: ''
  });

  const [files, setFiles] = useState<File[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [ticketInfo, setTicketInfo] = useState({ ticketNumber: '', trackingLink: '' });
  const [submittedIssueData, setSubmittedIssueData] = useState<any>(null);

  // Pre-fill user data when logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        centreCode: user.centreCode || '',
        city: user.city || '',
        submittedBy: user.name || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    setTrackSearchTerm(searchTerm);
  }, [searchTerm]);

  const issueCategories = [
    { value: 'payment_delay', label: 'Payment Delay' },
    { value: 'partial_payment', label: 'Reduced/Partial Payment' },
    { value: 'behavioral_complaint', label: 'Behavioral Complaint' },
    { value: 'improvement_request', label: 'Improvement Request' },
    { value: 'other', label: 'Other Issue' }
  ];

  const cities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'
  ];

  const generateTicketNumber = () => {
    const prefix = 'AIM';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleMultipleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setFormData(prev => {
      const newDates = prev.multipleDates.includes(date)
        ? prev.multipleDates.filter(d => d.getTime() !== date.getTime())
        : [...prev.multipleDates, date];
      return { ...prev, multipleDates: newDates };
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleDownloadTicket = async () => {
    if (submittedIssueData && ticketInfo.ticketNumber) {
      try {
        await generateTicketFile(ticketInfo, submittedIssueData);
        toast.success('PDF ticket downloaded successfully!');
      } catch (error) {
        toast.error('Failed to download ticket');
      }
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = generateWhatsAppMessage(ticketInfo.ticketNumber, ticketInfo.trackingLink);
    window.open(whatsappUrl, '_blank');
  };

  const handleTrackIssues = () => {
    setShowSuccessDialog(false);
    setActiveTab('track');
    setTrackSearchTerm(ticketInfo.ticketNumber);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Updated validation logic
    if (!formData.centreCode || !formData.city || !formData.issueCategory || !formData.issueDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate name for non-anonymous reports
    if (!formData.isAnonymous && !formData.submittedBy) {
      toast.error('Name is required for non-anonymous reports');
      return;
    }

    let dates: Date[] = [];
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (formData.dateType === 'single' && formData.singleDate) {
      dates = [formData.singleDate];
    } else if (formData.dateType === 'range') {
      startDate = formData.startDate;
      endDate = formData.endDate;
    } else if (formData.dateType === 'multiple') {
      dates = formData.multipleDates;
    }

    const issueData = {
      centreCode: formData.centreCode,
      city: formData.city,
      resourceId: formData.resourceId || undefined,
      issueCategory: formData.issueCategory as Issue['issueCategory'],
      issueDescription: formData.issueDescription,
      issueEvidence: files.length > 0 ? files : undefined,
      issueDate: {
        type: formData.dateType,
        dates,
        startDate,
        endDate
      },
      isAnonymous: formData.isAnonymous,
      submittedBy: formData.isAnonymous ? undefined : formData.submittedBy
    };

    try {
      const ticketNumber = await onSubmit(issueData);
      const trackingLink = `${window.location.origin}/track/${ticketNumber}`;
      
      // Store submitted data for download
      setSubmittedIssueData(issueData);
      
      // Set ticket info and show success dialog
      setTicketInfo({ ticketNumber, trackingLink });
      setShowSuccessDialog(true);
      
      // Auto-download PDF ticket
      setTimeout(async () => {
        try {
          await generateTicketFile({ ticketNumber, trackingLink }, issueData);
        } catch (error) {
          console.error('Auto-download failed:', error);
        }
      }, 500);
      
      // Reset form
      setFormData({
        centreCode: user?.centreCode || '',
        city: user?.city || '',
        resourceId: '',
        issueCategory: '',
        issueDescription: '',
        dateType: 'single',
        singleDate: undefined,
        startDate: undefined,
        endDate: undefined,
        multipleDates: [],
        isAnonymous: false,
        submittedBy: user?.name || ''
      });
      setFiles([]);
    } catch (error) {
      toast.error('Failed to submit issue. Please try again.');
      console.error('Issue submission error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gray-800 p-1 rounded">
                <img 
                  src="/awign-logo.svg" 
                  alt="Awign Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Awign Issue Management</h1>
                <p className="text-sm text-gray-600">TCS Examination Operations Portal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-600">{user.city} - {user.centreCode}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-gray-600">Invigilator</span>
                  <Button variant="outline" size="sm" onClick={onAdminLogin}>
                    <Users className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="report">Report Issue</TabsTrigger>
            <TabsTrigger value="track">Track Tickets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="report">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Report New Issue
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Submit an issue report for examination operations. You'll receive a unique ticket ID to track your issue.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Anonymous Checkbox - hide when logged in */}
                {!user && (
                  <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
                    <Checkbox 
                      id="anonymous" 
                      checked={formData.isAnonymous}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAnonymous: checked as boolean }))}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="anonymous" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Report this issue anonymously
                      </Label>
                      <p className="text-xs text-gray-600">
                        Anonymous reports get unique tracking links
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name and Resource ID - side by side, only show if not anonymous */}
                  {!formData.isAnonymous && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="submittedBy" className="text-sm font-medium">Your Name *</Label>
                        <Input
                          id="submittedBy"
                          value={formData.submittedBy}
                          onChange={(e) => setFormData(prev => ({ ...prev, submittedBy: e.target.value }))}
                          placeholder="Enter your name"
                          className="mt-2"
                          required={!formData.isAnonymous}
                          disabled={!!user?.name}
                        />
                      </div>
                      <div>
                        <Label htmlFor="resourceId" className="text-sm font-medium">Resource ID (Optional)</Label>
                        <Input
                          id="resourceId"
                          value={formData.resourceId}
                          onChange={(e) => setFormData(prev => ({ ...prev, resourceId: e.target.value }))}
                          placeholder="Enter Resource ID if applicable"
                          className="mt-2"
                        />
                      </div>
                    </div>
                  )}

                  {/* Issue Type */}
                  <div>
                    <Label className="text-sm font-medium">Issue Type *</Label>
                    <Select value={formData.issueCategory} onValueChange={(value) => setFormData(prev => ({ ...prev, issueCategory: value as Issue['issueCategory'] }))}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                      <SelectContent>
                        {issueCategories.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Centre Code and City */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="centreCode" className="text-sm font-medium">Centre Code *</Label>
                      <Input
                        id="centreCode"
                        value={formData.centreCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, centreCode: e.target.value }))}
                        placeholder="e.g., TCS-MUM-001"
                        className="mt-2"
                        required
                        disabled={!!user?.centreCode}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">City *</Label>
                      <Select 
                        value={formData.city} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                        disabled={!!user?.city}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map(city => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Issue Date */}
                  <div>
                    <Label className="text-sm font-medium">Issue Date *</Label>
                    <RadioGroup 
                      value={formData.dateType} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, dateType: value as 'single' | 'range' | 'multiple' | 'ongoing' }))}
                      className="flex flex-wrap gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="single" />
                        <Label htmlFor="single">Single Date</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="range" id="range" />
                        <Label htmlFor="range">Date Range</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="multiple" id="multiple" />
                        <Label htmlFor="multiple">Multiple Dates</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ongoing" id="ongoing" />
                        <Label htmlFor="ongoing">Ongoing</Label>
                      </div>
                    </RadioGroup>

                    {/* Ongoing Alert - properly centered content */}
                    {formData.dateType === 'ongoing' && (
                      <div className="mt-3">
                        <Alert className="border-orange-200 bg-orange-50 h-10 flex items-center justify-start p-0">
                          <div className="flex items-center h-full w-full px-4">
                            <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                            <AlertDescription className="text-orange-800 text-sm ml-2 leading-none">
                              This issue is ongoing and requires immediate attention.
                            </AlertDescription>
                          </div>
                        </Alert>
                      </div>
                    )}

                    {/* Date pickers */}
                    {formData.dateType === 'single' && (
                      <div className="mt-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.singleDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.singleDate ? format(formData.singleDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.singleDate}
                              onSelect={(date) => setFormData(prev => ({ ...prev, singleDate: date }))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                              disabled={(date) => date > new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {formData.dateType === 'range' && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.startDate ? format(formData.startDate, "PPP") : "Start date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.startDate}
                              onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                              disabled={(date) => date > new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.endDate ? format(formData.endDate, "PPP") : "End date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.endDate}
                              onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                              disabled={(date) => date > new Date() || (formData.startDate && date < formData.startDate)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {formData.dateType === 'multiple' && (
                      <div className="mt-3 space-y-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              Select multiple dates
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              onSelect={handleMultipleDateSelect}
                              initialFocus
                              className="p-3 pointer-events-auto"
                              disabled={(date) => date > new Date()}
                            />
                          </PopoverContent>
                        </Popover>
                        {formData.multipleDates.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.multipleDates.map((date, index) => (
                              <div key={index} className="bg-blue-100 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                {format(date, "MMM dd, yyyy")}
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    multipleDates: prev.multipleDates.filter((_, i) => i !== index)
                                  }))}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Issue Description */}
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">Issue Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.issueDescription}
                      onChange={(e) => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
                      placeholder="Please provide detailed description of the issue..."
                      rows={4}
                      className="mt-2"
                      required
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <Label className="text-sm font-medium">Issue Evidence (Optional)</Label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Click to upload evidence files
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            PNG, JPG, PDF up to 10MB
                          </span>
                        </label>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          multiple
                          className="sr-only"
                          onChange={handleFileChange}
                        />
                      </div>
                      {files.length > 0 && (
                        <div className="mt-4 text-sm text-gray-600">
                          {files.length} file(s) selected
                        </div>
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3">
                    Submit Issue Report
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="track">
            <TicketTracker initialSearchTerm={trackSearchTerm} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Issue Submitted Successfully!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Your issue has been submitted successfully. A PDF ticket with all details and attachments has been downloaded automatically.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-xs text-gray-500">Ticket Number</Label>
                  <p className="font-mono font-semibold">{ticketInfo.ticketNumber}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(ticketInfo.ticketNumber, 'Ticket number')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 mr-2">
                  <Label className="text-xs text-gray-500">Tracking Link</Label>
                  <p className="text-sm break-all">{ticketInfo.trackingLink}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(ticketInfo.trackingLink, 'Tracking link')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSuccessDialog(false)}
              >
                Close
              </Button>
              <Button
                onClick={handleTrackIssues}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Track
              </Button>
              <Button
                onClick={handleWhatsAppShare}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
            
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleDownloadTicket}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF Ticket Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
