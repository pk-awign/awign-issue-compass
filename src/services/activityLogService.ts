import { supabase } from '../integrations/supabase/client';
import { getStatusLabel } from '@/utils/status';

export interface ActivityLogEntry {
  id: string;
  ticketId: string;
  ticketNumber?: string;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  performedBy: string;
  performedByRole: string;
  performedAt: Date;
  details: any;
  isBulk: boolean;
  bulkCount?: number;
  bulkTicketIds?: string[];
}

export interface BulkActivityGroup {
  id: string;
  actionType: string;
  performedBy: string;
  performedByRole: string;
  performedAt: Date;
  count: number;
  ticketIds: string[];
  ticketNumbers: string[];
  oldValue: string | null;
  newValue: string | null;
  details: any;
}

export class ActivityLogService {
  /**
   * Fetch all ticket activities from ticket_history and ticket_timeline
   */
  static async getAllActivities(limit: number = 500): Promise<ActivityLogEntry[]> {
    try {
      // Fetch from ticket_history
      const { data: historyData, error: historyError } = await supabase
        .from('ticket_history')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (historyError) {
        console.error('Error fetching ticket_history:', historyError);
      }

      // Fetch from ticket_timeline
      const { data: timelineData, error: timelineError } = await supabase
        .from('ticket_timeline')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (timelineError) {
        console.error('Error fetching ticket_timeline:', timelineError);
      }

      // Get unique ticket IDs and fetch ticket numbers
      const ticketIds = new Set<string>();
      if (historyData) {
        historyData.forEach(entry => ticketIds.add(entry.ticket_id));
      }
      if (timelineData) {
        timelineData.forEach(entry => ticketIds.add(entry.ticket_id));
      }

      // Fetch ticket numbers
      const ticketNumberMap = new Map<string, string>();
      if (ticketIds.size > 0) {
        const { data: ticketsData } = await supabase
          .from('tickets')
          .select('id, ticket_number')
          .in('id', Array.from(ticketIds));

        if (ticketsData) {
          ticketsData.forEach(ticket => {
            ticketNumberMap.set(ticket.id, ticket.ticket_number);
          });
        }
      }

      // Combine and normalize data
      const activities: ActivityLogEntry[] = [];

      // Process ticket_history
      if (historyData) {
        for (const entry of historyData) {
          activities.push({
            id: entry.id,
            ticketId: entry.ticket_id,
            ticketNumber: ticketNumberMap.get(entry.ticket_id),
            actionType: entry.action_type,
            oldValue: entry.old_value,
            newValue: entry.new_value,
            performedBy: entry.performed_by,
            performedByRole: entry.performed_by_role,
            performedAt: new Date(entry.performed_at),
            details: entry.details,
            isBulk: false,
          });
        }
      }

      // Process ticket_timeline (avoid duplicates by checking if already exists)
      // Use a more strict deduplication: same ticket, same action type, same values, within 2 seconds
      if (timelineData) {
        for (const entry of timelineData) {
          // Check if a similar entry already exists in activities
          // Match by: ticket_id, action_type/event_type, old_value, new_value, and time (within 2 seconds)
          const exists = activities.some(a => {
            const timeDiff = Math.abs(a.performedAt.getTime() - new Date(entry.created_at).getTime());
            const actionMatches = 
              (a.actionType === entry.event_type) ||
              (a.actionType === 'status_change' && entry.event_type === 'status_changed') ||
              (a.actionType === 'status_changed' && entry.event_type === 'status_change') ||
              (a.actionType === 'assignment' && entry.event_type === 'assigned') ||
              (a.actionType === 'assigned' && entry.event_type === 'assignment');
            
            return (
              a.ticketId === entry.ticket_id &&
              actionMatches &&
              a.oldValue === entry.old_value &&
              a.newValue === entry.new_value &&
              timeDiff < 2000 // 2 seconds
            );
          });
          
          if (!exists) {
            activities.push({
              id: entry.id,
              ticketId: entry.ticket_id,
              ticketNumber: ticketNumberMap.get(entry.ticket_id),
              actionType: entry.event_type,
              oldValue: entry.old_value,
              newValue: entry.new_value,
              performedBy: entry.performed_by_name || 'System',
              performedByRole: entry.performed_by_role || 'system',
              performedAt: new Date(entry.created_at),
              details: entry.details,
              isBulk: false,
            });
          }
        }
      }

      // Sort by performed_at descending
      activities.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

      return activities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  }

  /**
   * Group activities into bulk actions
   * Groups activities that:
   * - Have the same action_type
   * - Are performed by the same user
   * - Occur within 5 minutes of each other
   */
  static groupBulkActivities(activities: ActivityLogEntry[]): (ActivityLogEntry | BulkActivityGroup)[] {
    const result: (ActivityLogEntry | BulkActivityGroup)[] = [];
    const processed = new Set<string>();
    const BULK_TIME_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds

    for (let i = 0; i < activities.length; i++) {
      if (processed.has(activities[i].id)) continue;

      const current = activities[i];
      const bulkGroup: ActivityLogEntry[] = [current];
      processed.add(current.id);

      // Find similar activities within time window
      for (let j = i + 1; j < activities.length; j++) {
        if (processed.has(activities[j].id)) continue;

        const other = activities[j];
        const timeDiff = Math.abs(current.performedAt.getTime() - other.performedAt.getTime());

        if (
          current.actionType === other.actionType &&
          current.performedBy === other.performedBy &&
          current.performedByRole === other.performedByRole &&
          timeDiff <= BULK_TIME_WINDOW &&
          current.oldValue === other.oldValue &&
          current.newValue === other.newValue
        ) {
          bulkGroup.push(other);
          processed.add(other.id);
        }
      }

      if (bulkGroup.length > 1) {
        // Create bulk group
        const bulk: BulkActivityGroup = {
          id: `bulk_${current.id}`,
          actionType: current.actionType,
          performedBy: current.performedBy,
          performedByRole: current.performedByRole,
          performedAt: current.performedAt,
          count: bulkGroup.length,
          ticketIds: bulkGroup.map(a => a.ticketId),
          ticketNumbers: bulkGroup.map(a => a.ticketNumber || '').filter(Boolean),
          oldValue: current.oldValue,
          newValue: current.newValue,
          details: current.details,
        };
        result.push(bulk);
      } else {
        // Single activity
        result.push(current);
      }
    }

    // Sort by performed_at descending
    result.sort((a, b) => {
      const aTime = a.performedAt.getTime();
      const bTime = b.performedAt.getTime();
      return bTime - aTime;
    });

    return result;
  }

  /**
   * Get activity description for display
   */
  static getActivityDescription(activity: ActivityLogEntry | BulkActivityGroup): string {
    const isBulk = 'count' in activity;
    const ticketRef = isBulk 
      ? `${activity.count} tickets` 
      : `ticket ${activity.ticketNumber || activity.ticketIds?.[0] || 'N/A'}`;

    switch (activity.actionType) {
      case 'created':
        return `${isBulk ? `${activity.count} tickets were` : `Ticket ${activity.ticketNumber || 'N/A'} was`} created by ${activity.performedBy}`;
      
      case 'status_change':
      case 'status_changed':
        const oldStatus = activity.oldValue ? getStatusLabel(activity.oldValue as any) : 'N/A';
        const newStatus = activity.newValue ? getStatusLabel(activity.newValue as any) : 'N/A';
        return `${ticketRef} status changed from "${oldStatus}" to "${newStatus}" by ${activity.performedBy}`;
      
      case 'assignment':
      case 'assigned':
        const assignee = activity.newValue || 'N/A';
        return `${ticketRef} ${isBulk ? 'were' : 'was'} assigned to ${assignee} by ${activity.performedBy}`;
      
      case 'comment_added':
        return `Comment added to ${ticketRef} by ${activity.performedBy}`;
      
      case 'resolved':
        return `${ticketRef} ${isBulk ? 'were' : 'was'} resolved by ${activity.performedBy}`;
      
      case 'approved':
        return `${ticketRef} ${isBulk ? 'were' : 'was'} approved by ${activity.performedBy}`;
      
      case 'reopened':
        return `${ticketRef} ${isBulk ? 'were' : 'was'} reopened by ${activity.performedBy}`;
      
      default:
        return `${ticketRef} ${activity.actionType} by ${activity.performedBy}`;
    }
  }

  /**
   * Get individual ticket activities for a bulk action
   */
  static async getBulkActionDetails(ticketIds: string[]): Promise<ActivityLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('ticket_history')
        .select('*')
        .in('ticket_id', ticketIds)
        .order('performed_at', { ascending: false });

      if (error) throw error;

      // Fetch ticket numbers
      const ticketNumberMap = new Map<string, string>();
      if (ticketIds.length > 0) {
        const { data: ticketsData } = await supabase
          .from('tickets')
          .select('id, ticket_number')
          .in('id', ticketIds);

        if (ticketsData) {
          ticketsData.forEach(ticket => {
            ticketNumberMap.set(ticket.id, ticket.ticket_number);
          });
        }
      }

      return (data || []).map((entry: any) => ({
        id: entry.id,
        ticketId: entry.ticket_id,
        ticketNumber: ticketNumberMap.get(entry.ticket_id),
        actionType: entry.action_type,
        oldValue: entry.old_value,
        newValue: entry.new_value,
        performedBy: entry.performed_by,
        performedByRole: entry.performed_by_role,
        performedAt: new Date(entry.performed_at),
        details: entry.details,
        isBulk: false,
      }));
    } catch (error) {
      console.error('Error fetching bulk action details:', error);
      return [];
    }
  }
}

