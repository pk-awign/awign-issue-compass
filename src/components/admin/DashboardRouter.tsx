
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  UserCog, 
  CheckCircle, 
  Users,
  ArrowRight,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardRouterProps {
  currentRole: 'super_admin' | 'resolver' | 'approver' | 'invigilator';
  onRoleSwitch: (role: 'super_admin' | 'resolver' | 'approver' | 'invigilator') => void;
}

export const DashboardRouter: React.FC<DashboardRouterProps> = ({ 
  currentRole, 
  onRoleSwitch 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const dashboards = [
    {
      id: 'super_admin',
      title: 'Super Admin Dashboard',
      description: 'Complete system management and analytics',
      icon: Shield,
      color: 'bg-purple-100 text-purple-800',
      features: ['User Management', 'System Analytics', 'Global Settings', 'All Tickets']
    },
    {
      id: 'resolver',
      title: 'Resolver Dashboard',
      description: 'Resolve assigned tickets and manage workload',
      icon: UserCog,
      color: 'bg-blue-100 text-blue-800',
      features: ['Assigned Tickets', 'Resolution Tools', 'Performance Metrics', 'Escalation']
    },
    {
      id: 'approver',
      title: 'Approver Dashboard',
      description: 'Review and approve ticket resolutions',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      features: ['Pending Approvals', 'Quality Review', 'Team Performance', 'Reports']
    },
    {
      id: 'invigilator',
      title: 'Invigilator Dashboard',
      description: 'Submit tickets and track issues',
      icon: Users,
      color: 'bg-orange-100 text-orange-800',
      features: ['Submit Tickets', 'Track Issues', 'Centre Reports', 'Quick Actions']
    }
  ];

  const handleNavigate = (dashboardId: string) => {
    switch (dashboardId) {
      case 'super_admin':
        navigate('/admin');
        break;
      case 'resolver':
        navigate('/ticket-resolver');
        break;
      case 'approver':
        navigate('/resolution-approver');
        break;
      case 'invigilator':
        navigate('/invigilator');
        break;
      default:
        navigate('/');
    }
  };

  const handleViewDashboard = (dashboardId: string) => {
    onRoleSwitch(dashboardId as any);
    handleNavigate(dashboardId);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Dashboard Management</h2>
        <p className="text-muted-foreground">
          Access different role-based dashboards and system views
        </p>
        <Badge variant="outline" className="text-sm">
          Current User: {user?.name} - {user?.role}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dashboards.map((dashboard) => {
          const Icon = dashboard.icon;
          const isActive = currentRole === dashboard.id;
          
          return (
            <Card 
              key={dashboard.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                isActive ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${dashboard.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{dashboard.title}</CardTitle>
                      {isActive && (
                        <Badge variant="default" className="text-xs mt-1">
                          Currently Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {dashboard.description}
                </p>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Features:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {dashboard.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex gap-2 pt-3">
                    <Button
                      onClick={() => handleViewDashboard(dashboard.id)}
                      className="flex-1"
                      variant={isActive ? "default" : "outline"}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {isActive ? 'Current View' : 'Switch to View'}
                    </Button>
                    
                    {!isActive && (
                      <Button
                        onClick={() => handleNavigate(dashboard.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
