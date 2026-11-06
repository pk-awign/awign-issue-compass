import { Issue, Comment } from '@/types/issue';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface NotificationItem {
  id: string;
  ticketId: string;
  ticketNumber: string;
  commentId: string;
  commentContent: string;
  timestamp: Date;
  isRead: boolean;
}

type UserNotificationRow = {
  id: string;
  user_id: string;
  ticket_id: string;
  comment_id: string;
  ticket_number: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

function mapRow(row: UserNotificationRow): NotificationItem {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    ticketNumber: row.ticket_number,
    commentId: row.comment_id,
    commentContent: row.body,
    timestamp: new Date(row.created_at),
    isRead: Boolean(row.read_at),
  };
}

/**
 * Durable notifications backed by `user_notifications`.
 * Rows are created by a DB trigger when invigilators comment on assigned tickets.
 */
export class NotificationService {
  private static notifications: NotificationItem[] = [];
  private static listeners: ((notifications: NotificationItem[]) => void)[] = [];
  private static channel: RealtimeChannel | null = null;
  private static activeUserId: string | null = null;
  private static subscriberCount = 0;

  static getNotifications(): NotificationItem[] {
    return [...this.notifications];
  }

  static getUnreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  static subscribe(listener: ((notifications: NotificationItem[]) => void)): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }

  private static upsertLocal(item: NotificationItem): void {
    this.notifications = this.notifications.filter((n) => n.id !== item.id);
    this.notifications.unshift(item);
    this.notifications.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    this.notifyListeners();
  }

  static async refreshForUser(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('id, user_id, ticket_id, comment_id, ticket_number, body, created_at, read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[notifications] failed to load user_notifications:', error);
      return;
    }

    this.notifications = ((data || []) as UserNotificationRow[]).map(mapRow);
    this.notifyListeners();
  }

  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('[notifications] markAsRead failed:', error);
      return;
    }

    const existing = this.notifications.find((n) => n.id === notificationId);
    if (existing) {
      existing.isRead = true;
      this.notifyListeners();
    }
  }

  static async markAllAsRead(): Promise<void> {
    if (!this.activeUserId) return;

    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', this.activeUserId)
      .is('read_at', null);

    if (error) {
      console.error('[notifications] markAllAsRead failed:', error);
      return;
    }

    this.notifications.forEach((n) => {
      n.isRead = true;
    });
    this.notifyListeners();
  }

  static async clearNotifications(): Promise<void> {
    if (!this.activeUserId) return;

    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('user_id', this.activeUserId);

    if (error) {
      console.error('[notifications] clearNotifications failed:', error);
      return;
    }

    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Legacy no-op kept so older call sites compile; durable path uses the DB trigger.
   */
  static addNotification(_comment: Comment, _ticket: Issue): void {
    // no-op
  }

  /** @deprecated Prefer DB trigger + refreshForUser */
  static processNewComments(_tickets: Issue[], _currentUserId?: string): void {
    // no-op — IssueProvider no longer dumps tickets for notification scanning
  }

  static async startForUser(userId: string): Promise<void> {
    if (!userId) return;

    this.subscriberCount += 1;

    if (this.activeUserId === userId && this.channel) {
      await this.refreshForUser(userId);
      return;
    }

    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.activeUserId = userId;
    await this.refreshForUser(userId);

    this.channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_notifications' },
        (payload) => {
          if (!this.activeUserId) return;
          const row = (payload.new || payload.old) as UserNotificationRow | undefined;
          if (!row || row.user_id !== this.activeUserId) return;

          if (payload.eventType === 'DELETE') {
            this.notifications = this.notifications.filter((n) => n.id !== row.id);
            this.notifyListeners();
            return;
          }

          if (payload.new) {
            this.upsertLocal(mapRow(payload.new as UserNotificationRow));
          }
        }
      )
      .subscribe();
  }

  static stop(): void {
    this.subscriberCount = Math.max(0, this.subscriberCount - 1);
    if (this.subscriberCount > 0) return;

    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.activeUserId = null;
  }
}
