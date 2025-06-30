import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Issue } from '@/types/issue';
import { toast } from 'sonner';

interface IssueFormProps {
  onSubmit: (issue: Omit<Issue, 'id' | 'ticketNumber' | 'severity' | 'status' | 'submittedAt' | 'comments'>) => void;
}

export const IssueForm: React.FC<IssueFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    centreCode: '',
    city: '',
    resourceId: '',
    awignAppTicketId: '',
    issueCategory: '' as Issue['issueCategory'] | '',
    issueDescription: '',
    dateType: 'single' as 'single' | 'multiple' | 'ongoing',
    singleDate: undefined as Date | undefined,
    multipleDates: [] as { date: Date, description: string }[],
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    isAnonymous: false,
    submittedBy: ''
  });

  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const issueCategories = [
    { value: 'payment_delay', label: 'Payment Delay' },
    { value: 'partial_payment', label: 'Reduced/Partial Payment' },
    { value: 'behavioral_complaint', label: 'Behavioral Complaint' },
    { value: 'improvement_request', label: 'Improvement Request' },
    { value: 'facility_issue', label: 'Facility Issue' },
    { value: 'penalty_issue', label: 'Penalty Issue' },
    { value: 'other', label: 'Other Issue' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Updated validation logic - don't require resourceId for anonymous submissions
      const requiredFields = [
        formData.centreCode,
        formData.city,
        formData.issueCategory,
        formData.issueDescription
      ];
      
      // Only require resourceId if not anonymous
      if (!formData.isAnonymous) {
        requiredFields.push(formData.resourceId);
      }
      
      if (requiredFields.some(field => !field)) {
        toast.error('Please fill in all required fields');
        return;
      }

      let dates: any[] = [];
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (formData.dateType === 'single' && formData.singleDate) {
        dates = [formData.singleDate];
      } else if (formData.dateType === 'multiple') {
        dates = formData.multipleDates;
      } else if (formData.dateType === 'ongoing') {
        startDate = formData.startDate;
        endDate = formData.endDate;
      }

      const issueData = {
        centreCode: formData.centreCode,
        city: formData.city,
        resourceId: formData.isAnonymous ? undefined : formData.resourceId,
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
        submittedBy: formData.isAnonymous ? undefined : formData.submittedBy
      };

      onSubmit(issueData);
      
      // Reset form
      setFormData({
        centreCode: '',
        city: '',
        resourceId: '',
        awignAppTicketId: '',
        issueCategory: '',
        issueDescription: '',
        dateType: 'single',
        singleDate: undefined,
        multipleDates: [],
        startDate: undefined,
        endDate: undefined,
        isAnonymous: false,
        submittedBy: ''
      });
      setFiles([]);
      
      toast.success('Issue submitted successfully! You will receive a tracking number shortly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Report an Issue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="centreCode">Centre Code *</Label>
              <Input
                id="centreCode"
                value={formData.centreCode}
                onChange={(e) => setFormData(prev => ({ ...prev, centreCode: e.target.value }))}
                placeholder="e.g., MUM001"
                required
              />
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Mumbai"
                required
              />
            </div>
          </div>

          {/* Resource ID and Awign App Ticket ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="resourceId">Resource ID *</Label>
              <Input
                id="resourceId"
                value={formData.resourceId}
                onChange={(e) => setFormData(prev => ({ ...prev, resourceId: e.target.value }))}
                placeholder="Enter resource ID"
                required
              />
            </div>
            <div>
              <Label htmlFor="awignAppTicketId">Awign App Ticket ID (Optional)</Label>
              <Input
                id="awignAppTicketId"
                value={formData.awignAppTicketId}
                onChange={(e) => setFormData(prev => ({ ...prev, awignAppTicketId: e.target.value }))}
                placeholder="Enter Awign App Ticket ID if applicable"
              />
            </div>
          </div>

          {/* Issue Category */}
          <div>
            <Label>Issue Category *</Label>
            <Select value={formData.issueCategory} onValueChange={(value) => setFormData(prev => ({ ...prev, issueCategory: value as Issue['issueCategory'] }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select issue category" />
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

          {/* Issue Description */}
          <div>
            <Label htmlFor="description">Issue Description *</Label>
            <Textarea
              id="description"
              value={formData.issueDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
              placeholder="Provide detailed description of the issue..."
              rows={4}
              required
            />
          </div>

          {/* Date Selection */}
          <div>
            <Label>Issue Date *</Label>
            <Select value={formData.dateType} onValueChange={(value) => setFormData(prev => ({ ...prev, dateType: value as 'single' | 'multiple' | 'ongoing' }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Date</SelectItem>
                <SelectItem value="multiple">Multiple Dates</SelectItem>
                <SelectItem value="ongoing">Ongoing (Date Range)</SelectItem>
              </SelectContent>
            </Select>

            {formData.dateType === 'single' && (
              <div className="mt-2">
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
              <div className="mt-2 space-y-2">
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

            {formData.dateType === 'ongoing' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
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
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="evidence">Issue Evidence (Optional)</Label>
            <div className="mt-2">
              <Input
                id="evidence"
                type="file"
                multiple
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {files.length > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {files.length} file(s) selected
                </div>
              )}
            </div>
          </div>

          {/* Anonymous Submission */}
          <div className="flex items-center space-x-2">
            <Switch
              id="anonymous"
              checked={formData.isAnonymous}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAnonymous: checked }))}
            />
            <Label htmlFor="anonymous">Submit anonymously</Label>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Issue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
