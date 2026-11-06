import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield } from 'lucide-react';
import { UserManagementPanel } from './UserManagementPanel';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dialog entry point for user management, used by the Admin Dashboard and the
 * Analytics dashboard. The roster itself lives in UserManagementPanel so the
 * identical UI can also render inline in the admin Users tab.
 */
export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => (
  <Dialog
    open={isOpen}
    onOpenChange={open => {
      if (!open) onClose();
    }}
  >
    <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          User Management System
        </DialogTitle>
      </DialogHeader>
      {isOpen && <UserManagementPanel />}
    </DialogContent>
  </Dialog>
);

export default UserManagementModal;
