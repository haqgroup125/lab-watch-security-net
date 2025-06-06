
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Shield, Smartphone, Cpu, AlertTriangle, CheckCircle, Users, Bell } from "lucide-react";
import SecurityDashboard from "@/components/SecurityDashboard";
import FaceRecognition from "@/components/FaceRecognition";
import AlertMonitor from "@/components/AlertMonitor";
import ESP32Manager from "@/components/ESP32Manager";
import AlertReceiver from "@/components/AlertReceiver";

const Index = () => {
  const [systemStatus, setSystemStatus] = useState("active");
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance of alert
        setAlertCount(prev => prev + 1);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lab Security System</h1>
                <p className="text-gray-600 text-sm">Real-time Face Recognition & Alert Network</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge 
                variant={systemStatus === "active" ? "default" : "destructive"} 
                className={systemStatus === "active" 
                  ? 'bg-emerald-600 text-white px-3 py-1 shadow-lg border-0' 
                  : 'bg-red-600 text-white px-3 py-1 shadow-lg border-0'
                }
              >
                {systemStatus === "active" ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> System Active</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 mr-1" /> System Alert</>
                )}
              </Badge>
              <div className="text-right p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
                <div className="text-sm text-gray-600 font-medium">Alerts Today</div>
                <div className="text-xl font-bold text-red-600">{alertCount}</div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('/alert-receiver', '_blank')}
                className="bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-gray-50/80 text-gray-900 font-semibold shadow-lg"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Open App 2
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl p-2">
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
            >
              <Shield className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="face-recognition" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
            >
              <Camera className="h-4 w-4" />
              <span>Face Recognition</span>
            </TabsTrigger>
            <TabsTrigger 
              value="alerts" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
            >
              <Bell className="h-4 w-4" />
              <span>Alert Monitor</span>
            </TabsTrigger>
            <TabsTrigger 
              value="alert-receiver" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
            >
              <Smartphone className="h-4 w-4" />
              <span>Alert Receiver</span>
            </TabsTrigger>
            <TabsTrigger 
              value="esp32" 
              className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300"
            >
              <Cpu className="h-4 w-4" />
              <span>ESP32 Control</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SecurityDashboard alertCount={alertCount} systemStatus={systemStatus} />
          </TabsContent>

          <TabsContent value="face-recognition">
            <FaceRecognition />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertMonitor />
          </TabsContent>

          <TabsContent value="alert-receiver">
            <AlertReceiver />
          </TabsContent>

          <TabsContent value="esp32">
            <ESP32Manager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
