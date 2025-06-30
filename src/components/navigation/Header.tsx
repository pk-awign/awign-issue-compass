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
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-800 p-1 rounded">
              <img 
                src="/awign-logo.svg"
                alt="Awign Logo" 
                className={`h-6 w-6 md:h-8 md:w-8 object-contain`}
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-2xl font-bold">Awign invIgilation Escalation Portal</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                TCS Examination Operations - {getRoleDisplayName()} Panel
              </p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-sm font-bold">Awign</h1>
              <p className="text-xs text-muted-foreground">{getRoleDisplayName()}</p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
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

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 border-t pt-4 space-y-4">
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
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <RoleIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{user.name}</span>
                  <Badge variant={isSuperAdmin ? "default" : isResolver ? "secondary" : isApprover ? "destructive" : "outline"}>
                    <Shield className="h-3 w-3 mr-1" />
                    {getRoleDisplayName()}
                  </Badge>
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
