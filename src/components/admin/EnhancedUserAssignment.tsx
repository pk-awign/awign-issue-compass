import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertCircle, CheckCircle } from 'lucide-react';
import { AdminService } from '@/services/adminService';
import { toast } from 'sonner';
import { User } from '@/types/issue';

interface EnhancedUserAssignmentProps {
  ticketIds: string[];
  onAssignmentComplete: () => void;
  className?: string;
}

export const EnhancedUserAssignment: React.FC<EnhancedUserAssignmentProps> = ({
  ticketIds,
  onAssignmentComplete,
  className = ''
}) => {
  const [resolvers, setResolvers] = useState<User[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [selectedResolver, setSelectedResolver] = useState<string>('');
  const [selectedApprover, setSelectedApprover] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      console.log('🔄 Loading users for assignment...');
      setLoading(true);

      // Initialize sample users if needed
      if (!isInitialized) {
        console.log('🚀 Initializing sample users...');
        await AdminService.initializeSampleUsers();
        setIsInitialized(true);
      }

      // Load resolvers and filter by role
      console.log('🔄 Loading resolvers...');
      const resolverData = await AdminService.getUsersByRole('resolver');
      const validResolvers = resolverData.filter(user => user.role === 'resolver');
      console.log('✅ Loaded resolvers:', validResolvers.length, validResolvers.map(r => r.name));

      // Load approvers and filter by role
      console.log('🔄 Loading approvers...');
      const approverData = await AdminService.getUsersByRole('approver');
      const validApprovers = approverData.filter(user => user.role === 'approver');
      console.log('✅ Loaded approvers:', validApprovers.length, validApprovers.map(a => a.name));

      setResolvers(validResolvers);
      setApprovers(validApprovers);

      if (validResolvers.length === 0 && validApprovers.length === 0) {
        console.warn('⚠️ No users available for assignment');
        toast.error('No users available for assignment. Please create users first.');
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      toast.error('Failed to load users for assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedResolver && !selectedApprover) {
      toast.error('Please select at least one user to assign');
      return;
    }
    
    console.log(`🔄 Starting bulk assignment for ${ticketIds.length} tickets`);
    console.log('Selected resolver:', selectedResolver);
    console.log('Selected approver:', selectedApprover);
    
    setLoading(true);
    try {
      let resolverSuccess = true;
      let approverSuccess = true;
      
      // If resolver is selected, assign resolver
      if (selectedResolver) {
        console.log(`🔄 Assigning ${ticketIds.length} tickets to resolver ${selectedResolver}`);
        resolverSuccess = await AdminService.bulkAssignTickets(ticketIds, selectedResolver);
        console.log(`Resolver assignment result: ${resolverSuccess ? 'SUCCESS' : 'FAILED'}`);
      }
      
      // If approver is selected, assign approver
      if (selectedApprover) {
        console.log(`🔄 Assigning ${ticketIds.length} tickets to approver ${selectedApprover}`);
        const promises = ticketIds.map(ticketId => AdminService.assignToApprover(ticketId, selectedApprover));
        const results = await Promise.all(promises);
        approverSuccess = results.every(r => r);
        console.log(`Approver assignment results: ${results.filter(r => r).length}/${results.length} successful`);
      }
      
      if (resolverSuccess && approverSuccess) {
        toast.success('Assignments updated successfully');
        setSelectedResolver('');
        setSelectedApprover('');
        onAssignmentComplete();
      } else if (resolverSuccess) {
        toast.error('Only resolver assignments succeeded');
      } else if (approverSuccess) {
        toast.error('Only approver assignments succeeded');
      } else {
        toast.error('Failed to assign tickets');
      }
    } catch (error) {
      console.error('❌ Error saving assignments:', error);
      toast.error('Failed to assign tickets');
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    await loadUsers();
    toast.success('User list refreshed');
  };

  if (loading && !isInitialized) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Initializing users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Assign {ticketIds.length} Ticket(s)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-full ${resolvers.length > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {resolvers.length > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium">Resolvers</div>
              <div className="text-xs text-muted-foreground">{resolvers.length} available</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-full ${approvers.length > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {approvers.length > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium">Approvers</div>
              <div className="text-xs text-muted-foreground">{approvers.length} available</div>
            </div>
          </div>
        </div>

        {/* Resolver Assignment */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Assign to Resolver</label>
          <div className="flex gap-2">
            <Select value={selectedResolver} onValueChange={setSelectedResolver}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={
                  resolvers.length === 0 
                    ? "No resolvers available" 
                    : "Select resolver..."
                } />
              </SelectTrigger>
              <SelectContent>
                {resolvers.map((resolver) => (
                  <SelectItem key={resolver.id} value={resolver.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{resolver.name}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {resolver.city}
                        </Badge>
                        {resolver.centreCode && (
                          <Badge variant="secondary" className="text-xs">
                            {resolver.centreCode}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Approver Assignment */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Assign to Approver</label>
          <div className="flex gap-2">
            <Select value={selectedApprover} onValueChange={setSelectedApprover}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={
                  approvers.length === 0 
                    ? "No approvers available" 
                    : "Select approver..."
                } />
              </SelectTrigger>
              <SelectContent>
                {approvers.map((approver) => (
                  <SelectItem key={approver.id} value={approver.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{approver.name}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {approver.city}
                        </Badge>
                        {approver.centreCode && (
                          <Badge variant="secondary" className="text-xs">
                            {approver.centreCode}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 border-t">
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSaveAssignments}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Refresh Button */}
        <div className="pt-2 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshUsers}
            disabled={loading}
            className="w-full"
          >
            Refresh User List
          </Button>
        </div>

        {/* Debug Info */}
        {(resolvers.length === 0 && approvers.length === 0) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">
              <strong>No users found!</strong>
              <ul className="mt-1 text-xs space-y-1">
                <li>• Check if sample users are created in the database</li>
                <li>• Verify user roles are set to 'resolver' or 'approver'</li>
                <li>• Ensure users are marked as active</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
