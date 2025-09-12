import { Issue } from '@/types/issue';

export function getStatusLabel(status: Issue['status']): string {
  switch (status) {
    case 'in_progress':
      return 'PENDING ON CX';
    case 'resolved':
      return 'CLOSED';
    case 'ops_input_required':
      return 'OPS DEPENDENCY';
    case 'ops_user_dependency':
      return 'OPS + USER DEPENDENCY';
    case 'user_dependency':
      return 'USER DEPENDENCY';
    case 'send_for_approval':
      return 'SEND FOR APPROVAL';
    case 'approved':
      return 'APPROVED';
    case 'open':
    default:
      return 'OPEN';
  }
}


