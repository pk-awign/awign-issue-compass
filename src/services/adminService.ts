import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/issue';
import { Issue } from '@/types/issue';
import { TicketService } from './ticketService';

export interface TicketAnalytics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  sev1Tickets: number;
  sev2Tickets: number;
  sev3Tickets: number;
  assignedTickets: number;
  unassignedTickets: number;
  slaBreachedTickets: number;
  avgResolutionHours: number;
  cityBreakdown: Array<{ city: string; count: number }>;
  centreBreakdown: Array<{ centreCode: string; count: number }>;
  resolverBreakdown: Array<{ resolver: string; count: number }>;
  approverBreakdown: Array<{ approver: string; count: number }>;
}

export class AdminService {
  static async initializeSampleUsers(): Promise<boolean> {
    try {
      // Check if sample users already exist
      const { data: existingUsers, error: existingUsersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      if (existingUsersError) {
        console.error('Error checking existing users:', existingUsersError);
        throw existingUsersError;
      }

      if (existingUsers && existingUsers.length > 0) {
        console.log('Sample users already exist. Skipping initialization.');
        return true; // Sample users already exist
      }

      // Sample user data with pin_hash and pin
      const sampleUsers = [
        {
          name: 'Mumbai Supervisor',
          role: 'resolver',
          city: 'Mumbai',
          centre_code: 'MUM001',
          mobile_number: '9876543210',
          is_active: true,
          pin_hash: 'default_pin_hash',
          pin: '1234',
        },
        {
          name: 'Delhi City Owner',
          role: 'approver',
          city: 'Delhi',
          centre_code: 'DEL001',
          mobile_number: '9876543211',
          is_active: true,
          pin_hash: 'default_pin_hash',
          pin: '2345',
        },
        {
          name: 'Kolkata Invigilator',
          role: 'invigilator',
          city: 'Kolkata',
          centre_code: 'KOL001',
          mobile_number: '9876543212',
          is_active: true,
          pin_hash: 'default_pin_hash',
          pin: '3456',
        },
        {
          name: 'Chennai Operations Head',
          role: 'super_admin',
          city: 'Chennai',
          centre_code: 'CHE001',
          mobile_number: '9876543213',
          is_active: true,
          pin_hash: 'default_pin_hash',
          pin: '4567',
        },
        {
          name: 'Bangalore Public User',
          role: 'invigilator',
          city: 'Bangalore',
          mobile_number: '9876543214',
          is_active: false,
          pin_hash: 'default_pin_hash',
          pin: '5678',
        },
        {
          name: 'Jaipur Invigilator',
          role: 'invigilator',
          city: 'Jaipur',
          centre_code: 'JAI001',
          mobile_number: '9876543215',
          is_active: true,
          pin_hash: 'default_pin_hash',
          pin: '6789',
        },
        {
          name: 'Pune Supervisor',
          role: 'resolver',
          city: 'Pune',
          centre_code: 'PUN001',
          mobile_number: '9876543216',
          is_active: true,
          pin_hash: 'default_pin_hash',
          pin: '7890',
        },
        {
          name: 'Hyderabad City Owner',
          role: 'approver',
          city: 'Hyderabad',
          centre_code: 'HYD001',
          mobile_number: '9876543217',
          is_active: true,
          pin_hash: 'default_pin_hash',
          pin: '8901',
        },
        {
          name: 'Ahmedabad Operations Head',
          role: 'super_admin',
          city: 'Ahmedabad',
          centre_code: 'AMD001',
          mobile_number: '9876543218',
          is_active: true,
          pin_hash: 'default_pin_hash',
          pin: '9012',
        },
        {
          name: 'Lucknow Public User',
          role: 'invigilator',
          city: 'Lucknow',
          mobile_number: '9876543219',
          is_active: false,
          pin_hash: 'default_pin_hash',
          pin: '0123',
        },
      ];

      // Insert sample users into the database
      const { data, error } = await supabase
        .from('users')
        .insert(sampleUsers);

      if (error) {
        console.error('Error initializing sample users:', error);
        throw error;
      }

      console.log('Sample users initialized successfully:', data);
      return true;
    } catch (error) {
      console.error('Error in initializeSampleUsers:', error);
      return false;
    }
  }

  static async createUser(userData: Omit<User, 'id'>): Promise<boolean> {
    try {
      const insertData: any = {
        name: userData.name,
        role: this.mapUserRoleToDatabaseRole(userData.role),
        city: userData.city,
        centre_code: userData.centreCode,
        mobile_number: userData.mobile,
        is_active: userData.isActive !== undefined ? userData.isActive : true,
        pin_hash: 'default_pin_hash', // This will be replaced with actual PIN hashing
      };

      // Add PIN if provided
      if ('pin' in userData && userData.pin) {
        insertData.pin = userData.pin; // Store PIN directly (in production, this should be hashed)
      } else {
        // Generate a default PIN if not provided
        insertData.pin = '0000';
      }

      const { data, error } = await supabase
        .from('users')
        .insert([insertData]);

      if (error) {
        console.error('Error creating user:', error);
        return false;
      }

      console.log('User created successfully:', data);
      return true;
    } catch (error) {
      console.error('Error in createUser:', error);
      return false;
    }
  }

  static async updateUser(userId: string, userData: Partial<User & { pin?: string }>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (userData.name) updateData.name = userData.name;
      if (userData.role) updateData.role = this.mapUserRoleToDatabaseRole(userData.role);
      if (userData.city) updateData.city = userData.city;
      if (userData.centreCode) updateData.centre_code = userData.centreCode;
      if (userData.mobile) updateData.mobile_number = userData.mobile;
      if (userData.isActive !== undefined) updateData.is_active = userData.isActive;
      
      // Add PIN if provided
      if (userData.pin) {
        updateData.pin = userData.pin; // Store PIN directly (in production, this should be hashed)
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        return false;
      }

      console.log('User updated successfully:', data);
      return true;
    } catch (error) {
      console.error('Error in updateUser:', error);
      return false;
    }
  }

