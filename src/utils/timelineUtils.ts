import { TimelineEvent } from '@/types/issue';

/**
 * Format event type for human-readable display
 */
export function formatEventType(eventType: string): string {
  const eventTypeMap: Record<string, string> = {
    'created': 'Ticket Created',
    'status_changed': 'Status Changed',
    'assigned': 'Assignment Changed',
    'comment_added': 'Comment Added',
    'attachment_uploaded': 'Attachment Uploaded',
    'reopened': 'Ticket Reopened',
    'escalated': 'Ticket Escalated',
    'sla_breached': 'SLA Breached'
  };
  
  return eventTypeMap[eventType] || eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format status value for human-readable display
 */
export function formatStatusValue(status: string): string {
  const statusMap: Record<string, string> = {
    'open': 'OPEN',
    'in_progress': 'PENDING ON CX',
    'ops_input_required': 'OPS DEPENDENCY',
    'user_dependency': 'USER DEPENDENCY',
    'ops_user_dependency': 'OPS + USER DEPENDENCY',
    'send_for_approval': 'SEND FOR APPROVAL',
    'approved': 'APPROVED',
    'resolved': 'CLOSED',
    'closed': 'CLOSED'
  };
  
  return statusMap[status] || status.replace('_', ' ').toUpperCase();
}

/**
 * Format role for human-readable display
 */
export function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    'super_admin': 'Super Admin',
    'ticket_admin': 'Ticket Admin',
    'resolver': 'Resolver',
    'approver': 'Approver',
    'invigilator': 'Invigilator',
    'system': 'System'
  };
  
  return roleMap[role] || role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format assignment value (could be user ID or name)
 */
export function formatAssignmentValue(value: string | null): string {
  if (!value) return 'Unassigned';
  
  // If it's a UUID, it's likely a user ID - we'll need to fetch the name
  // For now, return as-is since we don't have access to user lookup here
  return value;
}

/**
 * Format timeline event details for display
 */
export function formatEventDetails(event: TimelineEvent): string {
  const { eventType, oldValue, newValue, details } = event;
  
  switch (eventType) {
    case 'status_changed':
      return `Changed from "${formatStatusValue(oldValue || '')}" to "${formatStatusValue(newValue || '')}"`;
    
    case 'assigned':
      const oldAssignment = oldValue ? `"${formatAssignmentValue(oldValue)}"` : 'Unassigned';
      const newAssignment = newValue ? `"${formatAssignmentValue(newValue)}"` : 'Unassigned';
      return `Assignment changed from ${oldAssignment} to ${newAssignment}`;
    
    case 'comment_added':
      return 'A comment was added';
    
    case 'attachment_uploaded':
      return 'An attachment was uploaded';
    
    case 'reopened':
      return `Ticket was reopened (reopen count: ${details?.reopen_count || 'N/A'})`;
    
    case 'created':
      return `Ticket created with severity: ${details?.severity?.toUpperCase() || 'N/A'}`;
    
    case 'escalated':
      return 'Ticket was escalated';
    
    case 'sla_breached':
      return 'SLA was breached';
    
    default:
      if (details) {
        try {
          return JSON.stringify(details, null, 2);
        } catch {
          return 'Additional details available';
        }
      }
      return '';
  }
}

/**
 * Get a human-readable description of the timeline event
 */
export function getTimelineDescription(event: TimelineEvent): string {
  const performer = event.performedByName || 'System';
  const role = event.performedByRole ? ` (${formatRole(event.performedByRole)})` : '';
  const details = formatEventDetails(event);
  
  return `${performer}${role} ${details}`;
}
