
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Shield, Smartphone, Cpu, AlertTriangle, CheckCircle, Users, Bell, Zap } from "lucide-react";
import SecurityDashboard from "@/components/SecurityDashboard";
import FaceRecognition from "@/components/FaceRecognition";
import AlertMonitor from "@/components/AlertMonitor";
import ESP32Manager from "@/components/ESP32Manager";
import AlertReceiver from "@/components/AlertReceiver";
import { useToast } from "@/hooks/use-toast";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";

const Index = () => {
  const [systemStatus, setSystemStatus] = useState("active");
  const [alertCount, setAlertCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const { alerts, fetchAlerts, authorizedUsers, esp32Devices } = useSecuritySystem();

  // Initialize data and simulate real-time updates
  useEffect(() => {
    // Fetch initial data
    fetchAlerts();
    
    // Set alert count from actual database
    setAlertCount(alerts.length);
    
    // Mark system as initialized
    setIsInitialized(true);

    // Simulate real-time updates (random alerts)
    const interval = setInterval(() => {
      // 5% chance of alert
      if (Math.random() < 0.05) { 
        setAlertCount(prev => prev + 1);
        
        if (systemStatus === "active" && Math.random() < 0.2) {
          // 20% chance of changing system status to alert
          setSystemStatus("alert");
          
          toast({
            title: "Security System Alert",
            description: "Security concern detected. Check alerts for details.",
            variant: "destructive",
          });
          
          // Return to active status after 10 seconds
          setTimeout(() => {
            setSystemStatus("active");
          }, 10000);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [alerts.length, fetchAlerts, toast]);

  // Handle system status changes
  const handleSystemReset = () => {
    setSystemStatus("active");
    toast({
      title: "System Reset",
      description: "Security system status has been reset to active",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lab Security System</h1>
                <p className="text-gray-600 text-sm">Real-time Face Recognition & Alert Network</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge 
                variant={systemStatus === "active" ? "default" : "destructive"} 
                className={systemStatus === "active" 
                  ? 'bg-emerald-600 text-white px-3 py-1 shadow-lg border-0' 
                  : 'bg-red-600 text-white px-3 py-1 shadow-lg border-0 animate-pulse'
                }
              >
                {systemStatus === "active" ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> System Active</>
                ) : (
                  <><AlertTriangle className="h-3 w-3 mr-1" /> System Alert</>
                )}
              </Badge>
              
              {systemStatus === "alert" && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSystemReset}
                  className="bg-white border border-gray-200 hover:bg-gray-50"
                >
                  Reset Alarm
                </Button>
              )}
              
              <div className="text-center p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm">
                <div className="text-sm text-gray-600 font-medium">Security Alerts</div>
                <div className="text-xl font-bold text-red-600">{alertCount}</div>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/alert-receiver'}
                  className="bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-gray-50/80 text-gray-900 font-semibold shadow-lg"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Open Alert App
                </Button>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-gray-50/80 text-gray-900 font-semibold shadow-lg"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
              </div>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm p-2 rounded border border-gray-200">
              <div className="p-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full">
                <Camera className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="text-xs">
                <div className="text-gray-500">Cameras</div>
                <div className="font-medium text-gray-900">Active</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm p-2 rounded border border-gray-200">
              <div className="p-1.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full">
                <Users className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="text-xs">
                <div className="text-gray-500">Authorized Users</div>
                <div className="font-medium text-gray-900">{authorizedUsers.length}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm p-2 rounded border border-gray-200">
              <div className="p-1.5 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full">
                <Cpu className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="text-xs">
                <div className="text-gray-500">ESP32 Devices</div>
                <div className="font-medium text-gray-900">{esp32Devices.length || 1}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm p-2 rounded border border-gray-200">
              <div className="p-1.5 bg-gradient-to-r from-red-500 to-pink-600 rounded-full">
                <Bell className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="text-xs">
                <div className="text-gray-500">Last Alert</div>
                <div className="font-medium text-gray-900">
                  {alerts.length > 0 
                    ? new Date(alerts[0].created_at).toLocaleTimeString() 
                    : "None"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {!isInitialized ? (
        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block p-4 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full">
              <Shield className="h-10 w-10 text-white animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Security System</h2>
            <p className="text-gray-600">Initializing components and connections...</p>
          </div>
        </div>
      ) : (
        // Main Content
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-5 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl p-2">
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

            {/* System Status Alert */}
            {systemStatus === "alert" && (
              <Alert className="bg-red-50 border-red-200 shadow-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">
                  Security alert detected! Please check alert monitors and take appropriate action.
                </AlertDescription>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleSystemReset}
                  className="ml-auto"
                >
                  Reset Alarm
                </Button>
              </Alert>
            )}

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
          
          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Professional Security System v1.0</p>
            <p className="text-xs mt-1">© {new Date().getFullYear()} Lab Security Solutions</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
