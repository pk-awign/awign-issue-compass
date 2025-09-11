export type MultipleDateWithDescription = { date: Date; description: string };

export interface Issue {
  id: string;
  ticketNumber: string;
  centreCode: string;
  city: string;
  resourceId: string;
  awignAppTicketId?: string;
  issueCategory: 'payment_delay' | 'partial_payment' | 'behavioral_complaint' | 'improvement_request' | 'facility_issue' | 'penalty_issue' | 'malpractice' | 'app_issue' | 'other';
  issueDescription: string;
  issueEvidence?: File[];
  issueDate: {
    type: 'single' | 'multiple' | 'range' | 'ongoing';
    dates: Date[] | MultipleDateWithDescription[];
    startDate?: Date;
    endDate?: Date;
  };
  severity: 'sev1' | 'sev2' | 'sev3';
  status: 'open' | 'in_progress' | 'ops_input_required' | 'user_dependency' | 'send_for_approval' | 'approved' | 'resolved';
  isAnonymous: boolean;
  submittedBy?: string;
  submittedByUserId?: string;
  submittedAt: Date;
  assignedResolver?: string;
  assignedApprover?: string;
  assignedTicketAdmin?: string;
  assignedResolverDetails?: { name: string; role: string };
  assignedApproverDetails?: { name: string; role: string };
  assignedTicketAdminDetails?: { name: string; role: string };
  comments: Comment[];
  attachments?: Attachment[];
  resolutionNotes?: string;
  resolvedAt?: Date;
  
  // New fields for enhanced ticket management
  reopenCount?: number;
  lastReopenedAt?: Date;
  reopenedBy?: string;
  reopenedByDetails?: { name: string; role: string };
  statusChangedAt?: Date;
  statusChangedBy?: string;
  statusChangedByDetails?: { name: string; role: string };
  timeline?: TimelineEvent[];
  deleted?: boolean;
  // New field for user dependency tracking
  userDependencyStartedAt?: Date;
  // Assignees field for compatibility
  assignees?: {
    resolver?: { name: string; role: string; id: string } | null;
    approver?: { name: string; role: string; id: string } | null;
    ticketAdmin?: { name: string; role: string; id: string } | null;
  };
  createdAt?: Date; // For compatibility
  ticketLink?: string; // For compatibility
}

export interface Comment {
  id: string;
  content: string;
  author: string;
  authorRole: 'invigilator' | 'admin' | 'resolver' | 'approver' | 'super_admin' | 'anonymous' | 'ticket_admin';
  timestamp: Date;
  isInternal: boolean;
  isFromInvigilator?: boolean; // New field to track invigilator comments
  attachments?: CommentAttachment[];
}

export interface CommentAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  downloadUrl: string;
  uploadedAt: Date;
}

export interface User {
  id: string;
  name: string;
  role: 'invigilator' | 'resolver' | 'approver' | 'super_admin' | 'ticket_admin';
  city: string;
  centreCode?: string;
  mobile?: string;
  email?: string;
  pin?: string;
  isActive: boolean;
  permissions?: string[];
  lastActivity?: Date;
  lastLogin?: Date;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  downloadUrl: string;
  uploadedAt: Date;
  name?: string; // Backward compatibility
  size?: number; // Backward compatibility
}

export interface TimelineEvent {
  id: string;
  eventType: 'created' | 'status_changed' | 'assigned' | 'comment_added' | 'attachment_uploaded' | 'reopened' | 'escalated' | 'sla_breached';
  oldValue?: string;
  newValue?: string;
  performedBy?: string;
  performedByName?: string;
  performedByRole?: string;
  details?: any;
  createdAt: Date;
}

export interface StatusTransition {
  fromStatus: Issue['status'];
  toStatus: Issue['status'];
  allowedRoles: string[];
  requiresComment: boolean;
}

export interface TicketDetails {
  id: string;
  ticketNumber: string;
  centreCode: string;
  city: string;
  resourceId: string;
  awignAppTicketId?: string;
  issueCategory: Issue['issueCategory'];
  issueDescription: string;
  severity: Issue['severity'];
  status: Issue['status'];
  isAnonymous: boolean;
  submittedBy?: string;
  submittedByUserId?: string;
  submittedByRole?: string;
  submittedAt: Date;
  assignedResolver?: string;
  assignedResolverName?: string;
  assignedResolverRole?: string;
  assignedApprover?: string;
  assignedApproverName?: string;
  assignedApproverRole?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
  reopenCount: number;
  lastReopenedAt?: Date;
  reopenedBy?: string;
  reopenedByName?: string;
  reopenedByRole?: string;
  statusChangedAt?: Date;
  statusChangedBy?: string;
  statusChangedByName?: string;
  statusChangedByRole?: string;
}
