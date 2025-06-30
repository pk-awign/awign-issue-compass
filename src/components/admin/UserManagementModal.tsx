import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Edit, Trash2, Shield, Phone, Mail, MapPin, Building, Key } from 'lucide-react';
import { toast } from 'sonner';
import { AdminService } from '@/services/adminService';
import { User } from '@/types/issue';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    role: 'invigilator' as User['role'],
    city: '',
    centreCode: '',
    mobile: '',
    email: '',
    password: '',
    pin: '', // Add PIN field
    permissions: [] as string[],
    isActive: true
  });

  // Available permissions for multi-access
  const availablePermissions = [
    { value: 'invigilator_access', label: 'Invigilator Access' },
    { value: 'resolver_access', label: 'Resolver Access' },
    { value: 'approver_access', label: 'Approver Access' },
    { value: 'super_admin_access', label: 'Super Admin Access' }
  ];

  const roleLabels = {
    invigilator: 'Invigilator',
    resolver: 'Resolver',
    approver: 'Approver',
    super_admin: 'Super Admin'
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

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

  const validatePin = (pin: string): boolean => {
    return /^\d{4}$/.test(pin);
  };

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
        pin: formData.pin, // Include PIN in user creation
        isActive: formData.isActive
      });
      toast.success('User created successfully with PIN');
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

    // Validate PIN if it's being updated
    if (formData.pin && !validatePin(formData.pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    try {
      const updateData: any = {
        name: formData.name,
        role: formData.role,
        city: formData.city,
        centreCode: formData.centreCode,
        mobile: formData.mobile,
        isActive: formData.isActive
      };

      // Only include PIN if it's being updated
      if (formData.pin) {
        updateData.pin = formData.pin;
      }

      await AdminService.updateUser(selectedUser.id, updateData);
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

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'invigilator',
      city: '',
      centreCode: '',
      mobile: '',
      email: '',
      password: '',
      pin: '', // Reset PIN field
      permissions: [],
      isActive: true
    });
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
      pin: '', // Don't pre-fill PIN for security
      permissions: user.permissions || [],
      isActive: user.isActive
    });
    setIsEditingUser(true);
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeVariant = (role: User['role']) => {
    switch (role) {
      case 'super_admin': return 'default';
      case 'approver': return 'destructive';
      case 'resolver': return 'secondary';
      case 'invigilator': return 'outline';
      default: return 'outline';
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete all data for user "${userName}"? This will delete all their tickets, comments, and assignments, but keep their user account.`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const success = await AdminService.deleteUser(userId);
      if (success) {
        toast.success(`All data for user "${userName}" deleted successfully. User account preserved.`);
        loadUsers(); // Refresh the user list
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Management System
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="permissions">Permissions & Access</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">System Users</h3>
              <Button onClick={() => setIsAddingUser(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add New User
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>PIN Status</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {roleLabels[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {user.mobile && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3" />
                                {user.mobile}
                              </div>
                            )}
                            {user.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {user.city && (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3" />
                                {user.city}
                              </div>
                            )}
                            {user.centreCode && (
                              <div className="flex items-center gap-1 text-sm">
                                <Building className="h-3 w-3" />
                                {user.centreCode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Key className="h-3 w-3" />
                            <Badge variant="outline" className="text-xs">
                              PIN Set
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.isActive}
                              onCheckedChange={(checked) => handleToggleUserStatus(user.id, checked)}
                            />
                            <span className="text-sm">
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Activity: {formatDate(user.lastActivity)}</div>
                            <div className="text-muted-foreground">
                              Login: {formatDate(user.lastLogin)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              disabled={deletingUserId === user.id}
                              title="Delete all user data (tickets, comments, assignments) but keep user account"
                            >
                              {deletingUserId === user.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Cleaning...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Access Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Grant users access to multiple roles. Users with multi-access can choose their role at login.
                </p>
                <div className="space-y-4">
                  {users.filter(user => user.role !== 'super_admin').map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Primary Role: {roleLabels[user.role]}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(value) => {
                            const currentPermissions = user.permissions || [];
                            const newPermissions = currentPermissions.includes(value)
                              ? currentPermissions.filter(p => p !== value)
                              : [...currentPermissions, value];
                            handleGrantPermissions(user.id, newPermissions);
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Grant additional access" />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePermissions.map((permission) => (
                              <SelectItem key={permission.value} value={permission.value}>
                                {permission.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add User Modal */}
        {isAddingUser && (
          <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value as User['role']})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invigilator">Invigilator</SelectItem>
                        <SelectItem value="resolver">Resolver</SelectItem>
                        <SelectItem value="approver">Approver</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pin">PIN *</Label>
                    <Input
                      id="pin"
                      type="password"
                      value={formData.pin}
                      onChange={(e) => setFormData({...formData, pin: e.target.value})}
                      placeholder="4-digit PIN"
                      maxLength={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter exactly 4 digits for user login
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="City name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="centreCode">Centre Code</Label>
                    <Input
                      id="centreCode"
                      value={formData.centreCode}
                      onChange={(e) => setFormData({...formData, centreCode: e.target.value})}
                      placeholder="Centre code"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Enter password (optional)"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingUser(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser}>
                    Create User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit User Modal */}
        {isEditingUser && (
          <Dialog open={isEditingUser} onOpenChange={setIsEditingUser}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Name *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-role">Role *</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value as User['role']})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invigilator">Invigilator</SelectItem>
                        <SelectItem value="resolver">Resolver</SelectItem>
                        <SelectItem value="approver">Approver</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-mobile">Mobile</Label>
                    <Input
                      id="edit-mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-pin">New PIN</Label>
                    <Input
                      id="edit-pin"
                      type="password"
                      value={formData.pin}
                      onChange={(e) => setFormData({...formData, pin: e.target.value})}
                      placeholder="4-digit PIN (leave empty to keep current)"
                      maxLength={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to keep current PIN
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditingUser(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateUser}>
                    Update User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};
