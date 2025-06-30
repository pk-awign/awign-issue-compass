import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createRandomTickets, clearAllTickets, createSampleAttachments } from '@/utils/sampleTickets';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Paperclip } from 'lucide-react';

export const RandomTicketGenerator: React.FC = () => {
  const [count, setCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isCreatingAttachments, setIsCreatingAttachments] = useState(false);

  const handleGenerateTickets = async () => {
    setIsGenerating(true);
    try {
      const tickets = await createRandomTickets(count);
      toast.success(`Successfully created ${tickets.length} random tickets!`);
    } catch (error) {
      toast.error('Failed to create random tickets');
      console.error('Error generating tickets:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearTickets = async () => {
    setIsClearing(true);
    try {
      await clearAllTickets();
      toast.success('All tickets cleared successfully!');
    } catch (error) {
      toast.error('Failed to clear tickets');
      console.error('Error clearing tickets:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleCreateAttachments = async () => {
    setIsCreatingAttachments(true);
    try {
      await createSampleAttachments();
      toast.success('Sample attachments created successfully!');
    } catch (error) {
      toast.error('Failed to create sample attachments');
      console.error('Error creating attachments:', error);
    } finally {
      setIsCreatingAttachments(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Random Ticket Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="count">Number of tickets to generate</Label>
          <Input
            id="count"
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 10)}
            className="mt-2"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleGenerateTickets} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Generate Random Tickets
              </>
            )}
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleCreateAttachments} 
            disabled={isCreatingAttachments}
            className="w-full"
          >
            {isCreatingAttachments ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Paperclip className="h-4 w-4 mr-2" />
                Create Sample Attachments
              </>
            )}
          </Button>
          
          <Button 
            variant="destructive"
            onClick={handleClearTickets} 
            disabled={isClearing}
            className="w-full"
          >
            {isClearing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Tickets
              </>
            )}
          </Button>
        </div>
        
        <p className="text-sm text-gray-600">
          This will create random tickets with various categories, severities, and statuses for testing purposes.
        </p>
      </CardContent>
    </Card>
  );
};
