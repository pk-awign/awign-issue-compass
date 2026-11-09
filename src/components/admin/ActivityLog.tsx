import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Clock, CheckCircle, Activity, Eye, User, FileText, ArrowRight, Users, Search, X } from 'lucide-react';
import { format, startOfDay, subDays } from 'date-fns';
import { AutoResolutionService } from '@/services/autoResolutionService';
import { ActivityLogService, ActivityLogEntry, BulkActivityGroup } from '@/services/activityLogService';
import { getHistoryEventHighlightClass } from '@/utils/timelineUtils';
import { cn } from '@/lib/utils';
import { modalViewportClass } from '@/components/layout/mobileLayout';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type ActivityDateFilter = 'all' | 'today' | '7d';

function formatActionTypeLabel(actionType: string): string {
  return actionType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface AutoResolveActivity {
  id: string;
  type: 'auto_resolve' | 'cleanup' | 'manual_trigger';
  timestamp: Date;
  ticketsResolved: number;
  triggeredBy: string;
  errors?: string[];
  status: 'success' | 'error' | 'partial';
}

const AUTO_RESOLVE_STORAGE_KEY = 'awign_auto_resolve_log';

export const ActivityLog: React.FC = () => {
  const [allActivities, setAllActivities] = useState<(ActivityLogEntry | BulkActivityGroup)[]>([]);
  const [autoResolveActivities, setAutoResolveActivities] = useState<AutoResolveActivity[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBulkAction, setSelectedBulkAction] = useState<BulkActivityGroup | null>(null);
  const [bulkDetails, setBulkDetails] = useState<ActivityLogEntry[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<ActivityDateFilter>('all');

  // Load activities on mount
  useEffect(() => {
    loadAllActivities();
    loadAutoResolveActivities();
  }, []);

  const actionTypeOptions = useMemo(() => {
    const types = new Set<string>();
    allActivities.forEach((activity) => types.add(activity.actionType));
    return Array.from(types).sort();
  }, [allActivities]);

  const filteredActivities = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const todayStart = startOfDay(new Date());
    const sevenDaysAgo = startOfDay(subDays(new Date(), 6));

    return allActivities.filter((activity) => {
      if (actionTypeFilter !== 'all' && activity.actionType !== actionTypeFilter) {
        return false;
      }

      const performedAt = activity.performedAt;
      if (dateFilter === 'today' && performedAt < todayStart) return false;
      if (dateFilter === '7d' && performedAt < sevenDaysAgo) return false;

      if (!term) return true;

      const description = ActivityLogService.getActivityDescription(activity).toLowerCase();
      const ticketNumbers =
        'ticketNumbers' in activity && activity.ticketNumbers
          ? activity.ticketNumbers.join(' ').toLowerCase()
          : 'ticketNumber' in activity && activity.ticketNumber
            ? activity.ticketNumber.toLowerCase()
            : '';
      const actor = (activity.performedBy || '').toLowerCase();

      return (
        description.includes(term) ||
        ticketNumbers.includes(term) ||
        actor.includes(term) ||
        activity.actionType.toLowerCase().includes(term)
      );
    });
  }, [allActivities, searchTerm, actionTypeFilter, dateFilter]);

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    actionTypeFilter !== 'all' ||
    dateFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setActionTypeFilter('all');
    setDateFilter('all');
  };

  const loadAllActivities = async () => {
    setIsLoading(true);
    try {
      const activities = await ActivityLogService.getAllActivities(500);
      const grouped = ActivityLogService.groupBulkActivities(activities);
      setAllActivities(grouped);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error('Failed to load activity log');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAutoResolveActivities = () => {
    try {
      const stored = localStorage.getItem(AUTO_RESOLVE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const activitiesWithDates = parsed.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
        setAutoResolveActivities(activitiesWithDates);
      }
    } catch (error) {
      console.error('Error loading auto-resolve activities:', error);
    }
  };

  const saveAutoResolveActivity = (entry: AutoResolveActivity) => {
    try {
      const updated = [entry, ...autoResolveActivities].slice(0, 50);
      localStorage.setItem(AUTO_RESOLVE_STORAGE_KEY, JSON.stringify(updated));
      setAutoResolveActivities(updated);
    } catch (error) {
      console.error('Error saving auto-resolve activity:', error);
    }
  };

  const handleManualTrigger = async () => {
    setIsTriggering(true);
    try {
      const result = await AutoResolutionService.checkAndAutoResolveUserDependencyTickets();
      
      const entry: AutoResolveActivity = {
        id: `manual_${Date.now()}`,
        type: 'manual_trigger',
        timestamp: new Date(),
        ticketsResolved: result.resolved,
        triggeredBy: 'Admin',
        errors: result.errors.length > 0 ? result.errors : undefined,
        status: result.errors.length > 0 
          ? (result.resolved > 0 ? 'partial' : 'error')
          : 'success',
      };

      saveAutoResolveActivity(entry);
      await loadAllActivities(); // Refresh main activity log

      if (result.errors.length > 0) {
        toast.warning(
          `Auto-resolve completed with ${result.resolved} tickets resolved, but some errors occurred.`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `Successfully auto-resolved ${result.resolved} ticket(s)`,
          { duration: 3000 }
        );
      }
    } catch (error: any) {
      const entry: AutoResolveActivity = {
        id: `manual_error_${Date.now()}`,
        type: 'manual_trigger',
        timestamp: new Date(),
        ticketsResolved: 0,
        triggeredBy: 'Admin',
        errors: [error.message || 'Unknown error'],
        status: 'error',
      };

      saveAutoResolveActivity(entry);
      toast.error('Failed to trigger auto-resolve function', { duration: 5000 });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleCleanup = async () => {
    setIsTriggering(true);
    try {
      const result = await AutoResolutionService.cleanupPastUserDependencyTickets();
      
      const entry: AutoResolveActivity = {
        id: `cleanup_${Date.now()}`,
        type: 'cleanup',
        timestamp: new Date(),
        ticketsResolved: result.resolved,
        triggeredBy: 'Admin',
        errors: result.errors.length > 0 ? result.errors : undefined,
        status: result.errors.length > 0 
          ? (result.resolved > 0 ? 'partial' : 'error')
          : 'success',
      };

      saveAutoResolveActivity(entry);
      await loadAllActivities(); // Refresh main activity log

      if (result.errors.length > 0) {
        toast.warning(
          `Cleanup completed with ${result.resolved} tickets resolved, but some errors occurred.`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `Successfully cleaned up ${result.resolved} past ticket(s)`,
          { duration: 3000 }
        );
      }
    } catch (error: any) {
      const entry: AutoResolveActivity = {
        id: `cleanup_error_${Date.now()}`,
        type: 'cleanup',
        timestamp: new Date(),
        ticketsResolved: 0,
        triggeredBy: 'Admin',
        errors: [error.message || 'Unknown error'],
        status: 'error',
      };

      saveAutoResolveActivity(entry);
      toast.error('Failed to trigger cleanup function', { duration: 5000 });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleViewBulkDetails = async (bulkAction: BulkActivityGroup) => {
    setSelectedBulkAction(bulkAction);
    setIsLoadingDetails(true);
    try {
      const details = await ActivityLogService.getBulkActionDetails(bulkAction.ticketIds);
      setBulkDetails(details);
    } catch (error) {
      console.error('Error loading bulk details:', error);
      toast.error('Failed to load bulk action details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'status_change':
      case 'status_changed':
        return <ArrowRight className="h-4 w-4 text-purple-500" />;
      case 'assignment':
      case 'assigned':
        return <User className="h-4 w-4 text-green-500" />;
      case 'comment_added':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'admin': 'bg-blue-100 text-blue-800',
      'resolver': 'bg-green-100 text-green-800',
      'approver': 'bg-yellow-100 text-yellow-800',
      'invigilator': 'bg-orange-100 text-orange-800',
      'system': 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={roleColors[role] || 'bg-gray-100 text-gray-800'}>
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Auto-Resolution Controls - Smaller Section */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Auto-Resolution Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleManualTrigger}
              disabled={isTriggering}
              size="sm"
              className="flex-1"
            >
              {isTriggering ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Trigger Now
                </>
              )}
            </Button>
            <Button
              onClick={handleCleanup}
              disabled={isTriggering}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {isTriggering ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-2" />
                  Cleanup
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Scheduled: Daily at 03:30 and 15:30
          </p>
        </CardContent>
      </Card>

      {/* Main Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="h-5 w-5 shrink-0" />
                Activity Log
              </CardTitle>
              <CardDescription className="mt-1">
                All ticket activities and system actions
              </CardDescription>
            </div>
            <Button
              onClick={loadAllActivities}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="w-full shrink-0 sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search ticket, actor, or action"
                className="pl-9"
                aria-label="Search activity log"
              />
            </div>
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by action type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionTypeOptions.map((actionType) => (
                  <SelectItem key={actionType} value={actionType}>
                    {formatActionTypeLabel(actionType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dateFilter}
              onValueChange={(value) => setDateFilter(value as ActivityDateFilter)}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by date">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading activities...</p>
            </div>
          ) : allActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities found</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities match these filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const isBulk = 'count' in activity;
                const description = ActivityLogService.getActivityDescription(activity);

                const isCreated = activity.actionType === 'created';
                const highlight = isCreated
                  ? 'border rounded-lg bg-background'
                  : getHistoryEventHighlightClass(activity.actionType);

                return (
                  <div
                    key={activity.id}
                    className={cn(highlight, 'min-w-0 p-3 sm:p-4 hover:opacity-95 transition-colors')}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 items-start gap-3 flex-1">
                        <span className="shrink-0">{getActionIcon(activity.actionType)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                            <span className="line-clamp-2 text-sm font-medium" title={description}>
                              {description}
                            </span>
                            {isBulk && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Bulk ({activity.count})
                              </Badge>
                            )}
                            {getRoleBadge(activity.performedByRole)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(activity.performedAt, 'PPp')}
                          </div>
                          {isBulk && activity.ticketNumbers && activity.ticketNumbers.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Ticket{activity.ticketNumbers.length !== 1 ? 's' : ''}: {activity.ticketNumbers.slice(0, 5).join(', ')}
                              {activity.ticketNumbers.length > 5 && ` +${activity.ticketNumbers.length - 5} more`}
                            </div>
                          )}
                        </div>
                      </div>
                      {isBulk && (
                        <Button
                          onClick={() => handleViewBulkDetails(activity)}
                          variant="outline"
                          size="sm"
                          className="w-full shrink-0 sm:w-auto"
                        >
                          <Eye className="h-3 w-3 mr-2" />
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Details Dialog */}
      <Dialog open={selectedBulkAction !== null} onOpenChange={(open) => !open && setSelectedBulkAction(null)}>
        <DialogContent className={cn(modalViewportClass, 'max-w-lg gap-4 p-4 sm:max-w-4xl sm:p-6')}>
          <DialogHeader>
            <DialogTitle>
              Bulk Action Details
              {selectedBulkAction && ` - ${ActivityLogService.getActivityDescription(selectedBulkAction)}`}
            </DialogTitle>
            <DialogDescription>
              Individual ticket activities for this bulk action
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {isLoadingDetails ? (
              <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading details...</p>
              </div>
            ) : bulkDetails.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No details available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bulkDetails.map((detail) => (
                  <div key={detail.id} className="border rounded p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      {getActionIcon(detail.actionType)}
                      <span className="font-medium">Ticket {detail.ticketNumber || detail.ticketId.slice(0, 8)}</span>
                      {getRoleBadge(detail.performedByRole)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ActivityLogService.getActivityDescription(detail)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(detail.performedAt, 'PPp')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
