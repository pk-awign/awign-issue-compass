import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppDebugPanel } from './admin/WhatsAppDebugPanel';
import { SimpleIssueForm } from './SimpleIssueForm';
import { Button } from "@/components/ui/button";

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">1532</div>
            <div className="text-sm text-muted-foreground">Total Tickets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">24</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">162</div>
            <div className="text-sm text-muted-foreground">Total Comments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">✅</div>
            <div className="text-sm text-muted-foreground">WhatsApp Ready</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Ticket</TabsTrigger>
          <TabsTrigger value="debug">WhatsApp Debug</TabsTrigger>
          <TabsTrigger value="system">System Status</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="flex justify-center">
            <SimpleIssueForm />
          </div>
        </TabsContent>

        <TabsContent value="debug" className="space-y-6">
          <WhatsAppDebugPanel />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Database</span>
                  <span className="text-green-600">✅ Connected</span>
                </div>
                <div className="flex justify-between">
                  <span>Google Sheets</span>
                  <span className="text-green-600">✅ Connected</span>
                </div>
                <div className="flex justify-between">
                  <span>WhatsApp API</span>
                  <span className="text-green-600">✅ Ready</span>
                </div>
                <div className="flex justify-between">
                  <span>WhatsApp Template</span>
                  <span className="text-green-600">✅ 3 Parameters</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