  static async toggleUserStatus(userId: string, isActive: boolean): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) {
        console.error('Error toggling user status:', error);
        return false;
      }

      console.log('User status updated successfully:', data);
      return true;
    } catch (error) {
      console.error('Error in toggleUserStatus:', error);
      return false;
    }
  }

  static async grantUserPermissions(userId: string, permissions: string[]): Promise<boolean> {
    try {
      // Delete existing permissions for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Insert new permissions
      if (permissions.length > 0) {
        const permissionRecords = permissions.map(permission => ({
          user_id: userId,
          permission: permission
        }));

        const { data, error } = await supabase
          .from('user_permissions')
          .insert(permissionRecords);

        if (error) {
          console.error('Error granting permissions:', error);
          return false;
        }
      }

      console.log('Permissions updated successfully');
      return true;
    } catch (error) {
      console.error('Error in grantUserPermissions:', error);
      return false;
    }
  }

  static async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      // Map the database users to our User type with proper role mapping
      return (data || []).map(user => ({
        id: user.id,
        name: user.name,
        role: this.mapDatabaseRoleToUserRole(user.role),
        city: user.city || '',
        centreCode: user.centre_code || '',
        mobile: user.mobile_number || '',
        pin: user.pin, // Include PIN in user data (for display purposes only)
        isActive: user.is_active,
        lastActivity: user.last_activity_at ? new Date(user.last_activity_at) : undefined,
        lastLogin: user.last_login_at ? new Date(user.last_login_at) : undefined
      }));
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return [];
    }
  }

  static async getAllTickets(includeDeleted: boolean = false): Promise<Issue[]> {
    try {
      const query = supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (!includeDeleted) {
        query.eq('deleted', false);
      }
      const { data, error } = await query;
      if (error) throw error;

      // Get all users to map IDs to names
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, role');

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Get all ticket assignments from the new ticket_assignees table
      const { data: assignments, error: assignmentsError } = await supabase
        .from('ticket_assignees')
        .select('*');

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
      }

      const userMap = new Map();
      if (users) {
        users.forEach(user => {
          userMap.set(user.id, { name: user.name, role: user.role });
        });
      }

      // Create assignment maps
      const ticketAssignments = new Map<string, { user_id: string; role: string }[]>();
      if (assignments) {
        assignments.forEach(assignment => {
          if (!ticketAssignments.has(assignment.ticket_id)) {
            ticketAssignments.set(assignment.ticket_id, []);
          }
          ticketAssignments.get(assignment.ticket_id)!.push({
            user_id: assignment.user_id,
            role: assignment.role
          });
        });
      }

      // Map database tickets to Issue type, including comments and attachments
      return (data || []).map(ticket => {
        // Get assignments for this ticket
        const ticketAssigns = ticketAssignments.get(ticket.id) || [];
        const resolverAssignment = ticketAssigns.find(a => a.role === 'resolver');
        const approverAssignment = ticketAssigns.find(a => a.role === 'approver');

        return {
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          centreCode: ticket.centre_code,
          city: ticket.city,
          resourceId: ticket.resource_id,
          awignAppTicketId: ticket.awign_app_ticket_id,
          issueCategory: ticket.issue_category as any,
          issueDescription: ticket.issue_description,
          issueDate: ticket.issue_date || { type: 'single', dates: [] },
          severity: ticket.severity as any,
          status: ticket.status as any,
          isAnonymous: ticket.is_anonymous,
          submittedBy: ticket.submitted_by,
          submittedByUserId: ticket.submitted_by_user_id,
          submittedAt: ticket.submitted_at ? new Date(ticket.submitted_at) : new Date(),
          assignedResolver: resolverAssignment?.user_id || ticket.assigned_resolver,
          assignedApprover: approverAssignment?.user_id || ticket.assigned_approver,
          comments: ticket.comments ? ticket.comments.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            author: comment.author,
            authorRole: comment.author_role,
            timestamp: new Date(comment.created_at),
            isInternal: comment.is_internal,
          })) : [],
          attachments: ticket.attachments ? ticket.attachments.map((attachment: any) => ({
            id: attachment.id,
            fileName: attachment.file_name,
            fileSize: attachment.file_size,
            fileType: attachment.file_type,
            uploadedAt: attachment.uploaded_at ? new Date(attachment.uploaded_at) : undefined,
            downloadUrl: `${import.meta.env.VITE_SUPABASE_URL || 'https://mvwxlfvvxwhzobyjpxsg.supabase.co'}/storage/v1/object/public/ticket-attachments/${attachment.storage_path}`
          })) : [],
          resolutionNotes: ticket.resolution_notes,
          resolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : undefined,
          assignedResolverDetails: userMap.get(resolverAssignment?.user_id || ticket.assigned_resolver),
          assignedApproverDetails: userMap.get(approverAssignment?.user_id || ticket.assigned_approver),
          deleted: ticket.deleted,
          // Safe fallbacks for enhanced fields
          reopenCount: ticket.reopen_count || 0,
          lastReopenedAt: ticket.last_reopened_at ? new Date(ticket.last_reopened_at) : undefined,
          reopenedBy: ticket.reopened_by,
          reopenedByDetails: ticket.reopened_by_name ? {
            name: ticket.reopened_by_name,
            role: ticket.reopened_by_role || 'super_admin'
          } : undefined,
          statusChangedAt: ticket.status_changed_at ? new Date(ticket.status_changed_at) : undefined,
          statusChangedBy: ticket.status_changed_by,
          statusChangedByDetails: ticket.status_changed_by_name ? {
            name: ticket.status_changed_by_name,
            role: ticket.status_changed_by_role || 'system'
          } : undefined,
          timeline: ticket.timeline || [],
        };
      });
    } catch (error) {
      console.error('Error in getAllTickets:', error);
      return [];
    }
  }

  static async getUsersByRole(role: 'resolver' | 'approver'): Promise<User[]> {
    try {
      console.log(`🔄 Getting users by role: ${role}`);
      
      // Map the new role names to database role names
      const dbRole = this.mapUserRoleToDatabaseRole(role);
      console.log(`📋 Mapped role '${role}' to database role '${dbRole}'`);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', dbRole)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching users by role:', error);
        throw error;
      }

      console.log(`📊 Found ${data?.length || 0} users with role '${dbRole}'`);
      if (data && data.length > 0) {
        console.log('👥 Users found:', data.map(u => ({ id: u.id, name: u.name, role: u.role, is_active: u.is_active })));
      }

      // Map the database users to our User type
      const mappedUsers = (data || []).map(user => ({
        id: user.id,
        name: user.name,
        role: this.mapDatabaseRoleToUserRole(user.role),
        city: user.city || '',
        centreCode: user.centre_code || '',
        mobile: user.mobile_number || '',
        isActive: user.is_active,
        lastActivity: user.last_activity_at ? new Date(user.last_activity_at) : undefined,
        lastLogin: user.last_login_at ? new Date(user.last_login_at) : undefined
      }));

      console.log(`✅ Returning ${mappedUsers.length} mapped users for role '${role}'`);
      return mappedUsers;
    } catch (error) {
      console.error('❌ Error in getUsersByRole:', error);
      return [];
    }
  }

  static async bulkAssignTickets(ticketIds: string[], resolverId: string): Promise<boolean> {
    try {
      console.log(`🔄 Starting bulk assignment for ${ticketIds.length} tickets to resolver ${resolverId}`);
      
      // Use individual updates instead of bulk upsert
      const updatePromises = ticketIds.map(async ticketId => {
        try {
          // 1. Update legacy field
          const { error: updateError } = await supabase
            .from('tickets')
            .update({
              assigned_resolver: resolverId,
              status: 'in_progress'
            })
            .eq('id', ticketId);
          
          if (updateError) {
            console.error(`❌ Failed to update ticket ${ticketId}:`, updateError);
            return { success: false, error: updateError };
          }
          
          // 2. Add to ticket_assignees (new flow)
          try {
            await TicketService.addAssignee(ticketId, resolverId, 'resolver', resolverId, 'System', 'super_admin');
            console.log(`✅ Successfully assigned ticket ${ticketId} to resolver ${resolverId}`);
            return { success: true, error: null };
          } catch (assigneeError) {
            console.error(`❌ Failed to add assignee for ticket ${ticketId}:`, assigneeError);
            return { success: false, error: assigneeError };
          }
        } catch (ticketError) {
          console.error(`❌ Error processing ticket ${ticketId}:`, ticketError);
          return { success: false, error: ticketError };
        }
      });

      const results = await Promise.all(updatePromises);
      
      // Check results
      const successfulAssignments = results.filter(r => r.success).length;
      const failedAssignments = results.filter(r => !r.success).length;
      
      console.log(`📊 Bulk assignment results: ${successfulAssignments} successful, ${failedAssignments} failed`);
      
      if (failedAssignments > 0) {
        console.error('❌ Some bulk assignments failed');
        return false;
      }

      console.log('✅ Bulk assigned tickets successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in bulkAssignTickets:', error);
      return false;
    }
  }

  static async assignTicket(params: { ticketId: string; assignedTo: string; type: string }): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .update({ assigned_resolver: params.assignedTo })
        .eq('id', params.ticketId);

      if (error) {
        console.error('Error assigning ticket:', error);
        return false;
      }

      console.log('Ticket assigned successfully:', data);
      return true;
    } catch (error) {
      console.error('Error in assignTicket:', error);
      return false;
    }
  }

  static async assignToApprover(ticketId: string, approverId: string): Promise<boolean> {
    try {
      console.log(`🔄 Assigning ticket ${ticketId} to approver ${approverId}`);
      
      // 1. Update the legacy field for compatibility
      const { data, error } = await supabase
        .from('tickets')
        .update({ assigned_approver: approverId })
        .eq('id', ticketId);

      if (error) {
        console.error('❌ Error assigning ticket to approver:', error);
        return false;
      }

      // 2. Add to ticket_assignees if not already present
      try {
        // Fetch current assignees for this ticket
        const { data: assigneesData, error: assigneesError } = await supabase
          .from('ticket_assignees')
          .select('*')
          .eq('ticket_id', ticketId)
          .eq('user_id', approverId)
          .eq('role', 'approver');
          
        if (assigneesError) {
          console.error('❌ Error checking existing assignees:', assigneesError);
          return false;
        }
        
        if (!assigneesData || assigneesData.length === 0) {
          // Add the approver to ticket_assignees
          await TicketService.addAssignee(ticketId, approverId, 'approver', approverId, 'System', 'super_admin');
          console.log(`✅ Successfully added approver ${approverId} to ticket ${ticketId}`);
        } else {
          console.log(`ℹ️ Approver ${approverId} already assigned to ticket ${ticketId}`);
        }
      } catch (assigneeError) {
        console.error('❌ Error adding approver to ticket_assignees:', assigneeError);
        return false;
      }

      console.log('✅ Ticket assigned to approver successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Error in assignToApprover:', error);
      return false;
    }
  }

  static async updateTicketStatus(ticketId: string, status: string, resolutionNotes?: string): Promise<boolean> {
    try {
      const updateData: any = { status };
      if (resolutionNotes) {
        updateData.resolution_notes = resolutionNotes;
      }
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) {
        console.error('Error updating ticket status:', error);
        return false;
      }

      console.log('Ticket status updated successfully:', data);
      return true;
    } catch (error) {
      console.error('Error in updateTicketStatus:', error);
      return false;
    }
  }

  static async getTicketAnalytics(): Promise<TicketAnalytics> {
    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*');

      if (error) {
        console.error('Error fetching tickets for analytics:', error);
        throw error;
      }

      if (!tickets) {
        return this.getEmptyAnalytics();
      }

      // Get all users to map IDs to names
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, role');

      if (usersError) {
        console.error('Error fetching users for analytics:', usersError);
      }

      // Get all ticket assignments from the new ticket_assignees table
      const { data: assignments, error: assignmentsError } = await supabase
        .from('ticket_assignees')
        .select('*');

      if (assignmentsError) {
        console.error('Error fetching assignments for analytics:', assignmentsError);
      }

      const userMap = new Map();
      if (users) {
        users.forEach(user => {
          userMap.set(user.id, { name: user.name, role: user.role });
        });
      }

      // Create assignment maps
      const ticketAssignments = new Map<string, { user_id: string; role: string }[]>();
      if (assignments) {
        assignments.forEach(assignment => {
          if (!ticketAssignments.has(assignment.ticket_id)) {
            ticketAssignments.set(assignment.ticket_id, []);
          }
          ticketAssignments.get(assignment.ticket_id)!.push({
            user_id: assignment.user_id,
            role: assignment.role
          });
        });
      }

      // Calculate metrics
      const totalTickets = tickets.length;
      const openTickets = tickets.filter(t => t.status === 'open').length;
      const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
      const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
      const closedTickets = tickets.filter(t => t.status === 'closed').length;
      
      const sev1Tickets = tickets.filter(t => t.severity === 'sev1').length;
      const sev2Tickets = tickets.filter(t => t.severity === 'sev2').length;
      const sev3Tickets = tickets.filter(t => t.severity === 'sev3').length;
      
      // Calculate assignments using new ticket_assignees table
      const assignedTickets = tickets.filter(t => {
        const ticketAssigns = ticketAssignments.get(t.id);
        return ticketAssigns && ticketAssigns.some(a => a.role === 'resolver');
      }).length;
      const unassignedTickets = totalTickets - assignedTickets;
      const slaBreachedTickets = tickets.filter(t => t.is_sla_breached).length;

      // Calculate average resolution time
      const resolvedWithTime = tickets.filter(t => t.resolution_time_hours);
      const avgResolutionHours = resolvedWithTime.length > 0 
        ? resolvedWithTime.reduce((sum, t) => sum + (t.resolution_time_hours || 0), 0) / resolvedWithTime.length
        : 0;

      // Calculate breakdowns
      const cityMap = new Map<string, number>();
      const centreMap = new Map<string, number>();
      const resolverMap = new Map<string, number>();
      const approverMap = new Map<string, number>();

      tickets.forEach(ticket => {
        // City breakdown
        cityMap.set(ticket.city, (cityMap.get(ticket.city) || 0) + 1);
        
        // Centre breakdown
        centreMap.set(ticket.centre_code, (centreMap.get(ticket.centre_code) || 0) + 1);
        
        // Resolver breakdown - use new ticket_assignees data
        const ticketAssigns = ticketAssignments.get(ticket.id);
        if (ticketAssigns) {
          const resolverAssignment = ticketAssigns.find(a => a.role === 'resolver');
          if (resolverAssignment) {
            const userDetails = userMap.get(resolverAssignment.user_id);
            const resolverName = userDetails ? userDetails.name : resolverAssignment.user_id;
            resolverMap.set(resolverName, (resolverMap.get(resolverName) || 0) + 1);
          }
          
          // Approver breakdown - use new ticket_assignees data
          const approverAssignment = ticketAssigns.find(a => a.role === 'approver');
          if (approverAssignment) {
            const userDetails = userMap.get(approverAssignment.user_id);
            const approverName = userDetails ? userDetails.name : approverAssignment.user_id;
            approverMap.set(approverName, (approverMap.get(approverName) || 0) + 1);
          }
        }
      });

      const cityBreakdown = Array.from(cityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      const centreBreakdown = Array.from(centreMap.entries())
        .map(([centreCode, count]) => ({ centreCode, count }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      const resolverBreakdown = Array.from(resolverMap.entries())
        .map(([resolver, count]) => ({ resolver, count }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      const approverBreakdown = Array.from(approverMap.entries())
        .map(([approver, count]) => ({ approver, count }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      return {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        sev1Tickets,
        sev2Tickets,
        sev3Tickets,
        assignedTickets,
        unassignedTickets,
        slaBreachedTickets,
        avgResolutionHours,
        cityBreakdown,
        centreBreakdown,
        resolverBreakdown,
        approverBreakdown
      };
    } catch (error) {
      console.error('Error in getTicketAnalytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  private static getEmptyAnalytics(): TicketAnalytics {
    return {
      totalTickets: 0,
      openTickets: 0,
      inProgressTickets: 0,
      resolvedTickets: 0,
      closedTickets: 0,
      sev1Tickets: 0,
      sev2Tickets: 0,
      sev3Tickets: 0,
      assignedTickets: 0,
      unassignedTickets: 0,
      slaBreachedTickets: 0,
      avgResolutionHours: 0,
      cityBreakdown: [],
      centreBreakdown: [],
      resolverBreakdown: [],
      approverBreakdown: []
    };
  }

  private static parseIssueDate(issueDate: any): Issue['issueDate'] {
    // Handle case where issueDate is already properly structured
    if (typeof issueDate === 'object' && issueDate !== null && issueDate.type) {
      return {
        type: issueDate.type,
        dates:
          issueDate.type === 'multiple'
            ? issueDate.dates?.map((d: any) =>
                typeof d === 'object' && d.date
                  ? { date: new Date(d.date), description: d.description || '' }
                  : { date: new Date(d), description: '' }
              ) || []
            : issueDate.dates ? issueDate.dates.map((d: any) => new Date(d)) : [],
        startDate: issueDate.startDate ? new Date(issueDate.startDate) : undefined,
        endDate: issueDate.endDate ? new Date(issueDate.endDate) : undefined
      };
    }

    // Handle string or other formats - provide a default structure
    return {
      type: 'single',
      dates: [new Date()],
      startDate: undefined,
      endDate: undefined
    };
  }

  // Helper method to map database roles to User type roles
  private static mapDatabaseRoleToUserRole(dbRole: string): User['role'] {
    switch (dbRole) {
      case 'resolver':
        return 'resolver';
      case 'approver':
        return 'approver';
      case 'super_admin':
        return 'super_admin';
      case 'invigilator':
        return 'invigilator';
      default:
        return 'invigilator';
    }
  }

  // Helper method to map User type roles to database roles
  private static mapUserRoleToDatabaseRole(userRole: User['role']): string {
    switch (userRole) {
      case 'resolver':
        return 'resolver';
      case 'approver':
        return 'approver';
      case 'super_admin':
        return 'super_admin';
      case 'invigilator':
        return 'invigilator';
      default:
        return 'invigilator';
    }
  }

  static async getUserById(userId: string): Promise<{ name: string; role: string } | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        return null;
      }

      return data ? { name: data.name, role: data.role } : null;
    } catch (error) {
      console.error('Error in getUserById:', error);
      return null;
    }
  }

  // Soft delete a ticket by ID (Super Admin only)
  static async deleteTicket(ticketId: string): Promise<boolean> {
    try {
      console.log('Soft deleting ticket:', ticketId);
      const { error } = await supabase
        .from('tickets')
        .update({ deleted: true })
        .eq('id', ticketId);
      if (error) {
        console.error('Error soft deleting ticket:', error);
        return false;
      }
      console.log('Ticket soft deleted successfully:', ticketId);
      return true;
    } catch (error) {
      console.error('Error in deleteTicket:', error);
      return false;
    }
  }

  // Delete a user by ID (Super Admin only)
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      console.log('Deleting user data for:', userId);
      
      // Check if user has any tickets before deleting
      const { data: userTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id')
        .eq('submitted_by_user_id', userId);
      
      if (ticketsError) {
        console.error('Error checking user tickets:', ticketsError);
        return false;
      }
      
      // Delete all tickets by this user (but keep the user)
      if (userTickets && userTickets.length > 0) {
        console.log(`User has ${userTickets.length} tickets. Deleting tickets but keeping user.`);
        
        // Delete all tickets by this user
        for (const ticket of userTickets) {
          await this.deleteTicket(ticket.id);
        }
      }
      
      // Delete user's comments
      await supabase.from('comments').delete().eq('author', userId);
      
      // Delete user's ticket assignments
      await supabase.from('ticket_assignees').delete().eq('user_id', userId);
      
      // Note: We're NOT deleting the user record - just cleaning up their data
      console.log('User data cleaned successfully. User record preserved:', userId);
      return true;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      return false;
    }
  }
}
