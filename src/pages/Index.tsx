
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Camera, 
  Activity, 
  Settings, 
  Users, 
  AlertTriangle,
  Zap,
  Monitor,
  Eye,
  Lock
} from "lucide-react";
import SecurityDashboard from "@/components/SecurityDashboard";
import FaceRecognition from "@/components/FaceRecognition";
import ESP32Manager from "@/components/ESP32Manager";
import AlertMonitor from "@/components/AlertMonitor";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { authorizedUsers, alerts, esp32Devices } = useSecuritySystem();

  // Get quick stats for overview
  const stats = {
    totalUsers: authorizedUsers.length,
    activeAlerts: alerts.filter(alert => !alert.acknowledged).length,
    onlineDevices: esp32Devices.filter(device => device.status === 'online').length,
    totalDevices: esp32Devices.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Security System</h1>
                <p className="text-gray-600">Face Recognition & ESP32 Integration</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{stats.totalUsers}</div>
                <div className="text-xs text-gray-600">Users</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{stats.activeAlerts}</div>
                <div className="text-xs text-gray-600">Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{stats.onlineDevices}/{stats.totalDevices}</div>
                <div className="text-xs text-gray-600">Devices</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          
          {/* Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5 mb-6 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-sm">
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="face-recognition"
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Face Recognition</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="esp32-manager"
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">ESP32 Manager</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="alerts"
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
              {stats.activeAlerts > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {stats.activeAlerts}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger 
              value="alert-receiver"
              className="hidden lg:flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <Monitor className="h-4 w-4" />
              <span>Alert Receiver</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="dashboard" className="mt-0">
            <SecurityDashboard />
          </TabsContent>

          <TabsContent value="face-recognition" className="mt-0">
            <FaceRecognition />
          </TabsContent>

          <TabsContent value="esp32-manager" className="mt-0">
            <ESP32Manager />
          </TabsContent>

          <TabsContent value="alerts" className="mt-0">
            <AlertMonitor />
          </TabsContent>

          <TabsContent value="alert-receiver" className="mt-0">
            <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-100">
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl shadow-lg">
                    <Monitor className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Alert Receiver</h3>
                    <p className="text-gray-600 text-sm">Dedicated alert monitoring interface</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Monitor className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Alert Receiver Mode</h4>
                  <p className="text-gray-600 mb-4">
                    This interface is designed for dedicated alert monitoring displays.
                  </p>
                  <Button 
                    onClick={() => window.open('/alert-receiver', '_blank')}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Open Alert Receiver
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* System Status Footer */}
        <div className="mt-8 p-4 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-600">System Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">Face Recognition Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">Security Enabled</span>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
