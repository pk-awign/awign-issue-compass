import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Users, LogOut, Shield, UserCog, Home, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/NotificationBell';
import { BrandLogo } from '@/components/BrandLogo';
import { toast } from 'sonner';

interface HeaderProps {
  onLogout: () => void;
  showRoleSwitcher?: boolean;
  onTicketClick?: (ticketId: string) => void;
  panelName?: string;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, showRoleSwitcher = false, onTicketClick, panelName }) => {
  const { user, isSuperAdmin, isResolver, isApprover, isInvigilator, isTicketAdmin, switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRoleSwitch = (newRole: 'invigilator' | 'resolver' | 'approver' | 'super_admin' | 'ticket_admin') => {
    switchRole(newRole);
    const roleNames = {
      'invigilator': 'Invigilator',
      'resolver': 'Resolver',
      'approver': 'Approver',
      'super_admin': 'Super Admin',
      'ticket_admin': 'Ticket Admin'
    };
    toast.success(`Switched to ${roleNames[newRole]} role`);
    setMobileMenuOpen(false);
  };

  const getRoleDisplayName = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (isResolver) return 'Resolver';
    if (isApprover) return 'Approver';
    if (isInvigilator) return 'Invigilator';
    if (isTicketAdmin) return 'Ticket Admin';
    return 'Invigilator';
  };

  const getRoleIcon = () => {
    if (isSuperAdmin) return Shield;
    if (isResolver) return UserCog;
    if (isApprover) return UserCog;
    if (isTicketAdmin) return Shield;
    return Users;
  };

  const getPanelName = () => {
    return panelName || 'Panel';
  };

  const RoleIcon = getRoleIcon();

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="container mx-auto w-full py-3 sm:py-4">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo />
            <div className="flex min-w-0 flex-col items-start">
              <span className="truncate text-sm font-semibold text-gray-900 sm:text-xl">
                ESCALATION MANAGEMENT
              </span>
              <span className="mt-0.5 truncate text-xs text-gray-600 sm:mt-1 sm:text-sm">
                {getPanelName()}
              </span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="ml-4 hidden min-w-0 items-center gap-2 sm:flex">
            {/* Only show role switcher for Super Admin */}
            {user && showRoleSwitcher && isSuperAdmin && (
              <Select onValueChange={handleRoleSwitch}>
                <SelectTrigger className="w-36 shrink-0 lg:w-40">
                  <SelectValue placeholder={getRoleDisplayName()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invigilator">Invigilator</SelectItem>
                  <SelectItem value="resolver">Resolver</SelectItem>
                  <SelectItem value="approver">Approver</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="ticket_admin">Ticket Admin</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {user ? (
              <>
                {/* Show notification bell for resolvers */}
                {isResolver && onTicketClick && (
                  <NotificationBell onTicketClick={onTicketClick} />
                )}
                <div className="flex min-w-0 items-center gap-2">
                  <RoleIcon className="h-5 w-5 shrink-0" />
                  <span className="max-w-[8rem] truncate text-sm font-medium lg:max-w-[12rem]" title={user.name}>
                    {user.name}
                  </span>
                  <span className="ml-1 shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                    {getRoleDisplayName()}
                  </span>
                </div>
                <button onClick={onLogout} className="ml-1 shrink-0" aria-label="Logout">
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex shrink-0 items-center gap-1 sm:hidden">
            {user && isResolver && onTicketClick && (
              <NotificationBell onTicketClick={onTicketClick} />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-nav-menu" className="mt-4 space-y-4 border-t pt-4 sm:hidden">
            {/* Only show role switcher for Super Admin on mobile */}
            {user && showRoleSwitcher && isSuperAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Switch Role:</label>
                <Select onValueChange={handleRoleSwitch}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={getRoleDisplayName()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invigilator">Invigilator</SelectItem>
                    <SelectItem value="resolver">Resolver</SelectItem>
                    <SelectItem value="approver">Approver</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="ticket_admin">Ticket Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {user ? (
              <div className="space-y-3">
                <div className="flex min-w-0 items-center gap-2">
                  <RoleIcon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate text-sm font-medium" title={user.name}>
                    {user.name}
                  </span>
                  <span className="ml-1 shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                    {getRoleDisplayName()}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={onLogout} className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
