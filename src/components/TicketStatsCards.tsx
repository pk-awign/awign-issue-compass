import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle, XCircle, TrendingUp, Timer } from 'lucide-react';
import { Issue } from '@/types/issue';

interface TicketStatsCardsProps {
  tickets: Issue[];
  userRole: 'resolver' | 'approver';
}

export const TicketStatsCards: React.FC<TicketStatsCardsProps> = ({
  tickets,
  userRole
}) => {
  const stats = React.useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open').length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;
    let pending = 0;
    let inProgress = 0;
    if (userRole === 'approver') {
      pending = tickets.filter(t => ['in_progress', 'send_for_approval', 'approved'].includes(t.status)).length;
    } else {
      inProgress = tickets.filter(t => t.status === 'in_progress').length;
    }
    const sev1 = tickets.filter(t => t.severity === 'sev1').length;
    const sev2 = tickets.filter(t => t.severity === 'sev2').length;
    const sev3 = tickets.filter(t => t.severity === 'sev3').length;
    const today = new Date();
    const last24h = tickets.filter(t => {
      const diff = today.getTime() - t.submittedAt.getTime();
      return diff <= 24 * 60 * 60 * 1000;
    }).length;
    const avgResolutionTime = tickets
      .filter(t => t.resolvedAt)
      .reduce((acc, t) => {
        const diff = t.resolvedAt!.getTime() - t.submittedAt.getTime();
        return acc + (diff / (1000 * 60 * 60)); // Convert to hours
      }, 0) / tickets.filter(t => t.resolvedAt).length || 0;
    return {
      total,
      open,
      pending,
      inProgress,
      resolved,
      sev1,
      sev2,
      sev3,
      last24h,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10
    };
  }, [tickets, userRole]);

  const statCards = [
    {
      title: 'Total Tickets',
      value: stats.total,
      icon: <TrendingUp className="h-4 w-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Open',
      value: stats.open,
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    userRole === 'approver'
      ? {
          title: 'Pending',
          value: stats.pending,
          icon: <Clock className="h-4 w-4" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        }
      : {
          title: 'In Progress',
          value: stats.inProgress,
          icon: <Clock className="h-4 w-4" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <div className={stat.color}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Severity Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Badge className="bg-red-100 text-red-800">
                SEV1: {stats.sev1}
              </Badge>
              <Badge className="bg-orange-100 text-orange-800">
                SEV2: {stats.sev2}
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                SEV3: {stats.sev3}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Avg Resolution Time
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">
              {stats.avgResolutionTime > 0 ? `${stats.avgResolutionTime}h` : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold text-blue-600">{stats.last24h}</p>
            <p className="text-xs text-muted-foreground">New tickets</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
