import React from 'react';
import { Issue } from '@/types/issue';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TicketDetailsModalProps {
  ticket: Issue;
  isOpen: boolean;
  onClose: () => void;
}

export const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({ ticket, isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ticket Details - {ticket.ticketNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Issue Description</h4>
            <p className="text-sm text-muted-foreground">{ticket.issueDescription}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">City</h4>
              <p className="text-sm">{ticket.city}</p>
            </div>
            <div>
              <h4 className="font-semibold">Centre Code</h4>
              <p className="text-sm">{ticket.centreCode}</p>
            </div>
            <div>
              <h4 className="font-semibold">Status</h4>
              <p className="text-sm">{ticket.status}</p>
            </div>
            <div>
              <h4 className="font-semibold">Severity</h4>
              <p className="text-sm">{ticket.severity}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};