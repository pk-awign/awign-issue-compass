import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Activity, Eye, User, FileText, ArrowRight, Users } from 'lucide-react';
import { format } from 'date-fns';
import { AutoResolutionService } from '@/services/autoResolutionService';
import { ActivityLogService, ActivityLogEntry, BulkActivityGroup } from '@/services/activityLogService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  // Load activities on mount
  useEffect(() => {
    loadAllActivities();
    loadAutoResolveActivities();
  }, []);

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Log
              </CardTitle>
              <CardDescription>
                All ticket activities and system actions
              </CardDescription>
            </div>
            <Button
              onClick={loadAllActivities}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
          ) : (
            <div className="space-y-3">
              {allActivities.map((activity) => {
                const isBulk = 'count' in activity;
                const description = ActivityLogService.getActivityDescription(activity);

                return (
                  <div
                    key={activity.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getActionIcon(activity.actionType)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm">{description}</span>
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
        <DialogContent className="max-w-4xl max-h-[80vh]">
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
