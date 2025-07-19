import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/Overview"
import { Analytics } from "@/components/Analytics"
import { Users } from "@/components/Users"
import { Tickets } from "@/components/Tickets"
import { System } from "@/components/System"
import { Header } from "@/components/Header"
import { Stats } from "@/components/Stats"
import { WhatsAppDebugPanel } from './admin/WhatsAppDebugPanel';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("tickets");

  return (
    <div className="space-y-6">
      <Header />
      <Stats />

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
          <Tickets />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Users />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Analytics />
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Overview />
        </TabsContent>

        <TabsContent value="debug" className="space-y-6">
          <WhatsAppDebugPanel />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <System />
        </TabsContent>
      </Tabs>
    </div>
  );
};
