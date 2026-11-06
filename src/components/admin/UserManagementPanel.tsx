import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Edit, Key, Mail, MapPin, Phone, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminService } from '@/services/adminService';
import { User } from '@/types/issue';
import { cn } from '@/lib/utils';

interface UserManagementPanelProps {
  className?: string;
}

type UserRoleFilter = 'all' | User['role'];

const roleLabels: Record<User['role'], string> = {
  invigilator: 'Invigilator',
  resolver: 'Resolver',
  approver: 'Approver',
  super_admin: 'Super Admin',
  ticket_admin: 'Ticket Admin',
};

const availablePermissions: { value: string; label: string }[] = [
  { value: 'invigilator_access', label: 'Invigilator Access' },
  { value: 'resolver_access', label: 'Resolver Access' },
  { value: 'approver_access', label: 'Approver Access' },
  { value: 'super_admin_access', label: 'Super Admin Access' },
];

const getRoleBadgeVariant = (role: User['role']): 'default' | 'destructive' | 'secondary' | 'outline' => {
  switch (role) {
    case 'super_admin':
    case 'ticket_admin':
      return 'default';
    case 'approver':
      return 'destructive';
    case 'resolver':
      return 'secondary';
    default:
      return 'outline';
  }
};

const formatDate = (date?: Date) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const emptyForm = () => ({
  name: '',
  role: 'invigilator' as User['role'],
  city: '',
  centreCode: '',
  mobile: '',
  email: '',
  password: '',
  pin: '',
  permissions: [] as string[],
  isActive: true,
});

/**
 * User management as an inline section: the roster is the primary content, so it
 * renders straight into the page instead of behind a modal. The same component
 * is reused inside UserManagementModal for the entry points that still open a
 * dialog (Admin Dashboard, Analytics).
 */
