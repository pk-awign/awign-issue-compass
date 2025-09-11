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
  userDependencyTickets: number;
  opsInputRequiredTickets: number;
  approvedTickets: number;
  sendForApprovalTickets: number;
  sev1Tickets: number;
  sev2Tickets: number;
  sev3Tickets: number;
  assignedTickets: number;
  unassignedTickets: number;
  unassignedToResolverTickets: number;
  openTicketsAssignedToResolver: number;
  openTicketsUnassignedToResolver: number;
  slaBreachedTickets: number;
  avgResolutionHours: number;
  cityBreakdown: Array<{ city: string; count: number }>;
  centreBreakdown: Array<{ centreCode: string; count: number }>;
  resolverBreakdown: Array<{ resolver: string; count: number }>;
  approverBreakdown: Array<{ approver: string; count: number }>;
}

// Define a named interface for ticket filters to avoid deep type instantiation
export interface TicketFilters {
  searchQuery?: string;
  statusFilter?: string;
  severityFilter?: string;
  categoryFilter?: string;
  cityFilter?: string;
  resolverFilter?: string[];
  approverFilter?: string[];
  resourceIdFilter?: string[]; // Array of resource IDs for multiselect
  dateRange?: {
    from: Date;
    to?: Date;
  };
  // Show only tickets that are NOT assigned to any resolver
  onlyUnassignedResolver?: boolean;
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
        {
          name: 'Test User with Country Code',
          role: 'invigilator',
          city: 'Mumbai',
          centre_code: 'TEST001',
          mobile_number: '9163164789',
          is_active: true,
          pin_hash: 'default_pin_hash',
          pin: '1234',
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

  static async getAllTickets(includeDeleted: boolean = false, page: number = 1, limit: number = 50): Promise<{ tickets: Issue[]; total: number; hasMore: boolean }> {
    try {
      // Get total count for analytics
      const { count: totalCount, error: countError } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('deleted', includeDeleted);
      if (countError) throw countError;

      // Get paginated ticket numbers
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('deleted', includeDeleted)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
      if (error) throw error;

      // Fetch each ticket individually using TicketService to get full data with comments
      const ticketPromises = (tickets || []).map(async (ticket) => {
        return await TicketService.getTicketByNumber(ticket.ticket_number);
      });
      const resolvedTickets = await Promise.all(ticketPromises);
      const validTickets = resolvedTickets.filter(ticket => ticket !== null) as Issue[];

      const hasMore = (page * limit) < (totalCount || 0);
      return {
        tickets: validTickets,
        total: totalCount || 0,
        hasMore
      };
    } catch (error) {
      console.error('Error in getAllTickets:', error);
      return { tickets: [], total: 0, hasMore: false };
    }
  }

  static async getAllTicketsUnpaginated({ showDeleted = false, startDate, endDate }: { showDeleted?: boolean, startDate?: Date, endDate?: Date } = {}): Promise<Issue[]> {
    const allTickets: Issue[] = [];
    let page = 1;
    const BATCH_SIZE = 1000;
    
    while (true) {
      let query = supabase
        .from('tickets')
        .select(`*`)
        .order('submitted_at', { ascending: false })
        .range((page - 1) * BATCH_SIZE, page * BATCH_SIZE - 1);
      
      if (!showDeleted) {
        query = query.eq('deleted', false);
      }
      
      // Debug logging for ticket fetching
      console.log(`🔍 Fetching tickets batch ${page}, showDeleted: ${showDeleted}`);
      
      // Also check total count for debugging
      if (page === 1) {
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('deleted', false);
        console.log(`🔍 Total non-deleted tickets in DB: ${count}`);
      }

      if (startDate) {
        query = query.gte('submitted_at', startDate.toISOString());
      }
      if (endDate) {
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
        query = query.lt('submitted_at', adjustedEndDate.toISOString());
      }

      const { data, error } = await query as { data: any[], error: any };

      if (error) {
        console.error('Error fetching tickets unpaginated:', error);
        break; // Exit loop on error
      }
      if (!data || data.length === 0) {
        break; // Exit loop if no more data
      }

      const tickets: Issue[] = data.map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticket_number,
        awignAppTicketId: t.awign_app_ticket_id,
        centreCode: t.centre_code,
        city: t.city,
        resourceId: t.resource_id,
        issueCategory: t.issue_category,
        issueDescription: t.issue_description,
        issueDate: t.issue_date,
        severity: t.severity,
        status: t.status,
        submittedBy: t.submitted_by,
        submittedAt: t.submitted_at,
        assignedResolver: t.assigned_resolver,
        assignedApprover: t.assigned_approver,
        resolvedAt: t.resolved_at,
        approvedAt: t.approved_at,
        escalatedAt: t.escalated_at,
        isSlaBreached: t.is_sla_breached,
        deleted: t.deleted,
        resolutionPin: t.resolution_pin,
        isAnonymous: t.is_anonymous,
        comments: [], // Comments will be fetched separately if needed
        attachments: [], // Attachments will be fetched separately if needed
      }));

