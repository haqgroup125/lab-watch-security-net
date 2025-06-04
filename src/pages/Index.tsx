
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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold">Lab Security System</h1>
                <p className="text-slate-400 text-sm">Real-time Face Recognition & Alert Network</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={systemStatus === "active" ? "default" : "destructive"} className="px-3 py-1">
                {systemStatus === "active" ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> System Active</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 mr-1" /> System Alert</>
                )}
              </Badge>
              <div className="text-right">
                <div className="text-sm text-slate-400">Alerts Today</div>
                <div className="text-xl font-bold text-red-400">{alertCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="face-recognition" className="flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <span>Face Recognition</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Alert Monitor</span>
            </TabsTrigger>
            <TabsTrigger value="esp32" className="flex items-center space-x-2">
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

          <TabsContent value="esp32">
            <ESP32Manager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