export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ className }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [createdUserCreds, setCreatedUserCreds] = useState<
    null | { name: string; role: string; pin: string; city: string; centreCode: string; mobile: string }
  >(null);

  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all');

  const [formData, setFormData] = useState(emptyForm());

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await AdminService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter(user => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (!term) return true;
      return [user.name, user.mobile, user.email, user.city, user.centreCode]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term));
    });
  }, [users, searchTerm, roleFilter]);

  const activeUserCount = users.filter(user => user.isActive).length;

  const validatePin = (pin: string) => /^\d{4}$/.test(pin);

  const resetForm = () => setFormData(emptyForm());

  const handleAddUser = async () => {
    if (!formData.name || !formData.role || !formData.pin) {
      toast.error('Please fill in required fields including PIN');
      return;
    }
    if (!validatePin(formData.pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    try {
      await AdminService.createUser({
        name: formData.name,
        role: formData.role,
        city: formData.city,
        centreCode: formData.centreCode,
        mobile: formData.mobile,
        pin: formData.pin,
        isActive: formData.isActive,
      });
      toast.success('User created successfully with PIN');
      setCreatedUserCreds({
        name: formData.name,
        role: formData.role,
        pin: formData.pin,
        city: formData.city,
        centreCode: formData.centreCode,
        mobile: formData.mobile,
      });
      setIsAddingUser(false);
      resetForm();
      loadUsers();
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !formData.name) {
      toast.error('Please fill in required fields');
      return;
    }
    if (formData.pin && !validatePin(formData.pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    try {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        role: formData.role,
        city: formData.city,
        centreCode: formData.centreCode,
        mobile: formData.mobile,
        isActive: formData.isActive,
      };
      if (formData.pin) updateData.pin = formData.pin;

      await AdminService.updateUser(selectedUser.id, updateData as any);
      toast.success('User updated successfully');
      setIsEditingUser(false);
      setSelectedUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await AdminService.toggleUserStatus(userId, isActive);
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleGrantPermissions = async (userId: string, permissions: string[]) => {
    try {
      await AdminService.grantUserPermissions(userId, permissions);
      toast.success('Permissions updated successfully');
      loadUsers();
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const startEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      role: user.role,
      city: user.city || '',
      centreCode: user.centreCode || '',
      mobile: user.mobile || '',
      email: user.email || '',
      password: '',
      pin: '',
      permissions: user.permissions || [],
      isActive: user.isActive,
    });
    setIsEditingUser(true);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete all data for user "${userName}"? This will delete all their tickets, comments, and assignments, but keep their user account.`
      )
    ) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const success = await AdminService.deleteUser(userId);
      if (success) {
        toast.success(`All data for user "${userName}" deleted successfully. User account preserved.`);
        loadUsers();
      } else {
        toast.error('Failed to delete user data');
      }
    } catch (error) {
      console.error('Error deleting user data:', error);
      toast.error('Failed to delete user data');
    } finally {
      setDeletingUserId(null);
    }
  };

  const renderRowActions = (user: User) => (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={() => startEdit(user)}
        aria-label={`Edit ${user.name}`}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleDeleteUser(user.id, user.name)}
        disabled={deletingUserId === user.id}
        aria-label={`Delete data for ${user.name}`}
        title="Delete all user data (tickets, comments, assignments) but keep the user account"
      >
        {deletingUserId === user.id ? (
          <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  return (
    <div className={cn('space-y-4', className)}>
      {createdUserCreds && (
        <div className="flex flex-col gap-4 rounded-lg border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 font-semibold text-green-800">Credentials for the new account</div>
            <div className="text-sm text-green-900">
              <div><b>Name:</b> {createdUserCreds.name}</div>
              <div><b>Role:</b> {createdUserCreds.role}</div>
              <div><b>PIN:</b> {createdUserCreds.pin}</div>
              <div><b>City:</b> {createdUserCreds.city}</div>
              <div><b>Centre Code:</b> {createdUserCreds.centreCode}</div>
              <div><b>Mobile:</b> {createdUserCreds.mobile}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const creds = `Name: ${createdUserCreds.name}\nRole: ${createdUserCreds.role}\nPIN: ${createdUserCreds.pin}\nCity: ${createdUserCreds.city}\nCentre Code: ${createdUserCreds.centreCode}\nMobile: ${createdUserCreds.mobile}`;
                navigator.clipboard.writeText(creds);
                toast.success('Credentials copied to clipboard');
                setCreatedUserCreds(null);
              }}
            >
              Copy credentials
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCreatedUserCreds(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:inline-grid md:w-auto">
          <TabsTrigger value="users" className="px-4">
            Users
            <Badge variant="secondary" className="ml-2">{users.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="px-4">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Users ({filteredUsers.length})</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {users.length} accounts · {activeUserCount} active
                  </p>
                </div>
                <Button size="sm" onClick={() => setIsAddingUser(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add user
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                    placeholder="Search name, mobile, city or centre"
                    className="pl-9"
                    aria-label="Search users"
                  />
                </div>
                <Select
                  value={roleFilter}
                  onValueChange={value => setRoleFilter(value as UserRoleFilter)}
                >
                  <SelectTrigger className="w-full sm:w-48" aria-label="Filter by role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="invigilator">Invigilator</SelectItem>
                    <SelectItem value="resolver">Resolver</SelectItem>
                    <SelectItem value="approver">Approver</SelectItem>
                    <SelectItem value="ticket_admin">Ticket Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || roleFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setRoleFilter('all');
                    }}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Loading users…</div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No users match this search.
                </div>
              ) : (
                <>
                  {/* Phones get one card per user; the table needs md and up. */}
                  <div className="space-y-3 md:hidden">
                    {filteredUsers.map(user => (
                      <div key={`${user.id}-card`} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{user.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <Badge variant={getRoleBadgeVariant(user.role)} className="text-[10px]">
                                {roleLabels[user.role]}
                              </Badge>
                              <Badge
                                variant={user.isActive ? 'secondary' : 'outline'}
                                className="text-[10px]"
                              >
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                          {renderRowActions(user)}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{user.mobile || 'No mobile'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{user.city || 'No city'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building className="h-3 w-3 shrink-0" />
                            <span className="truncate">{user.centreCode || 'No centre'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.isActive}
                              onCheckedChange={checked => handleToggleUserStatus(user.id, checked)}
                              aria-label={`Toggle access for ${user.name}`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {user.isActive ? 'Access on' : 'Access off'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-hidden rounded-lg border md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Access</TableHead>
                          <TableHead>Last activity</TableHead>
                          <TableHead className="w-28">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map(user => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="font-medium">{user.name}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {user.mobile && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {user.mobile}
                                  </span>
                                )}
                                {user.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(user.role)}>
                                {roleLabels[user.role]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                {user.city && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    {user.city}
                                  </div>
                                )}
                                {user.centreCode && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Building className="h-3 w-3" />
                                    {user.centreCode}
                                  </div>
                                )}
                                {!user.city && !user.centreCode && (
                                  <span className="text-muted-foreground">Not set</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={user.isActive}
                                  onCheckedChange={checked => handleToggleUserStatus(user.id, checked)}
                                  aria-label={`Toggle access for ${user.name}`}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{formatDate(user.lastActivity)}</div>
                                <div className="text-xs text-muted-foreground">
                                  Login: {formatDate(user.lastLogin)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{renderRowActions(user)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Additional access</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Users with more than one role pick their role at login.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.filter(user => user.role !== 'super_admin').length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No users available for additional access.
                </p>
              ) : (
                users
                  .filter(user => user.role !== 'super_admin')
                  .map(user => {
                    const granted = user.permissions || [];
                    return (
                      <div
                        key={user.id}
                        className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Primary role: {roleLabels[user.role]}
                          </div>
                          {granted.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {granted.map(permission => {
                                const label =
                                  availablePermissions.find(p => p.value === permission)?.label ??
                                  permission;
                                return (
                                  <Badge key={permission} variant="secondary" className="gap-1 text-xs font-normal">
                                    {label}
                                    <button
                                      type="button"
                                      className="rounded-full outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                                      onClick={() =>
                                        handleGrantPermissions(
                                          user.id,
                                          granted.filter(p => p !== permission)
                                        )
                                      }
                                      aria-label={`Remove ${label} from ${user.name}`}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <Select onValueChange={value => handleGrantPermissions(user.id, [...granted, value])}>
                          <SelectTrigger className="w-full sm:w-52" aria-label={`Grant access to ${user.name}`}>
                            <SelectValue placeholder="Grant access" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePermissions
                              .filter(permission => !granted.includes(permission.value))
                              .map(permission => (
                                <SelectItem key={permission.value} value={permission.value}>
                                  {permission.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add user */}
      <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Add new user
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="new-user-name">Name *</Label>
                <Input
                  id="new-user-name"
                  value={formData.name}
                  onChange={event => setFormData({ ...formData, name: event.target.value })}
                  placeholder="Full name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-user-role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={value => setFormData({ ...formData, role: value as User['role'] })}
                >
                  <SelectTrigger id="new-user-role" className="mt-1">
                    <SelectValue />
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
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="new-user-mobile">Mobile</Label>
                <Input
                  id="new-user-mobile"
                  value={formData.mobile}
                  onChange={event => setFormData({ ...formData, mobile: event.target.value })}
                  placeholder="10-digit mobile number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-user-pin">PIN *</Label>
                <Input
                  id="new-user-pin"
                  type="password"
                  value={formData.pin}
                  onChange={event => setFormData({ ...formData, pin: event.target.value })}
                  placeholder="4-digit PIN"
                  maxLength={4}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">Exactly 4 digits, used to log in.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="new-user-city">City</Label>
                <Input
                  id="new-user-city"
                  value={formData.city}
                  onChange={event => setFormData({ ...formData, city: event.target.value })}
                  placeholder="City name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-user-centre">Centre code</Label>
                <Input
                  id="new-user-centre"
                  value={formData.centreCode}
                  onChange={event => setFormData({ ...formData, centreCode: event.target.value })}
                  placeholder="Centre code"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-user-password">Password</Label>
              <Input
                id="new-user-password"
                type="password"
                value={formData.password}
                onChange={event => setFormData({ ...formData, password: event.target.value })}
                placeholder="Optional"
                className="mt-1"
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsAddingUser(false)}>Cancel</Button>
              <Button onClick={handleAddUser}>Create user</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit user */}
      <Dialog open={isEditingUser} onOpenChange={setIsEditingUser}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {selectedUser?.name ?? 'user'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-user-name">Name *</Label>
                <Input
                  id="edit-user-name"
                  value={formData.name}
                  onChange={event => setFormData({ ...formData, name: event.target.value })}
                  placeholder="Full name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-user-role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={value => setFormData({ ...formData, role: value as User['role'] })}
                >
                  <SelectTrigger id="edit-user-role" className="mt-1">
                    <SelectValue />
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
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-user-mobile">Mobile</Label>
                <Input
                  id="edit-user-mobile"
                  value={formData.mobile}
                  onChange={event => setFormData({ ...formData, mobile: event.target.value })}
                  placeholder="10-digit mobile number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-user-pin">New PIN</Label>
                <Input
                  id="edit-user-pin"
                  type="password"
                  value={formData.pin}
                  onChange={event => setFormData({ ...formData, pin: event.target.value })}
                  placeholder="4-digit PIN"
                  maxLength={4}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">Leave empty to keep the current PIN.</p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsEditingUser(false)}>Cancel</Button>
              <Button onClick={handleUpdateUser}>Update user</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPanel;