      allTickets.push(...tickets);
      page++;
    }
    
    console.log(`🔍 getAllTicketsUnpaginated completed: ${allTickets.length} tickets fetched`);
    return allTickets;
  }

  static async getFilteredTickets(
    includeDeleted: boolean = false,
    page: number = 1,
    limit: number = 50,
    filters: TicketFilters
  ): Promise<{ tickets: Issue[]; total: number; hasMore: boolean }> {
    try {
      // Build the base query
      let query = supabase
        .from('tickets')
        .select('id, ticket_number, resource_id, status, severity, issue_category, city, centre_code, created_at') // include all fields we filter on
        .eq('deleted', includeDeleted);

      // Apply filters
      if (filters.searchQuery) {
        const searchTerms = filters.searchQuery.split(',').map(term => term.trim()).filter(term => term.length > 0);
        
        if (searchTerms.length > 0) {
          // Build OR conditions for each search term
          const orConditions = searchTerms.map(term => 
            `ticket_number.ilike.%${term}%,issue_description.ilike.%${term}%,city.ilike.%${term}%,centre_code.ilike.%${term}%`
          );
          
          // Combine all OR conditions
          const combinedOrCondition = orConditions.join(',');
          query = query.or(combinedOrCondition);
        }
      }
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        console.log('🔍 [FILTER DEBUG] Status filter applied:', filters.statusFilter);
        query = query.eq('status', filters.statusFilter);
      }
      if (filters.severityFilter && filters.severityFilter !== 'all') {
        query = query.eq('severity', filters.severityFilter);
      }
      if (filters.categoryFilter && filters.categoryFilter !== 'all') {
        query = query.eq('issue_category', filters.categoryFilter);
      }
      if (filters.cityFilter && filters.cityFilter !== 'all') {
        query = query.eq('city', filters.cityFilter);
      }
      // Handle resolver filter using ticket_assignees table
      if (filters.resolverFilter && filters.resolverFilter.length > 0) {
        console.log('🔍 [FILTER DEBUG] Resolver filter applied:', filters.resolverFilter);
        const { data: resolverAssignedTickets, error: resolverError } = await supabase
          .from('ticket_assignees')
          .select('ticket_id')
          .eq('role', 'resolver')
          .in('user_id', filters.resolverFilter);
        
        if (resolverError) throw resolverError;
        
        console.log('🔍 [FILTER DEBUG] Resolver assignments found:', resolverAssignedTickets?.length || 0);
        
        if (resolverAssignedTickets && resolverAssignedTickets.length > 0) {
          const ticketIds = resolverAssignedTickets.map(t => t.ticket_id);
          console.log('🔍 [FILTER DEBUG] Filtering tickets by IDs:', ticketIds.slice(0, 5), '...');
          query = query.in('id', ticketIds);
        } else {
          // No tickets match the resolver filter, return empty result
          console.log('🔍 [FILTER DEBUG] No resolver assignments found, returning empty result');
          query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
        }
      }
      
      // Handle approver filter using ticket_assignees table
      if (filters.approverFilter && filters.approverFilter.length > 0) {
        const { data: approverAssignedTickets, error: approverError } = await supabase
          .from('ticket_assignees')
          .select('ticket_id')
          .eq('role', 'approver')
          .in('user_id', filters.approverFilter);
        
        if (approverError) throw approverError;
        
        if (approverAssignedTickets && approverAssignedTickets.length > 0) {
          const ticketIds = approverAssignedTickets.map(t => t.ticket_id);
          query = query.in('id', ticketIds);
        } else {
          // No tickets match the approver filter, return empty result
          query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
        }
      }
      if (filters.resourceIdFilter && filters.resourceIdFilter.length > 0) {
        query = query.in('resource_id', filters.resourceIdFilter);
      }
      
      // Date range filter
      if (filters.dateRange?.from) {
        const fromDate = filters.dateRange.from.toISOString();
        const toDate = filters.dateRange.to ? filters.dateRange.to.toISOString() : filters.dateRange.from.toISOString();
        query = query.gte('created_at', fromDate).lte('created_at', toDate);
      }

      // Note: We intentionally avoid server-side not.in filtering for onlyUnassignedResolver
      // to prevent very long URLs. We'll filter client-side below.

      // Build a separate count query (typesafe) with same filters
      let countQuery = supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('deleted', includeDeleted);

      if (filters.searchQuery) {
        const searchTerms = filters.searchQuery.split(',').map(term => term.trim()).filter(term => term.length > 0);
        if (searchTerms.length > 0) {
          const orConditions = searchTerms.map(term => 
            `ticket_number.ilike.%${term}%,issue_description.ilike.%${term}%,city.ilike.%${term}%,centre_code.ilike.%${term}%`
          );
          const combinedOrCondition = orConditions.join(',');
          countQuery = countQuery.or(combinedOrCondition);
        }
      }
      if (filters.statusFilter && filters.statusFilter !== 'all') {
        countQuery = countQuery.eq('status', filters.statusFilter);
      }
      if (filters.severityFilter && filters.severityFilter !== 'all') {
        countQuery = countQuery.eq('severity', filters.severityFilter);
      }
      if (filters.categoryFilter && filters.categoryFilter !== 'all') {
        countQuery = countQuery.eq('issue_category', filters.categoryFilter);
      }
      if (filters.cityFilter && filters.cityFilter !== 'all') {
        countQuery = countQuery.eq('city', filters.cityFilter);
      }
      // Handle resolver filter using ticket_assignees table for count query
      if (filters.resolverFilter && filters.resolverFilter.length > 0) {
        const { data: resolverAssignedTickets, error: resolverError } = await supabase
          .from('ticket_assignees')
          .select('ticket_id')
          .eq('role', 'resolver')
          .in('user_id', filters.resolverFilter);
        
        if (resolverError) throw resolverError;
        
        if (resolverAssignedTickets && resolverAssignedTickets.length > 0) {
          const ticketIds = resolverAssignedTickets.map(t => t.ticket_id);
          countQuery = countQuery.in('id', ticketIds);
        } else {
          // No tickets match the resolver filter, return empty result
          countQuery = countQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
        }
      }
      
      // Handle approver filter using ticket_assignees table for count query
      if (filters.approverFilter && filters.approverFilter.length > 0) {
        const { data: approverAssignedTickets, error: approverError } = await supabase
          .from('ticket_assignees')
          .select('ticket_id')
          .eq('role', 'approver')
          .in('user_id', filters.approverFilter);
        
        if (approverError) throw approverError;
        
        if (approverAssignedTickets && approverAssignedTickets.length > 0) {
          const ticketIds = approverAssignedTickets.map(t => t.ticket_id);
          countQuery = countQuery.in('id', ticketIds);
        } else {
          // No tickets match the approver filter, return empty result
          countQuery = countQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
        }
      }
      if (filters.resourceIdFilter && filters.resourceIdFilter.length > 0) {
        countQuery = countQuery.in('resource_id', filters.resourceIdFilter);
      }
      if (filters.dateRange?.from) {
        const fromDate = filters.dateRange.from.toISOString();
        const toDate = filters.dateRange.to ? filters.dateRange.to.toISOString() : filters.dateRange.from.toISOString();
        countQuery = countQuery.gte('created_at', fromDate).lte('created_at', toDate);
      }

      // For onlyUnassignedResolver, exclude tickets assigned to resolvers in ticket_assignees
      if (filters.onlyUnassignedResolver) {
        const { data: resolverAssignedForCount, error: raCountErr } = await supabase
          .from('ticket_assignees')
          .select('ticket_id')
          .eq('role', 'resolver');
        if (!raCountErr && resolverAssignedForCount && resolverAssignedForCount.length > 0) {
          const ids = resolverAssignedForCount.map(r => r.ticket_id).join(',');
          countQuery = countQuery.not('id', 'in', `(${ids})`);
        }
      }

      let totalCount: number | null = null;
      if (filters.onlyUnassignedResolver) {
        // Avoid not.in in count HEAD query; compute total via batched ID collection instead
        const allMatchingIds = await this.getFilteredTicketIds(includeDeleted, filters);
        totalCount = allMatchingIds.length;
      } else {
        const { count, error: countError } = await countQuery;
      if (countError) throw countError;
        totalCount = count;
      }
      
      console.log('🔍 [FILTER DEBUG] Total count after filters:', totalCount);

      // Get paginated ticket numbers (with optional unassigned-to-resolver filter)
      let tickets: any[] | null = null;
      let error: any = null;
      if (filters.onlyUnassignedResolver) {
        // Compute full matching unassigned IDs, then fetch just the page
        const allMatchingIds = await this.getFilteredTicketIds(includeDeleted, filters);
        const start = (page - 1) * limit;
        const end = Math.min(start + limit, allMatchingIds.length);
        const pageIds = allMatchingIds.slice(start, end);
        if (pageIds.length === 0) {
          tickets = [];
        } else {
          const { data, error: fetchErr } = await supabase
            .from('tickets')
            .select('ticket_number')
            .in('id', pageIds)
            .order('created_at', { ascending: false });
          if (fetchErr) throw fetchErr;
          tickets = data || [];
        }
      } else {
        const { data, error: fetchErr } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
        if (fetchErr) throw fetchErr;
        tickets = data || [];
      }

      // Fetch each ticket individually using TicketService to get full data with comments
      const ticketPromises = (tickets || []).map(async (ticket) => {
        return await TicketService.getTicketByNumber(ticket.ticket_number);
      });
      const resolvedTickets = await Promise.all(ticketPromises);
      const validTickets = resolvedTickets.filter(ticket => ticket !== null) as Issue[];

      const hasMore = (page * limit) < (totalCount || 0);
      return {
        tickets: validTickets,
        total: totalCount || 0,
        hasMore
      };
    } catch (error) {
      console.error('Error in getFilteredTickets:', error);
      return { tickets: [], total: 0, hasMore: false };
    }
  }

  // Return all ticket IDs matching current filters (no pagination) for bulk selection
  static async getFilteredTicketIds(
    includeDeleted: boolean = false,
    filters: TicketFilters
  ): Promise<string[]> {
    const ids: string[] = [];
    const BATCH_SIZE = 1000;
    let page = 1;
    let resolverAssignedSet: Set<string> | null = null;
    
    try {
      // If filtering for unassigned resolver, fetch all resolver assignments first
      if (filters.onlyUnassignedResolver) {
        console.log('🔍 Fetching all resolver assignments for filtering...');
        resolverAssignedSet = new Set<string>();
        let resolverPage = 1;
        
        while (true) {
          const { data: resolverAssignments, error: resolverError } = await supabase
            .from('ticket_assignees')
            .select('ticket_id')
            .eq('role', 'resolver')
            .range((resolverPage - 1) * BATCH_SIZE, resolverPage * BATCH_SIZE - 1);
            
          if (resolverError) {
            console.error('❌ Error fetching resolver assignments:', resolverError);
            break;
          }
          
          if (!resolverAssignments || resolverAssignments.length === 0) break;
          
          resolverAssignments.forEach(assignment => {
            resolverAssignedSet!.add(assignment.ticket_id);
          });
          
          if (resolverAssignments.length < BATCH_SIZE) break;
          resolverPage += 1;
        }
        
        console.log(`✅ Fetched ${resolverAssignedSet.size} resolver assignments`);
      }
      
      while (true) {
        let q = supabase
          .from('tickets')
          .select('id')
          .eq('deleted', includeDeleted);

        if (filters.searchQuery) {
          const searchTerms = filters.searchQuery.split(',').map(term => term.trim()).filter(term => term.length > 0);
          if (searchTerms.length > 0) {
            const orConditions = searchTerms.map(term =>
              `ticket_number.ilike.%${term}%,issue_description.ilike.%${term}%,city.ilike.%${term}%,centre_code.ilike.%${term}%`
            );
            q = q.or(orConditions.join(','));
          }
        }
        if (filters.statusFilter && filters.statusFilter !== 'all') q = q.eq('status', filters.statusFilter);
        if (filters.severityFilter && filters.severityFilter !== 'all') q = q.eq('severity', filters.severityFilter);
        if (filters.categoryFilter && filters.categoryFilter !== 'all') q = q.eq('issue_category', filters.categoryFilter);
        if (filters.cityFilter && filters.cityFilter !== 'all') q = q.eq('city', filters.cityFilter);
        // Handle resolver filter using ticket_assignees table
        if (filters.resolverFilter && filters.resolverFilter.length > 0) {
          const { data: resolverAssignedTickets, error: resolverError } = await supabase
            .from('ticket_assignees')
            .select('ticket_id')
            .eq('role', 'resolver')
            .in('user_id', filters.resolverFilter);
          
          if (resolverError) throw resolverError;
          
          if (resolverAssignedTickets && resolverAssignedTickets.length > 0) {
            const ticketIds = resolverAssignedTickets.map(t => t.ticket_id);
            q = q.in('id', ticketIds);
          } else {
            // No tickets match the resolver filter, return empty result
            q = q.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
          }
        }
        
        // Handle approver filter using ticket_assignees table
        if (filters.approverFilter && filters.approverFilter.length > 0) {
          const { data: approverAssignedTickets, error: approverError } = await supabase
            .from('ticket_assignees')
            .select('ticket_id')
            .eq('role', 'approver')
            .in('user_id', filters.approverFilter);
          
          if (approverError) throw approverError;
          
          if (approverAssignedTickets && approverAssignedTickets.length > 0) {
            const ticketIds = approverAssignedTickets.map(t => t.ticket_id);
            q = q.in('id', ticketIds);
          } else {
            // No tickets match the approver filter, return empty result
            q = q.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
          }
        }
        if (filters.resourceIdFilter && filters.resourceIdFilter.length > 0) q = q.in('resource_id', filters.resourceIdFilter);
        if (filters.dateRange?.from) {
          const fromDate = filters.dateRange.from.toISOString();
          const toDate = filters.dateRange.to ? filters.dateRange.to.toISOString() : filters.dateRange.from.toISOString();
          q = q.gte('created_at', fromDate).lte('created_at', toDate);
        }

        if (filters.onlyUnassignedResolver) {
          // We'll filter client-side after fetching each batch to avoid not.in
        }

        const { data, error } = await q
          .order('created_at', { ascending: false })
          .range((page - 1) * BATCH_SIZE, page * BATCH_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        if (filters.onlyUnassignedResolver) {
          // Use pre-fetched resolver assignments to filter locally
          const unassignedIds = (data as any[])
            .map(r => r.id)
            .filter((id: string) => !resolverAssignedSet!.has(id));
          ids.push(...unassignedIds);
        } else {
          ids.push(...(data as any[]).map(r => r.id));
        }
        if (data.length < BATCH_SIZE) break;
        page += 1;
      }
      return ids;
    } catch (err) {
      console.error('Error in getFilteredTicketIds:', err);
      return ids;
    }
  }

  static async getUsersByRole(role: 'resolver' | 'approver' | 'ticket_admin'): Promise<User[]> {
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
          // 1. Update ticket status
          const { error: updateError } = await supabase
            .from('tickets')
            .update({
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
      const role = params.type === 'approver' ? 'approver' : 'resolver';
      
      // Check if assignment already exists
      const { data: existing, error: existsError } = await supabase
        .from('ticket_assignees')
        .select('id')
        .eq('ticket_id', params.ticketId)
        .eq('user_id', params.assignedTo)
        .eq('role', role);

      if (existsError) {
        console.error('Error checking existing assignment:', existsError);
        return false;
      }

      // Add assignment if it doesn't exist
      if (!existing || existing.length === 0) {
        const { error: assignError } = await TicketService.addAssignee(
          params.ticketId, 
          params.assignedTo, 
          role, 
          params.assignedTo, 
          'System', 
          'super_admin'
        );
        
        if (assignError) {
          console.error('Error adding assignment:', assignError);
          return false;
        }
      }

      console.log('Ticket assigned successfully');
      return true;
    } catch (error) {
      console.error('Error in assignTicket:', error);
      return false;
    }
  }

  static async assignToApprover(ticketId: string, approverId: string): Promise<boolean> {
    try {
      console.log(`🔄 Assigning ticket ${ticketId} to approver ${approverId}`);
      
      // Check if assignment already exists
      const { data: existing, error: existsError } = await supabase
          .from('ticket_assignees')
        .select('id')
          .eq('ticket_id', ticketId)
          .eq('user_id', approverId)
          .eq('role', 'approver');
          
      if (existsError) {
        console.error('Error checking existing approver assignment:', existsError);
          return false;
        }
        
      // Add assignment if it doesn't exist
      if (!existing || existing.length === 0) {
        const { error: assignError } = await TicketService.addAssignee(
          ticketId, 
          approverId, 
          'approver', 
          approverId, 
          'System', 
          'super_admin'
        );
        
        if (assignError) {
          console.error('Error adding approver assignment:', assignError);
        return false;
        }
      }

      console.log('✅ Ticket assigned to approver successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in assignToApprover:', error);
      return false;
    }
  }

  static async assignToTicketAdmin(ticketId: string, ticketAdminId: string): Promise<boolean> {
    try {
      console.log(`🔄 Assigning ticket ${ticketId} to ticket admin ${ticketAdminId}`);
      
      // Add to ticket_assignees table (using new unified system)
      const { data, error } = await supabase
        .from('ticket_assignees')
        .insert([{
          ticket_id: ticketId,
          user_id: ticketAdminId,
          role: 'ticket_admin',
          assigned_at: new Date().toISOString(),
          performed_by: ticketAdminId
        }]);

      if (error) {
        console.error('❌ Error assigning ticket to ticket admin:', error);
        return false;
      }

      console.log('✅ Ticket assigned to ticket admin successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Error in assignToTicketAdmin:', error);
      return false;
    }
  }

  static async getTicketsAssignedToAdmin(adminId: string): Promise<Issue[]> {
    try {
      console.log(`🔄 Getting tickets assigned to admin ${adminId}`);
      
      // Get tickets assigned to this ticket admin using new system
      const { data: assignments, error: assignmentsError } = await supabase
        .from('ticket_assignees')
        .select('ticket_id')
        .eq('user_id', adminId)
        .eq('role', 'ticket_admin');

      if (assignmentsError) {
        console.error('❌ Error fetching ticket admin assignments:', assignmentsError);
        return [];
      }

      if (!assignments || assignments.length === 0) {
        console.log('ℹ️ No tickets assigned to this admin');
        return [];
      }

      const ticketIds = assignments.map(a => a.ticket_id);
      
      // Fetch the actual tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          *,
          comments (
            id,
            content,
            author,
            author_role,
            is_internal,
            created_at,
            comment_attachments (
              id,
              file_name,
              file_size,
              file_type,
              storage_path,
              uploaded_at
            )
          ),
          attachments (
            id,
            file_name,
            file_size,
            file_type,
            storage_path,
            uploaded_at
          )
        `)
        .in('id', ticketIds)
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.error('❌ Error fetching assigned tickets:', ticketsError);
        return [];
      }

      // Map to Issue type
      const mappedTickets = (tickets || []).map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        centreCode: ticket.centre_code,
        city: ticket.city,
        resourceId: ticket.resource_id,
        awignAppTicketId: (ticket as any).awign_app_ticket_id,
        issueCategory: ticket.issue_category as any,
        issueDescription: ticket.issue_description,
        issueDate: this.parseIssueDate(ticket.issue_date),
        severity: ticket.severity as any,
        status: ticket.status as any,
        isAnonymous: ticket.is_anonymous,
        submittedBy: ticket.submitted_by,
        submittedByUserId: ticket.submitted_by_user_id,
        submittedAt: new Date(ticket.submitted_at),
        assignedResolver: null, // Will be populated from ticket_assignees in IssueContext
        assignedApprover: null, // Will be populated from ticket_assignees in IssueContext
        resolutionNotes: ticket.resolution_notes,
        resolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at) : undefined,
        comments: (ticket.comments || []).map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          author: comment.author,
          authorRole: comment.author_role,
          timestamp: comment.created_at ? new Date(comment.created_at) : new Date(),
          isInternal: comment.is_internal,
          attachments: (comment.comment_attachments || []).map((att: any) => {
            const { data: pub } = supabase.storage.from('comment-attachments').getPublicUrl(att.storage_path);
            return {
              id: att.id,
              fileName: att.file_name,
              fileSize: att.file_size,
              fileType: att.file_type,
              downloadUrl: pub.publicUrl,
              uploadedAt: att.uploaded_at ? new Date(att.uploaded_at) : undefined,
            };
          }),
        })),
        attachments: (ticket.attachments || []).map((att: any) => {
          const { data: pub } = supabase.storage.from('ticket-attachments').getPublicUrl(att.storage_path);
          return {
            id: att.id,
            fileName: att.file_name,
            fileSize: att.file_size,
            fileType: att.file_type,
            uploadedAt: att.uploaded_at ? new Date(att.uploaded_at) : undefined,
            downloadUrl: pub.publicUrl,
          };
        }),
        issueEvidence: [],
        reopenCount: (ticket as any).reopen_count || 0,
        lastReopenedAt: (ticket as any).last_reopened_at ? new Date((ticket as any).last_reopened_at) : undefined,
        reopenedBy: (ticket as any).reopened_by,
        statusChangedAt: (ticket as any).status_changed_at ? new Date((ticket as any).status_changed_at) : undefined,
        statusChangedBy: (ticket as any).status_changed_by,
        deleted: (ticket as any).deleted || false
      }));

      console.log(`✅ Returning ${mappedTickets.length} tickets assigned to admin ${adminId}`);
      return mappedTickets as unknown as Issue[];
    } catch (error) {
      console.error('❌ Error in getTicketsAssignedToAdmin:', error);
      return [];
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
      // Fetch all non-deleted tickets in batches to avoid 1000-row caps
      const tickets = await this.getAllTicketsUnpaginated({ showDeleted: false });
      if (!tickets || tickets.length === 0) return this.getEmptyAnalytics();

      // Get all users to map IDs to names
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, role');

      if (usersError) {
        console.error('Error fetching users for analytics:', usersError);
      }

      // Get all ticket assignments from the new ticket_assignees table (with pagination)
      let allAssignments = [];
      let assignmentPage = 1;
      const BATCH_SIZE = 1000;
      
      while (true) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('ticket_assignees')
          .select('*')
          .range((assignmentPage - 1) * BATCH_SIZE, assignmentPage * BATCH_SIZE - 1);

      if (assignmentsError) {
        console.error('Error fetching assignments for analytics:', assignmentsError);
          break;
        }
        
        if (!assignments || assignments.length === 0) break;
        
        allAssignments.push(...assignments);
        
        if (assignments.length < BATCH_SIZE) break;
        assignmentPage += 1;
      }
      
      const assignments = allAssignments;
      
      // Debug: Check if assignments exist
      console.log('🔍 Assignments debug:', {
        assignmentsCount: assignments?.length || 0,
        sampleAssignments: assignments?.slice(0, 3)
      });

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

      // Calculate metrics over full ticket set
      const totalTickets = tickets.length;
      const openTickets = tickets.filter(t => t.status === 'open').length;
      const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
      const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
      const closedTickets = tickets.filter(t => (t as any).status === 'closed').length;
      const userDependencyTickets = tickets.filter(t => t.status === 'user_dependency').length;
      const opsInputRequiredTickets = tickets.filter(t => t.status === 'ops_input_required').length;
      const approvedTickets = tickets.filter(t => t.status === 'approved').length;
      const sendForApprovalTickets = tickets.filter(t => t.status === 'send_for_approval').length;

      const sev1Tickets = tickets.filter(t => t.severity === 'sev1').length;
      const sev2Tickets = tickets.filter(t => t.severity === 'sev2').length;
      const sev3Tickets = tickets.filter(t => t.severity === 'sev3').length;

      // Calculate assignments strictly per request:
      // totalTickets = unique tickets from tickets table (already computed)
      // assignedTickets = count of unique ticket_id in ticket_assignees
      // unassignedTickets = totalTickets - assignedTickets
      const ticketsSet = new Set<string>(tickets.map(t => (t as any).id));
      const assignedTicketIds = new Set<string>();
      const resolverAssignedTicketIds = new Set<string>();
      if (assignments) {
        assignments.forEach(a => {
          const tid = (a as any).ticket_id as string;
          // Only count if the ticket exists in the current (non-deleted) ticket set
          if (tid && ticketsSet.has(tid)) {
            assignedTicketIds.add(tid);
            // Also track resolver-specific assignments
            if ((a as any).role === 'resolver') {
              resolverAssignedTicketIds.add(tid);
            }
          }
        });
      }
      const assignedTickets = assignedTicketIds.size;
      const unassignedTickets = Math.max(totalTickets - assignedTickets, 0);
      const unassignedToResolverTickets = Math.max(totalTickets - resolverAssignedTicketIds.size, 0);
      
      // Calculate open tickets assigned/unassigned to resolver
      const openTicketsAssignedToResolver = tickets.filter(t => 
        t.status === 'open' && resolverAssignedTicketIds.has((t as any).id)
      ).length;
      const openTicketsUnassignedToResolver = openTickets - openTicketsAssignedToResolver;
      
      // Debug logging
      console.log('🔍 Analytics Debug:', {
        totalTickets,
        assignedTickets,
        unassignedTickets,
        unassignedToResolverTickets,
        openTickets,
        openTicketsAssignedToResolver,
        openTicketsUnassignedToResolver,
        ticketsCount: tickets.length,
        assignmentsCount: assignments?.length || 0,
        ticketsSetSize: ticketsSet.size,
        assignedTicketIdsSize: assignedTicketIds.size,
        resolverAssignedTicketIdsSize: resolverAssignedTicketIds.size,
        sampleAssignments: assignments?.slice(0, 5),
        sampleTicketIds: Array.from(ticketsSet).slice(0, 5)
      });
      
      // Expected numbers based on analysis:
      // Total Tickets: 2,337
      // Tickets with at least 1 Resolver: 1,484
      // Tickets without any Resolver: 853
      console.log('📊 Expected vs Actual:');
      console.log(`  Expected Total: 2,337 | Actual: ${totalTickets}`);
      console.log(`  Expected with Resolver: 1,484 | Actual: ${resolverAssignedTicketIds.size}`);
      console.log(`  Expected without Resolver: 853 | Actual: ${unassignedToResolverTickets}`);
      const slaBreachedTickets = tickets.filter(t => (t as any).isSlaBreached).length;

      // Calculate average resolution time (hours)
      const resolvedWithTime = tickets.filter(t => t.resolvedAt && t.submittedAt);
      const avgResolutionHours = resolvedWithTime.length > 0
        ? resolvedWithTime.reduce((sum, t) => {
            const resolvedAt = new Date(t.resolvedAt as any).getTime();
            const submittedAt = new Date(t.submittedAt as any).getTime();
            return sum + (resolvedAt - submittedAt) / (1000 * 60 * 60);
          }, 0) / resolvedWithTime.length
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
        centreMap.set((ticket as any).centreCode, (centreMap.get((ticket as any).centreCode) || 0) + 1);
        
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
        userDependencyTickets,
        opsInputRequiredTickets,
        approvedTickets,
        sendForApprovalTickets,
        sev1Tickets,
        sev2Tickets,
        sev3Tickets,
        assignedTickets,
        unassignedTickets,
        unassignedToResolverTickets,
        openTicketsAssignedToResolver,
        openTicketsUnassignedToResolver,
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

  static async getTicketAnalyticsForAdmin(adminId: string): Promise<TicketAnalytics> {
    try {
      console.log(`🔄 Getting ticket analytics for admin ${adminId}...`);
      
      // Get tickets assigned to this admin
      const assignedTickets = await this.getTicketsAssignedToAdmin(adminId);
      
      if (!assignedTickets || assignedTickets.length === 0) {
        console.log('ℹ️ No tickets assigned to this admin');
        return this.getEmptyAnalytics();
      }

      // Calculate metrics for assigned tickets only
      const totalTickets = assignedTickets.length;
      const openTickets = assignedTickets.filter(t => t.status === 'open').length;
      const inProgressTickets = assignedTickets.filter(t => t.status === 'in_progress').length;
      const resolvedTickets = assignedTickets.filter(t => t.status === 'resolved').length;
      const closedTickets = assignedTickets.filter(t => (t as any).status === 'closed').length;
      const userDependencyTickets = assignedTickets.filter(t => t.status === 'user_dependency').length;
      const opsInputRequiredTickets = assignedTickets.filter(t => t.status === 'ops_input_required').length;
      const approvedTickets = assignedTickets.filter(t => t.status === 'approved').length;
      const sendForApprovalTickets = assignedTickets.filter(t => t.status === 'send_for_approval').length;
      
      const sev1Tickets = assignedTickets.filter(t => t.severity === 'sev1').length;
      const sev2Tickets = assignedTickets.filter(t => t.severity === 'sev2').length;
      const sev3Tickets = assignedTickets.filter(t => t.severity === 'sev3').length;
      
      // For ticket admin, all tickets are considered assigned
      const assignedTicketsCount = totalTickets;
      const unassignedTickets = 0;
      const slaBreachedTickets = assignedTickets.filter(t => {
        const submissionTime = new Date(t.submittedAt).getTime();
        const currentTime = new Date().getTime();
        const hoursSinceSubmission = (currentTime - submissionTime) / (1000 * 60 * 60);
        return t.status !== 'resolved' && hoursSinceSubmission > 24;
      }).length;

      // Calculate average resolution time
      const resolvedWithTime = assignedTickets.filter(t => t.resolvedAt);
      const avgResolutionHours = resolvedWithTime.length > 0 
        ? resolvedWithTime.reduce((sum, t) => {
            const resolutionTime = t.resolvedAt ? new Date(t.resolvedAt).getTime() - new Date(t.submittedAt).getTime() : 0;
            return sum + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
          }, 0) / resolvedWithTime.length
        : 0;

      // Calculate breakdowns for assigned tickets only
      const cityMap = new Map<string, number>();
      const centreMap = new Map<string, number>();
      const resolverMap = new Map<string, number>();
      const approverMap = new Map<string, number>();

      assignedTickets.forEach(ticket => {
        // City breakdown
        cityMap.set(ticket.city, (cityMap.get(ticket.city) || 0) + 1);
        
        // Centre breakdown
        centreMap.set(ticket.centreCode, (centreMap.get(ticket.centreCode) || 0) + 1);
        
        // Resolver breakdown
        if (ticket.assignedResolver) {
          resolverMap.set(ticket.assignedResolver, (resolverMap.get(ticket.assignedResolver) || 0) + 1);
        }
        
        // Approver breakdown
        if (ticket.assignedApprover) {
          approverMap.set(ticket.assignedApprover, (approverMap.get(ticket.assignedApprover) || 0) + 1);
        }
      });

      const cityBreakdown = Array.from(cityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count);

      const centreBreakdown = Array.from(centreMap.entries())
        .map(([centreCode, count]) => ({ centreCode, count }))
        .sort((a, b) => b.count - a.count);

      const resolverBreakdown = Array.from(resolverMap.entries())
        .map(([resolver, count]) => ({ resolver, count }))
        .sort((a, b) => b.count - a.count);

      const approverBreakdown = Array.from(approverMap.entries())
        .map(([approver, count]) => ({ approver, count }))
        .sort((a, b) => b.count - a.count);

      console.log(`✅ Calculated analytics for ${assignedTickets.length} assigned tickets`);
      return {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        userDependencyTickets,
        opsInputRequiredTickets,
        approvedTickets,
        sendForApprovalTickets,
        sev1Tickets,
        sev2Tickets,
        sev3Tickets,
        assignedTickets: assignedTicketsCount,
        unassignedTickets,
        unassignedToResolverTickets: 0, // For ticket admin, all tickets are considered assigned
        openTicketsAssignedToResolver: openTickets, // For ticket admin, all open tickets are assigned
        openTicketsUnassignedToResolver: 0, // For ticket admin, no unassigned tickets
        slaBreachedTickets,
        avgResolutionHours,
        cityBreakdown,
        centreBreakdown,
        resolverBreakdown,
        approverBreakdown
      };
    } catch (error) {
      console.error('❌ Error in getTicketAnalyticsForAdmin:', error);
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
      userDependencyTickets: 0,
      opsInputRequiredTickets: 0,
      approvedTickets: 0,
      sendForApprovalTickets: 0,
      sev1Tickets: 0,
      sev2Tickets: 0,
      sev3Tickets: 0,
      assignedTickets: 0,
      unassignedTickets: 0,
      unassignedToResolverTickets: 0,
      openTicketsAssignedToResolver: 0,
      openTicketsUnassignedToResolver: 0,
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
      case 'ticket_admin':
        return 'ticket_admin';
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
      case 'ticket_admin':
        return 'ticket_admin';
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
        .update({ deleted: true } as any) // Cast to any to avoid type error
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

  static async getAllCentreCodesFromTestCenterDetails(): Promise<string[]> {
    try {
      // First, get the total count
      const { count, error: countError } = await supabase
        .from('test_center_details')
        .select('id', { count: 'exact', head: true });
      if (countError) throw countError;
      const total = count || 0;
      const batchSize = 1000;
      let allCodes: any[] = [];
      for (let offset = 0; offset < total; offset += batchSize) {
        const { data, error } = await supabase
          .from('test_center_details')
          .select('test_center_code')
          .range(offset, Math.min(offset + batchSize - 1, total - 1));
        if (error) throw error;
        allCodes = allCodes.concat(data || []);
      }
      // Extract unique, non-empty centre codes
      const codes = Array.from(new Set((allCodes || [])
        .map((row: { test_center_code: any }) => row.test_center_code)
        .filter(code => typeof code !== 'undefined' && code !== null && String(code).trim() !== '')
        .map(code => String(code).trim())
      ));
      return codes;
    } catch (error) {
      console.error('Error fetching centre codes from test_center_details:', error);
      return [];
    }
  }

  static async getTicketsByResolverName(resolverName: string): Promise<Issue[]> {
    try {
      console.log(`🔍 Getting tickets assigned to resolver: ${resolverName}`);
      
      // First, find the user ID for the resolver name
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .ilike('name', `%${resolverName}%`)
        .eq('role', 'resolver')
        .single();

      if (userError || !user) {
        console.error('❌ Error finding resolver user:', userError);
        return [];
      }

      // Get tickets assigned to this resolver using the new assignment system
      const { data: assignments, error: assignmentsError } = await supabase
        .from('ticket_assignees')
        .select('ticket_id')
        .eq('user_id', user.id)
        .eq('role', 'resolver');

      if (assignmentsError) {
        console.error('❌ Error fetching resolver assignments:', assignmentsError);
        return [];
      }

      if (!assignments || assignments.length === 0) {
        console.log('ℹ️ No tickets assigned to this resolver');
        return [];
      }

      const ticketIds = assignments.map(a => a.ticket_id);
      
      // Fetch the actual tickets
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          *,
          comments (
            id,
            content,
            author,
            author_role,
            is_internal,
            created_at,
            comment_attachments (
              id,
              file_name,
              file_size,
              file_type,
              storage_path,
              uploaded_at
            )
          ),
          attachments (
            id,
            file_name,
            file_size,
            file_type,
            storage_path,
            uploaded_at
          )
        `)
        .in('id', ticketIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching tickets by resolver name:', error);
        return [];
      }

      // Map to Issue type
      const mappedTickets = (tickets || []).map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        centreCode: ticket.centre_code,
        city: ticket.city,
        resourceId: ticket.resource_id,
        awignAppTicketId: (ticket as any).awign_app_ticket_id,
        issueCategory: ticket.issue_category as any,
        issueDescription: ticket.issue_description,
        issueDate: this.parseIssueDate(ticket.issue_date),
        severity: ticket.severity as any,
        status: ticket.status as any,
        isAnonymous: ticket.is_anonymous,
        submittedBy: ticket.submitted_by,
        submittedByUserId: ticket.submitted_by_user_id,
        submittedAt: new Date(ticket.submitted_at),
        assignedResolver: null, // Will be populated from ticket_assignees in IssueContext
        assignedApprover: null, // Will be populated from ticket_assignees in IssueContext
        resolutionNotes: ticket.resolution_notes,
        resolvedAt: ticket.resolved_at,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        comments: ticket.comments || [],
        attachments: ticket.attachments || []
      }));

      console.log(`✅ Found ${mappedTickets.length} tickets assigned to resolver: ${resolverName}`);
      return mappedTickets as unknown as Issue[];
    } catch (error) {
      console.error('❌ Error in getTicketsByResolverName:', error);
      return [];
    }
  }
}
