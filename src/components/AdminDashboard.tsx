import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WhatsAppDebugPanel } from './admin/WhatsAppDebugPanel';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("debug");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-6">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">Ticket Management</h3>
            <p className="text-muted-foreground">Enhanced ticket management features will be available here</p>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">User Management</h3>
            <p className="text-muted-foreground">User assignment features will be available here</p>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-muted-foreground">Analytics features will be available here</p>
          </div>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">WhatsApp Integration</h3>
            <p className="text-muted-foreground">WhatsApp functionality is available in the Debug tab</p>
          </div>
        </TabsContent>

        <TabsContent value="debug" className="space-y-6">
          <WhatsAppDebugPanel />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">System Management</h3>
            <p className="text-muted-foreground">System management features will be available here</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
