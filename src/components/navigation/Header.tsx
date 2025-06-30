import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Users, LogOut, Shield, UserCog, Home, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface HeaderProps {
  onLogout: () => void;
  showRoleSwitcher?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, showRoleSwitcher = false }) => {
  const { user, isSuperAdmin, isResolver, isApprover, isInvigilator, switchRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRoleSwitch = (newRole: 'invigilator' | 'resolver' | 'approver' | 'super_admin') => {
    switchRole(newRole);
    const roleNames = {
      'invigilator': 'Invigilator',
      'resolver': 'Resolver',
      'approver': 'Approver',
      'super_admin': 'Super Admin'
    };
    toast.success(`Switched to ${roleNames[newRole]} role`);
    setMobileMenuOpen(false);
  };

  const getRoleDisplayName = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (isResolver) return 'Resolver';
    if (isApprover) return 'Approver';
    if (isInvigilator) return 'Invigilator';
    return 'Invigilator';
  };

  const getRoleIcon = () => {
    if (isSuperAdmin) return Shield;
    if (isResolver) return UserCog;
    if (isApprover) return UserCog;
    return Users;
  };

  const RoleIcon = getRoleIcon();

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="bg-gray-800 p-1 rounded">
              <img 
                src="/awign-logo.svg"
                alt="Awign Logo" 
                className="h-6 w-6 md:h-8 md:w-8 object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base md:text-2xl font-bold">Awign invIgilation Escalation Portal</h1>
              <p className="text-xs md:text-sm text-muted-foreground font-semibold">Report Escalations Only</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-base font-bold">Awign invIgilation Escalation Portal</h1>
              <p className="text-xs text-muted-foreground font-semibold">Report Escalations Only</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
            {/* Only show role switcher for Super Admin */}
            {user && showRoleSwitcher && isSuperAdmin && (
              <Select onValueChange={handleRoleSwitch}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={getRoleDisplayName()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invigilator">Invigilator</SelectItem>
                  <SelectItem value="resolver">Resolver</SelectItem>
                  <SelectItem value="approver">Approver</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <RoleIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{user.name}</span>
                  <Badge variant={isSuperAdmin ? "default" : isResolver ? "secondary" : isApprover ? "destructive" : "outline"}>
                    <Shield className="h-3 w-3 mr-1" />
                    {getRoleDisplayName()}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
          </div>

          {/* Mobile: Logout button at top right */}
          <div className="md:hidden absolute right-2 top-2 z-20">
            {user && (
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
