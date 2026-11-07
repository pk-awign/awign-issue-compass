import { supabase } from '../integrations/supabase/client';
import { getStatusLabel } from '@/utils/status';
import { displayUserLabel, fetchUserNameMap } from '@/utils/userDisplayNames';

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
   * Fetch admin Activity Log from ticket_history only (source of truth).
   * ticket_timeline is a partial overlapping store and must not be merged here.
   */
  static async getAllActivities(limit: number = 500): Promise<ActivityLogEntry[]> {
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('ticket_history')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(limit);

      if (historyError) {
        console.error('Error fetching ticket_history:', historyError);
        return [];
      }

      const ticketIds = new Set<string>();
      (historyData || []).forEach((entry) => ticketIds.add(entry.ticket_id));

      const ticketNumberMap = new Map<string, string>();
      if (ticketIds.size > 0) {
        const { data: ticketsData } = await supabase
          .from('tickets')
          .select('id, ticket_number')
          .in('id', Array.from(ticketIds));

        if (ticketsData) {
          ticketsData.forEach((ticket) => {
            ticketNumberMap.set(ticket.id, ticket.ticket_number);
          });
        }
      }

      const nameIds: Array<string | null | undefined> = [];
      (historyData || []).forEach((entry) => {
        nameIds.push(entry.performed_by, entry.old_value, entry.new_value, entry.details?.user_id);
      });
      const nameById = await fetchUserNameMap(nameIds);

      return (historyData || []).map((entry) => {
        const isAssignment = entry.action_type === 'assignment' || entry.action_type === 'assigned';
        const resolveId = (value: string | null) =>
          value && nameById.has(value) ? nameById.get(value)! : value;
        return {
          id: entry.id,
          ticketId: entry.ticket_id,
          ticketNumber: ticketNumberMap.get(entry.ticket_id),
          actionType: entry.action_type,
          oldValue: isAssignment ? resolveId(entry.old_value) : entry.old_value,
          newValue: isAssignment ? resolveId(entry.new_value) : entry.new_value,
          performedBy: displayUserLabel(entry.performed_by, nameById, entry.performed_by || 'System'),
          performedByRole: entry.performed_by_role,
          performedAt: new Date(entry.performed_at),
          details: entry.details,
          isBulk: false,
        };
      });
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
      : `ticket ${activity.ticketNumber || activity.ticketId || 'N/A'}`;

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
        const assignee = activity.newValue || 'Unassigned';
        return `${ticketRef} ${isBulk ? 'were' : 'was'} assigned to ${assignee} by ${activity.performedBy}`;
      
      case 'comment_added': {
        const raw = activity.newValue?.trim();
        if (raw) {
          const preview = raw.length > 100 ? `${raw.slice(0, 100)}…` : raw;
          return `Comment added to ${ticketRef} by ${activity.performedBy}: "${preview}"`;
        }
        return `Comment added to ${ticketRef} by ${activity.performedBy}`;
      }
      
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

      const nameIds: Array<string | null | undefined> = [];
      (data || []).forEach((entry: any) => {
        nameIds.push(entry.performed_by, entry.old_value, entry.new_value, entry.details?.user_id);
      });
      const nameById = await fetchUserNameMap(nameIds);

      return (data || []).map((entry: any) => {
        const isAssignment = entry.action_type === 'assignment' || entry.action_type === 'assigned';
        const resolveId = (value: string | null) =>
          value && nameById.has(value) ? nameById.get(value)! : value;
        return {
          id: entry.id,
          ticketId: entry.ticket_id,
          ticketNumber: ticketNumberMap.get(entry.ticket_id),
          actionType: entry.action_type,
          oldValue: isAssignment ? resolveId(entry.old_value) : entry.old_value,
          newValue: isAssignment ? resolveId(entry.new_value) : entry.new_value,
          performedBy: displayUserLabel(entry.performed_by, nameById, entry.performed_by || 'System'),
          performedByRole: entry.performed_by_role,
          performedAt: new Date(entry.performed_at),
          details: entry.details,
          isBulk: false,
        };
      });
    } catch (error) {
      console.error('Error fetching bulk action details:', error);
      return [];
    }
  }
}

