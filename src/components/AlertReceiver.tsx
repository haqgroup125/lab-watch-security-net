
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Wifi, Bell, CheckCircle, AlertTriangle } from "lucide-react";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";

const AlertReceiver = () => {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [serverPort, setServerPort] = useState(8080);
  const [deviceName, setDeviceName] = useState("Alert Receiver App");
  const [showFullScreenAlert, setShowFullScreenAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<any>(null);
  
  const { alerts, fetchAlerts } = useSecuritySystem();

  // Simulate receiving alerts
  useEffect(() => {
    if (isServerRunning) {
      const interval = setInterval(() => {
        // Check for new alerts
        fetchAlerts();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isServerRunning, fetchAlerts]);

  // Listen for new alerts
  useEffect(() => {
    if (alerts.length > 0) {
      const latestAlert = alerts[0];
      if (latestAlert && latestAlert.severity === 'high') {
        setCurrentAlert(latestAlert);
        setShowFullScreenAlert(true);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          setShowFullScreenAlert(false);
        }, 10000);
      }
    }
  }, [alerts]);

  const startServer = () => {
    setIsServerRunning(true);
    console.log(`Alert receiver server started on port ${serverPort}`);
  };

  const stopServer = () => {
    setIsServerRunning(false);
    console.log("Alert receiver server stopped");
  };

  const dismissAlert = () => {
    setShowFullScreenAlert(false);
    setCurrentAlert(null);
  };

  if (showFullScreenAlert && currentAlert) {
    return (
      <div className="fixed inset-0 bg-red-900/95 z-50 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg border-2 border-red-500 max-w-md w-full mx-4">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto animate-pulse" />
            <h1 className="text-2xl font-bold text-white">SECURITY ALERT</h1>
            <div className="space-y-2">
              <p className="text-xl text-red-400">{currentAlert.alert_type}</p>
              <p className="text-white">{currentAlert.details}</p>
              <p className="text-slate-300">
                Time: {new Date(currentAlert.created_at).toLocaleString()}
              </p>
              <p className="text-slate-300">
                Source: {currentAlert.source_device}
              </p>
            </div>
            <Button onClick={dismissAlert} variant="destructive" className="w-full">
              Acknowledge Alert
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Server Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-blue-400" />
              <span>Alert Receiver Server</span>
            </div>
            <Badge variant={isServerRunning ? "default" : "secondary"}>
              {isServerRunning ? "Running" : "Stopped"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Device Name</div>
              <div className="text-white">{deviceName}</div>
            </div>
            <div>
              <div className="text-slate-400">Port</div>
              <div className="font-mono text-blue-400">{serverPort}</div>
            </div>
            <div>
              <div className="text-slate-400">Status</div>
              <div className={`font-medium ${isServerRunning ? 'text-green-400' : 'text-red-400'}`}>
                {isServerRunning ? 'Online' : 'Offline'}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Alerts Received</div>
              <div className="font-mono text-white">{alerts.length}</div>
            </div>
          </div>

          <div className="space-y-2">
            {!isServerRunning ? (
              <Button onClick={startServer} className="w-full">
                <Wifi className="h-4 w-4 mr-2" />
                Start Alert Server
              </Button>
            ) : (
              <Button onClick={stopServer} variant="destructive" className="w-full">
                Stop Alert Server
              </Button>
            )}
          </div>

          {isServerRunning && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Alert receiver is running and listening for security alerts. This device will show full-screen alerts when threats are detected.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Bell className="h-5 w-5 text-yellow-400" />
            <span>Recent Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-80 overflow-y-auto">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant={alert.severity === 'high' ? "destructive" : alert.severity === 'medium' ? "secondary" : "outline"}>
                  {alert.severity.toUpperCase()}
                </Badge>
                <span className="text-sm text-slate-400">
                  {new Date(alert.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-white">{alert.alert_type}</div>
                <div className="text-sm text-slate-400">{alert.details}</div>
                <div className="text-xs text-slate-500">
                  From: {alert.source_device} | Person: {alert.detected_person || "Unknown"}
                </div>
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No alerts received</p>
              <p className="text-sm text-slate-500">Waiting for security alerts...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-white">App 2 - Alert Receiver Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="font-medium text-white mb-2">For Mobile App Development:</h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p>• Create an Android app that runs an HTTP server on port 8080</p>
              <p>• Listen for POST requests to /alert endpoint</p>
              <p>• Show full-screen popup when high-severity alerts are received</p>
              <p>• Log all alerts with timestamps to local SQLite database</p>
              <p>• Add sound and vibration notifications</p>
            </div>
          </div>
          
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="font-medium text-white mb-2">API Endpoint Format:</h3>
            <div className="bg-slate-900 p-3 rounded font-mono text-sm text-green-400">
              POST http://[device-ip]:8080/alert<br/>
              Content-Type: application/json<br/><br/>
              {`{
  "type": "unauthorized_face",
  "severity": "high",
  "message": "Unknown face detected",
  "timestamp": "2024-01-01T12:00:00Z",
  "confidence": 0,
  "image_url": "optional"
}`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertReceiver;
