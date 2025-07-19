import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from 'react-router-dom';
import { submitIssue } from '@/services/ticketService';
import { toast } from 'sonner';

export const SimpleIssueForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    centreCode: '',
    city: '',
    resourceId: '',
    issueCategory: 'App Issue',
    issueDescription: '',
    severity: 'SEV2',
    submittedBy: '',
    phoneNumber: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const issueData = {
        ...formData,
        issueDate: new Date(),
        isAnonymous: false,
        attachments: [],
        submittedByUserId: null,
        awignAppTicketId: null,
        isTesting: false
      };

      const ticketNumber = await submitIssue(issueData);
      toast.success(`Ticket ${ticketNumber} created successfully!`);
      
      // Reset form
      setFormData({
        centreCode: '',
        city: '',
        resourceId: '',
        issueCategory: 'App Issue',
        issueDescription: '',
        severity: 'SEV2',
        submittedBy: '',
        phoneNumber: ''
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create New Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="centreCode">Centre Code</Label>
              <Input
                id="centreCode"
                value={formData.centreCode}
                onChange={(e) => setFormData(prev => ({ ...prev, centreCode: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="resourceId">Resource ID</Label>
              <Input
                id="resourceId"
                value={formData.resourceId}
                onChange={(e) => setFormData(prev => ({ ...prev, resourceId: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number (for WhatsApp)</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="919999999999"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="submittedBy">Submitted By</Label>
            <Input
              id="submittedBy"
              value={formData.submittedBy}
              onChange={(e) => setFormData(prev => ({ ...prev, submittedBy: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="issueDescription">Issue Description</Label>
            <Textarea
              id="issueDescription"
              value={formData.issueDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
              required
              rows={4}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating Ticket...' : 'Create Ticket'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};