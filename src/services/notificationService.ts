import { Issue, Comment } from '@/types/issue';

export interface NotificationItem {
  id: string;
  ticketId: string;
  ticketNumber: string;
  commentId: string;
  commentContent: string;
  timestamp: Date;
  isRead: boolean;
}

export class NotificationService {
  private static notifications: NotificationItem[] = [];
  private static listeners: ((notifications: NotificationItem[]) => void)[] = [];

  static addNotification(comment: Comment, ticket: Issue): void {
    // Only add notifications for invigilator comments
    if (!comment.isFromInvigilator) return;

    const notification: NotificationItem = {
      id: `notification-${comment.id}`,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      commentId: comment.id,
      commentContent: comment.content,
      timestamp: comment.timestamp,
      isRead: false,
    };

    // Remove any existing notification for the same comment
    this.notifications = this.notifications.filter(n => n.commentId !== comment.id);
    
    // Add new notification at the top
    this.notifications.unshift(notification);

    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    // Notify listeners
    this.notifyListeners();
  }

  static getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  static getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  static markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.notifyListeners();
    }
  }

  static markAllAsRead(): void {
    this.notifications.forEach(n => n.isRead = true);
    this.notifyListeners();
  }

  static clearNotifications(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  static subscribe(listener: (notifications: NotificationItem[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Method to process new comments from tickets
  static processNewComments(tickets: Issue[], currentUserId?: string): void {
    tickets.forEach(ticket => {
      if (ticket.comments && ticket.comments.length > 0) {
        // Get the most recent comment
        const latestComment = ticket.comments[0];
        
        // Check if this is a new invigilator comment
        if (latestComment.isFromInvigilator) {
          // Only create notifications for tickets assigned to the current user
          const isAssignedToUser = currentUserId && (
            ticket.assignedResolver === currentUserId ||
            ticket.assignedApprover === currentUserId ||
            (ticket as any).assignees?.some((a: any) => a.user_id === currentUserId)
          );
          
          if (isAssignedToUser) {
            // Check if we already have a notification for this comment
            const existingNotification = this.notifications.find(n => n.commentId === latestComment.id);
            
            if (!existingNotification) {
              this.addNotification(latestComment, ticket);
            }
          }
        }
      }
    });
  }
}