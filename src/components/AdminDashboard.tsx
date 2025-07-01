import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  Ticket, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  UserPlus,
  Settings,
  Navigation,
  Shield,
  RefreshCw,
  AlertTriangle,
  FileText,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIssues } from '@/contexts/IssueContext';
import { AdminService } from '@/services/adminService';
import { Issue, User } from '@/types/issue';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RandomTicketGenerator } from './dev/RandomTicketGenerator';
import { DashboardRouter } from './admin/DashboardRouter';
import { TicketDetailsModal } from './admin/TicketDetailsModal';
import { UserManagementModal } from './admin/UserManagementModal';
import { EnhancedTicketManagement } from './admin/EnhancedTicketManagement';
import { EmailTestComponent } from './dev/EmailTestComponent';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { issues, refreshIssues } = useIssues();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Issue | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [showDashboardRouter, setShowDashboardRouter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // New user form state
  const [newUser, setNewUser] = useState({
    name: '',
    mobile: '',
    role: 'invigilator' as User['role'],
    city: '',
    centreCode: '',
    pin: '', // Add PIN field
    isActive: true
  });

  useEffect(() => {
    loadUsers();
    refreshIssues();
    initializeSampleData();
  }, []);

  const initializeSampleData = async () => {
    try {
      await AdminService.initializeSampleUsers();
      console.log('Sample users initialized');
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const userData = await AdminService.getAllUsers();
      setUsers(userData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const validatePin = (pin: string): boolean => {
    return /^\d{4}$/.test(pin);
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.mobile || !newUser.city || !newUser.pin) {
      toast.error('Please fill in all required fields including PIN');
      return;
    }

    if (!validatePin(newUser.pin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }

    setLoading(true);
    try {
      const success = await AdminService.createUser({
        name: newUser.name,
        mobile: newUser.mobile,
        role: newUser.role,
        city: newUser.city,
        centreCode: newUser.centreCode,
        pin: newUser.pin, // Include PIN in user creation
        isActive: newUser.isActive
      });
      
      if (success) {
        toast.success('User created successfully with PIN');
        setShowUserModal(false);
        setNewUser({
          name: '',
          mobile: '',
          role: 'invigilator',
          city: '',
          centreCode: '',
          pin: '', // Reset PIN field
          isActive: true
        });
        loadUsers();
      } else {
        toast.error('Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSwitch = (role: 'super_admin' | 'resolver' | 'approver' | 'invigilator') => {
    setShowDashboardRouter(false);
    // The DashboardRouter will handle the navigation
  };

  const getStatusBadge = (status: Issue['status']) => {
    const statusConfig = {
      open: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      closed: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: Issue['severity']) => {
    const severityConfig = {
      sev1: 'bg-red-100 text-red-800',
      sev2: 'bg-orange-100 text-orange-800',
      sev3: 'bg-blue-100 text-blue-800'
    };

    return (
      <Badge className={severityConfig[severity]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const filteredIssues = issues.filter(issue => {
    const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
    const matchesCity = filterCity === 'all' || issue.city === filterCity;
    const matchesSearch = searchTerm === '' || 
      issue.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.issueDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.submittedBy?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesCity && matchesSearch;
  });

  const stats = {
    totalTickets: issues.length,
    openTickets: issues.filter(i => i.status === 'open').length,
    inProgressTickets: issues.filter(i => i.status === 'in_progress').length,
    resolvedTickets: issues.filter(i => i.status === 'resolved').length,
    totalUsers: users.length,
    activeResolvers: users.filter(u => u.role === 'resolver' && u.isActive).length,
    activeApprovers: users.filter(u => u.role === 'approver' && u.isActive).length
  };

  const cities = [...new Set(issues.map(issue => issue.city))];

  const getUserName = (userId: string | undefined) => {
    if (!userId) return 'Not assigned';
    const user = users.find(u => u.id === userId);
    return user ? `${user.name} (${user.role})` : userId;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleTicketUpdate = () => {
    refreshIssues();
    loadUsers();
    setShowTicketModal(false);
    setShowUserManagementModal(false);
  };

  const openTicketDetails = (ticket: Issue) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
  };

  const openUserManagement = () => {
    setShowUserManagementModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600">Complete system management and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowDashboardRouter(true)} variant="outline">
            <Navigation className="h-4 w-4 mr-2" />
            Dashboard Router
          </Button>
          <Button onClick={openUserManagement} variant="secondary">
            <Settings className="h-4 w-4 mr-2" />
            User Management
          </Button>
          <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Quick Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile">Mobile *</Label>
                    <Input
                      id="mobile"
                      value={newUser.mobile}
                      onChange={(e) => setNewUser(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="Enter mobile number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Role</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value as User['role'] }))}>
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
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={newUser.city}
                      onChange={(e) => setNewUser(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Enter city"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="centreCode">Centre Code</Label>
                    <Input
                      id="centreCode"
                      value={newUser.centreCode}
                      onChange={(e) => setNewUser(prev => ({ ...prev, centreCode: e.target.value }))}
                      placeholder="Enter centre code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pin">PIN *</Label>
                    <Input
                      id="pin"
                      type="password"
                      value={newUser.pin}
                      onChange={(e) => setNewUser(prev => ({ ...prev, pin: e.target.value }))}
                      placeholder="Enter 4-digit PIN"
                      maxLength={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter exactly 4 digits for user login
                    </p>
                  </div>
                </div>
                <Button onClick={handleCreateUser} disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Create User with PIN'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold">{stats.totalTickets}</p>
              </div>
              <Ticket className="h-7 w-7 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open</p>
                <p className="text-2xl font-bold text-red-600">{stats.openTickets}</p>
              </div>
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgressTickets}</p>
              </div>
              <Clock className="h-7 w-7 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolvedTickets}</p>
              </div>
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-7 w-7 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolvers</p>
                <p className="text-2xl font-bold">{stats.activeResolvers}</p>
              </div>
              <Shield className="h-7 w-7 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approvers</p>
                <p className="text-2xl font-bold">{stats.activeApprovers}</p>
              </div>
              <Shield className="h-7 w-7 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Random Ticket Generator for development */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-4">Development Tools</h3>
        <RandomTicketGenerator />
      </div>

      {/* Email Test Component for debugging */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">Email Data Flow Test</h3>
        <EmailTestComponent />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList className="flex flex-col items-center gap-2 bg-muted p-4 rounded-xl border shadow-md my-4 md:flex-row md:items-stretch md:justify-start">
          <TabsTrigger value="tickets" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">
            Tickets
          </TabsTrigger>
          <TabsTrigger value="users" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">
            Users
          </TabsTrigger>
          <TabsTrigger value="analytics" className="w-full rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow text-center">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Tickets ({filteredIssues.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto min-w-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket #</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIssues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell className="font-mono text-sm">{issue.ticketNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{issue.issueCategory.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-600 truncate max-w-[200px]">
                              {issue.issueDescription}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{issue.city}</TableCell>
                        <TableCell>{getSeverityBadge(issue.severity)}</TableCell>
                        <TableCell>{getStatusBadge(issue.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {/* Resolvers */}
                            {issue.assignees && issue.assignees.filter(a => a.role === 'resolver').length > 0 ? (
                              <div>
                                {issue.assignees.filter(a => a.role === 'resolver').map(a => {
                                  const u = users.find(u => u.id === a.user_id);
                                  return (
                                    <span key={a.user_id + a.role} className="font-medium mr-1">{u ? u.name : a.user_id} <Badge variant="outline">resolver</Badge></span>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-muted-foreground">Unassigned</div>
                            )}
                            {/* Approvers */}
                            {issue.assignees && issue.assignees.filter(a => a.role === 'approver').length > 0 ? (
                              <div className="mt-1">
                                {issue.assignees.filter(a => a.role === 'approver').map(a => {
                                  const u = users.find(u => u.id === a.user_id);
                                  return (
                                    <span key={a.user_id + a.role} className="font-medium mr-1">{u ? u.name : a.user_id} <Badge variant="outline">approver</Badge></span>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-xs mt-1">No approver</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{format(issue.submittedAt, 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTicketDetails(issue)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {user?.role === 'super_admin' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTicket(issue);
                                  setShowUserManagementModal(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Centre Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.mobile}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.city}</TableCell>
                      <TableCell>{user.centreCode || '-'}</TableCell>
                      <TableCell>
                        <Badge className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastActivity 
                          ? format(user.lastActivity, 'MMM dd, yyyy') 
                          : 'Never'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Tickets by City</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {cities.map(city => {
                    const cityTickets = issues.filter(i => i.city === city).length;
                    return (
                      <div key={city} className="flex justify-between items-center">
                        <span>{city}</span>
                        <Badge variant="outline">{cityTickets}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['invigilator', 'resolver', 'approver', 'super_admin'].map(role => {
                    const roleUsers = users.filter(u => u.role === role).length;
                    return (
                      <div key={role} className="flex justify-between items-center">
                        <span>{role.replace('_', ' ')}</span>
                        <Badge variant="outline">{roleUsers}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Ticket Details Modal */}
      <TicketDetailsModal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        ticket={selectedTicket}
        onTicketUpdate={handleTicketUpdate}
      />

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={showUserManagementModal}
        onClose={() => setShowUserManagementModal(false)}
      />

      {/* Dashboard Router Modal */}
      <Dialog open={showDashboardRouter} onOpenChange={setShowDashboardRouter}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Dashboard Management</DialogTitle>
          </DialogHeader>
          <DashboardRouter 
            currentRole="super_admin" 
            onRoleSwitch={handleRoleSwitch}
          />
        </DialogContent>
      </Dialog>

      {/* Enhanced Management Modal */}
      {selectedTicket && (
        <Dialog open={showUserManagementModal} onOpenChange={setShowUserManagementModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enhanced Ticket Management - {selectedTicket.ticketNumber}</DialogTitle>
            </DialogHeader>
            <EnhancedTicketManagement 
              ticket={selectedTicket} 
              onUpdate={handleTicketUpdate}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminDashboard;
