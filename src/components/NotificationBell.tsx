import React, { useState, useEffect } from 'react';
import { Bell, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationService, NotificationItem } from '@/services/notificationService';
import { formatDistanceToNow } from 'date-fns';

interface NotificationBellProps {
  onTicketClick: (ticketId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onTicketClick }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Subscribe to notification updates
    const unsubscribe = NotificationService.subscribe(setNotifications);
    
    // Load initial notifications
    setNotifications(NotificationService.getNotifications());

    return unsubscribe;
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (notification: NotificationItem) => {
    // Mark as read
    NotificationService.markAsRead(notification.id);
    
    // Open ticket details
    onTicketClick(notification.ticketId);
    
    // Close popover
    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    NotificationService.markAllAsRead();
  };

  const handleClearAll = () => {
    NotificationService.clearNotifications();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1 rounded-full flex items-center justify-center text-[10px] font-medium bg-indigo-600 text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between px-1">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium">
                    {unreadCount} new
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="h-7 px-3 text-xs rounded-full border-gray-300 hover:bg-gray-100"
                  >
                    Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-7 px-3 text-xs rounded-full"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No new comments
              </div>
            ) : (
              <ScrollArea className="h-72">
                <div className="divide-y">
                  {notifications
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 cursor-pointer hover:bg-muted/40 ${
                        !notification.isRead ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-blue-600">
                              {notification.ticketNumber}
                            </span>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {notification.commentContent}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};
