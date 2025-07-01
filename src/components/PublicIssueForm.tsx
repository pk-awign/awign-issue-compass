import React, { useState, useEffect, useRef } from 'react';
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
import { FaWhatsapp } from 'react-icons/fa';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';

interface PublicIssueFormProps {
  onSubmit: (issue: Omit<Issue, 'id' | 'ticketNumber' | 'severity' | 'status' | 'submittedAt' | 'comments'>) => Promise<string>;
  onAdminLogin: () => void;
  defaultTab?: string;
  searchTerm?: string;
  defaultAnonymous?: boolean;
  hideHeader?: boolean;
}

export const PublicIssueForm: React.FC<PublicIssueFormProps> = ({ 
  onSubmit, 
  onAdminLogin, 
  defaultTab = "report",
  searchTerm = "",
  defaultAnonymous = false,
  hideHeader = false
}) => {
  const { user, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [trackSearchTerm, setTrackSearchTerm] = useState(searchTerm);
  
  const [formData, setFormData] = useState({
    centreCode: '',
    city: '',
    resourceId: '',
    awignAppTicketId: '',
    issueCategory: '' as Issue['issueCategory'] | '',
    issueDescription: '',
    dateType: 'single' as 'single' | 'range' | 'multiple' | 'ongoing',
    singleDate: undefined as Date | undefined,
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    multipleDates: [] as { date: Date, description: string }[],
    isAnonymous: defaultAnonymous,
    submittedBy: '',
    citySearch: ''
  });

  const [files, setFiles] = useState<File[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [ticketInfo, setTicketInfo] = useState({ ticketNumber: '', trackingLink: '' });
  const [submittedIssueData, setSubmittedIssueData] = useState<any>(null);

  const [cityInput, setCityInput] = useState('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (user && user.role === 'invigilator' && formData.dateType === 'range') {
      setFormData(prev => ({ ...prev, dateType: 'single' }));
    }
  }, [user]);

  const issueCategories = [
    { value: 'payment_delay', label: 'Payment Delay' },
    { value: 'partial_payment', label: 'Reduced/Partial Payment' },
    { value: 'behavioral_complaint', label: 'Behavioral Complaint' },
    { value: 'improvement_request', label: 'Improvement Request' },
    { value: 'facility_issue', label: 'Facility Issue' },
    { value: 'penalty_issue', label: 'Penalty Issue' },
    { value: 'other', label: 'Other Issue' }
  ];

  const cities = Array.from(new Set([
    "Shillong","Balasore","Cuttack","Gorakhpur","Rourkela","Faridabad","Guwahati","Gaya","Mumbai","Mapusa","New Delhi","Imphal","Parbhani","Kolkata","Ajmer","Jammu","Muzaffarpur","Sikar","Kakching","Mohali","Anantapur","Jodhpur","Nashik","Bhubaneswar","Bikaner","Kolhapur","Roorkee","Gurugram","Nagpur","Agartala","Delhi","Sambalpur","Ranchi","KOTA","Chandigarh","Dehradun","Jaipur","Darbhanga","Durgapur","Varanasi","KOTA","IMPHAL","Ludhiana","Udaipur","Kota","PRAYAGRAJ","Ernakulam","Pune","Hyderabad","Patna","Kottayam","Haldwani","Visakhapatnam","Naharlagun","Tirupathi","Kurnool","Bathinda","Patiala","Raipur","Mysuru(Mysore)","Mangaluru(Mangalore)","Shivamogga(Shimoga)","Hamirpur","Amravati","Jamshedpur","Dhanbad","Ahmedabad","Rajkot","Kohima","Aizwal","Panaji","Noida","Samba","vijayawada","Hubballi(Hubli)","SECUNDERABAD","Surat","Nanded","Jhansi","Aligarh","Thrissur","Siliguri","Baruipur","Asansol","Howrah","Bankura","Solan","Jalandhar","Greater Noida","Thane","SIKAR","SOLAPUR","Akola","Chandrapur","Kalyani","Hisar","Siddipet","Bhandara","Hanamkonda","Nizamabad","KOTHAGUDEM","Alappuzha","BARDOLI","Suryapet","Udupi","Nalgonda","Sathupally","Kannur","Adilabad","Karimnagar","Warangal","Khurda","Khammam","Mahabubnagar","Kodad","Narsampet","Bhopal","Indore","Hanumanghar","Jabalpur","Satna","Ujjain","Gwalior"
  ])).sort();

  const generateTicketNumber = () => {
    const prefix = 'AIM';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prevFiles => {
        // Avoid duplicates by name and size
        const allFiles = [...prevFiles, ...newFiles];
        return allFiles.filter((file, idx, arr) =>
          arr.findIndex(f => f.name === file.name && f.size === file.size) === idx
        );
      });
      // Reset the input value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const handleMultipleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setFormData(prev => {
      const exists = prev.multipleDates.find(d => d.date.getTime() === date.getTime());
      if (exists) {
        return { ...prev, multipleDates: prev.multipleDates.filter(d => d.date.getTime() !== date.getTime()) };
      } else {
        return { ...prev, multipleDates: [...prev.multipleDates, { date, description: '' }] };
      }
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
    setIsSubmitting(true);
    try {
      // Updated validation logic - always require all fields since anonymous is disabled
      const requiredFields = [
        formData.centreCode,
        formData.city,
        formData.resourceId,
        formData.issueCategory,
        formData.issueDescription,
        formData.submittedBy
      ];
      
      if (requiredFields.some(field => !field)) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate name for all reports (anonymous disabled)
      if (!formData.submittedBy) {
        toast.error('Name is required');
        return;
      }

      let dates: any[] = [];
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
        resourceId: formData.resourceId,
        awignAppTicketId: formData.awignAppTicketId || undefined,
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
        submittedBy: formData.submittedBy
      };

      const ticketNumber = await onSubmit(issueData);
      const trackingLink = `https://awign-invigilation-escalation.netlify.app/track/${ticketNumber}`;
      
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
        awignAppTicketId: '',
        issueCategory: '',
        issueDescription: '',
        dateType: 'single',
        singleDate: undefined,
        startDate: undefined,
        endDate: undefined,
        multipleDates: [],
        isAnonymous: false,
        submittedBy: user?.name || '',
        citySearch: ''
      });
      setFiles([]);
    } catch (error) {
      toast.error('Failed to submit issue. Please try again.');
      console.error('Issue submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {!hideHeader && (
        <header className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-2 py-2 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col items-start">
                <div className="bg-gray-800 p-1 rounded">
                  <img 
                    src="/awign-logo.svg" 
                    alt="Awign Logo" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
              </div>
              <div className="flex flex-col items-start flex-1 ml-4">
                <span className="text-base sm:text-xl font-semibold text-gray-900">Awign invIgilation Escalation Portal</span>
                <span className="text-xs sm:text-sm text-gray-600 mt-1">Report Escalations Only This is a leadership connect portal for escalations of your Issue when other channels like TL, Awign Support have not resolved your issue in time</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {user && (
                  <Button variant="outline" size="sm" onClick={logout}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
            {/* 5. After login, show 'Logged in as ...' below header */}
            {user && (
              <div className="text-xs text-gray-700 mt-2 text-right">
                Logged in as <span className="font-semibold">{user.name}</span>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-2 py-4 sm:px-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="report">Report Issue</TabsTrigger>
            <TabsTrigger value="track">Track Tickets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="report">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col gap-1">
                  <span className="text-lg font-semibold">Report Escalations Only</span>
                  <span className="text-sm text-muted-foreground">This is a leadership connect portal for escalations of your Issue when other channels like TL, Awign Support have not resolved your issue in time</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {/* Anonymous Checkbox - HIDDEN (feature disabled) */}
                  {/* {!user && (
                    <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
                      <Checkbox 
                        id="anonymous" 
                        checked={formData.isAnonymous}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAnonymous: checked as boolean }))}
                      />
                      <Label htmlFor="anonymous" className="text-sm font-medium">Report this issue anonymously</Label>
                    </div>
                  )} */}

                  {/* Name and Resource ID side by side */}
                  {!formData.isAnonymous && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <Label htmlFor="submittedBy" className="text-sm font-medium">Your Name *</Label>
                        <Input
                          id="submittedBy"
                          value={formData.submittedBy}
                          onChange={(e) => setFormData(prev => ({ ...prev, submittedBy: e.target.value }))}
                          placeholder="Enter your name"
                          required
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="resourceId" className="text-sm font-medium">Resource ID *</Label>
                        <Input
                          id="resourceId"
                          value={formData.resourceId}
                          onChange={(e) => setFormData(prev => ({ ...prev, resourceId: e.target.value }))}
                          placeholder="Enter Resource ID"
                          required
                          className="mt-2"
                        />
                      </div>
                    </div>
                  )}

                  {/* Issue Type and Awign App Ticket ID side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <Label className="text-sm font-medium">Issue Type *</Label>
                      <Select value={formData.issueCategory} onValueChange={(value) => setFormData(prev => ({ ...prev, issueCategory: value as Issue['issueCategory'] }))}>
                        <SelectTrigger className="w-full mt-2">
                          <SelectValue placeholder="Select issue type" />
                        </SelectTrigger>
                        <SelectContent>
                          {issueCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="awignAppTicketId" className="text-sm font-medium">Awign App Ticket ID (Optional)</Label>
                      <Input
                        id="awignAppTicketId"
                        value={formData.awignAppTicketId}
                        onChange={(e) => setFormData(prev => ({ ...prev, awignAppTicketId: e.target.value }))}
                        placeholder="Enter Awign App Ticket ID if applicable"
                        className="mt-2"
                      />
                    </div>
                  </div>

                  {/* Centre Code and City */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <Label htmlFor="centreCode" className="text-sm font-medium">Centre Code *</Label>
                      <Input
                        id="centreCode"
                        value={formData.centreCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, centreCode: e.target.value }))}
                        placeholder="e.g., TCS-MUM-001"
                        required
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">City *</Label>
                      <div className="w-full mt-2 relative">
                        <input
                          ref={cityInputRef}
                          type="text"
                          className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Search city..."
                          value={formData.city || cityInput}
                          onFocus={() => setCityDropdownOpen(true)}
                          onChange={e => {
                            setCityInput(e.target.value);
                            setFormData(prev => ({ ...prev, city: '', }));
                            setCityDropdownOpen(true);
                          }}
                          onBlur={() => setTimeout(() => setCityDropdownOpen(false), 150)}
                          autoComplete="off"
                        />
                        {cityDropdownOpen && (
                          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-y-auto mt-1">
                            {cities.filter(city => (cityInput ? city.toLowerCase().includes(cityInput.toLowerCase()) : true)).length === 0 ? (
                              <div className="p-2 text-sm text-gray-500">No city found.</div>
                            ) : (
                              cities.filter(city => (cityInput ? city.toLowerCase().includes(cityInput.toLowerCase()) : true)).map(city => (
                                <div
                                  key={city}
                                  className={`px-3 py-2 cursor-pointer hover:bg-blue-100 ${formData.city === city ? 'bg-blue-100 text-blue-900' : ''}`}
                                  onMouseDown={() => {
                                    setFormData(prev => ({ ...prev, city }));
                                    setCityInput(city);
                                    setCityDropdownOpen(false);
                                  }}
                                >
                                  {city}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Issue Date */}
                  <div>
                    <Label className="text-sm font-medium">Issue Date *</Label>
                    <RadioGroup 
                      value={formData.dateType} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, dateType: value as 'single' | 'multiple' | 'ongoing' }))}
                      className="flex flex-wrap gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="single" />
                        <Label htmlFor="single">Single Date</Label>
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
                          <div className="space-y-2">
                            {formData.multipleDates.map((item, index) => (
                              <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-blue-50 p-2 rounded-lg">
                                <div className="font-mono text-sm min-w-[120px]">{format(item.date, "MMM dd, yyyy")}</div>
                                <Textarea
                                  className="flex-1 min-w-[180px]"
                                  placeholder="Description for this date..."
                                  value={item.description}
                                  onChange={e => setFormData(prev => {
                                    const newDates = [...prev.multipleDates];
                                    newDates[index] = { ...newDates[index], description: e.target.value };
                                    return { ...prev, multipleDates: newDates };
                                  })}
                                  rows={2}
                                />
                                <button
                                  type="button"
                                  onClick={() => setFormData(prev => ({
                                    ...prev,
                                    multipleDates: prev.multipleDates.filter((_, i) => i !== index)
                                  }))}
                                  className="text-blue-600 hover:text-blue-800 ml-2"
                                  title="Remove date"
                                >×</button>
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
                    {/* Show attached files list */}
                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {files.map((file, idx) => (
                          <div key={idx} className="flex items-center bg-green-50 border border-green-300 rounded px-2 py-1 text-xs">
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <button
                              type="button"
                              className="ml-2 text-red-500 hover:text-red-700"
                              onClick={() => setFiles(files => files.filter((_, i) => i !== idx))}
                              aria-label={`Remove ${file.name}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${files.length > 0 ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4 text-center">
                        <label htmlFor="file-upload" className="cursor-pointer w-full block">
                          <span className="block text-xs sm:text-sm font-medium text-gray-900 leading-snug">
                            Attach any files: Image, PDF, Audio, Video, etc
                          </span>
                          <span className="mt-2 block text-xs sm:text-sm text-gray-500 leading-tight">
                            (upto 10 MB)<br />You can add multiple files
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
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Issue'}
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
        <DialogContent className="max-w-xs sm:max-w-md w-full overflow-y-auto">
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
            
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mt-2">
              <Button
                onClick={handleTrackIssues}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Track
              </Button>
              <Button
                onClick={handleWhatsAppShare}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 flex items-center justify-center"
                title="Send this ticket to yourself on WhatsApp."
              >
                <FaWhatsapp className="h-4 w-4 mr-1" />
                Send to My WhatsApp
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
