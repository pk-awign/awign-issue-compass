import { TimelineEvent } from '@/types/issue';

/**
 * Soft background highlight per history action type.
 * `created` stays on the original plain left-border style.
 */
export function getHistoryEventHighlightClass(eventType: string | null | undefined): string {
  const panel = 'rounded-md border pl-3 pr-3 py-2 border-l-4';

  switch (eventType) {
    case 'created':
      return 'border-l-2 border-blue-500 pl-4';
    case 'comment_added':
      return `${panel} border-amber-200 bg-amber-50/90 border-l-amber-500`;
    case 'status_changed':
    case 'status_change':
      return `${panel} border-sky-200 bg-sky-50/90 border-l-sky-500`;
    case 'assigned':
    case 'assignment':
      return `${panel} border-emerald-200 bg-emerald-50/90 border-l-emerald-500`;
    case 'reopened':
      return `${panel} border-orange-200 bg-orange-50/90 border-l-orange-500`;
    case 'resolved':
    case 'approved':
      return `${panel} border-teal-200 bg-teal-50/90 border-l-teal-500`;
    case 'attachment_uploaded':
      return `${panel} border-indigo-200 bg-indigo-50/90 border-l-indigo-500`;
    case 'escalated':
      return `${panel} border-rose-200 bg-rose-50/90 border-l-rose-500`;
    case 'sla_breached':
      return `${panel} border-red-200 bg-red-50/90 border-l-red-500`;
    case 'severity_change':
      return `${panel} border-fuchsia-200 bg-fuchsia-50/90 border-l-fuchsia-500`;
    default:
      return `${panel} border-slate-200 bg-slate-50/90 border-l-slate-400`;
  }
}

/**
 * Format event type for human-readable display
 */
export function formatEventType(eventType: string): string {
  const eventTypeMap: Record<string, string> = {
    'created': 'Ticket Created',
    'status_changed': 'Status Changed',
    'status_change': 'Status Changed',
    'assigned': 'Assignment Changed',
    'assignment': 'Assignment Changed',
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
      if (newValue?.trim()) {
        const preview = newValue.trim().length > 140 ? `${newValue.trim().slice(0, 140)}…` : newValue.trim();
        return `added a comment: "${preview}"`;
      }
      return 'added a comment';
    
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
