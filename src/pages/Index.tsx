
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Camera, AlertTriangle, Wifi, Settings, Monitor } from 'lucide-react';
import SecurityDashboard from '@/components/SecurityDashboard';
import FaceRecognition from '@/components/FaceRecognition';
import AlertMonitor from '@/components/AlertMonitor';
import ESP32Manager from '@/components/ESP32Manager';
import SystemSettings from '@/components/SystemSettings';
import { useSecuritySystem } from '@/hooks/useSecuritySystem';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { 
    authorizedUsers, 
    alerts, 
    esp32Status,
    addUser,
    deleteUser,
    sendAlert,
    connectESP32,
    triggerAlert,
    clearAlert 
  } = useSecuritySystem();

  // Calculate dashboard stats
  const dashboardStats = {
    totalUsers: authorizedUsers.length,
    activeAlerts: alerts.filter(alert => !alert.acknowledged).length,
    esp32Status: esp32Status.connected ? 'online' as const : 'offline' as const,
    cameraStatus: 'inactive' as const, // This will be updated based on camera state
    systemHealth: esp32Status.connected ? 95 : 75,
    lastUpdate: new Date().toLocaleTimeString()
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'face-recognition':
        setActiveTab('face-recognition');
        break;
      case 'add-user':
        setActiveTab('face-recognition');
        break;
      case 'test-alert':
        triggerAlert('Test alert from dashboard', 'medium');
        break;
      case 'esp32-control':
        setActiveTab('esp32-control');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary rounded-lg">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Security System</h1>
                <p className="text-sm text-muted-foreground">Professional Security Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${esp32Status.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-muted-foreground">
                {esp32Status.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-muted/50">
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center space-x-2 data-[state=active]:bg-background"
            >
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="face-recognition" 
              className="flex items-center space-x-2 data-[state=active]:bg-background"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Face Recognition</span>
            </TabsTrigger>
            <TabsTrigger 
              value="alerts" 
              className="flex items-center space-x-2 data-[state=active]:bg-background"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
              {dashboardStats.activeAlerts > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5">
                  {dashboardStats.activeAlerts}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="esp32-control" 
              className="flex items-center space-x-2 data-[state=active]:bg-background"
            >
              <Wifi className="h-4 w-4" />
              <span className="hidden sm:inline">ESP32</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex items-center space-x-2 data-[state=active]:bg-background"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <SecurityDashboard 
              stats={dashboardStats} 
              onQuickAction={handleQuickAction} 
            />
          </TabsContent>

          <TabsContent value="face-recognition" className="space-y-6">
            <FaceRecognition 
              authorizedUsers={authorizedUsers}
              onAddUser={addUser}
              onDeleteUser={deleteUser}
            />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertMonitor 
              alerts={alerts}
              onClearAlert={clearAlert}
            />
          </TabsContent>

          <TabsContent value="esp32-control" className="space-y-6">
            <ESP32Manager 
              esp32Status={esp32Status}
              onConnect={connectESP32}
              onSendAlert={sendAlert}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
