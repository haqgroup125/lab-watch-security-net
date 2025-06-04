import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Wifi, Bell, CheckCircle, AlertTriangle, Volume2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface ReceivedAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  confidence?: number;
  image_url?: string;
  source?: string;
}

const AlertReceiverApp = () => {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [serverPort, setServerPort] = useState(8080);
  const [deviceName, setDeviceName] = useState("Alert Receiver");
  const [deviceIp, setDeviceIp] = useState("192.168.1.100");
  const [showFullScreenAlert, setShowFullScreenAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<ReceivedAlert | null>(null);
  const [receivedAlerts, setReceivedAlerts] = useState<ReceivedAlert[]>([]);
  const [alertSound, setAlertSound] = useState<HTMLAudioElement | null>(null);

  // Register this device in the database
  const registerDevice = async () => {
    try {
      const { error } = await supabase
        .from('alert_receivers')
        .upsert({
          device_name: deviceName,
          ip_address: deviceIp,
          port: serverPort,
          status: 'online',
          last_heartbeat: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error registering device:', error);
    }
  };

  // Simulate HTTP server listening for alerts
  const startServer = async () => {
    setIsServerRunning(true);
    await registerDevice();
    console.log(`Alert receiver server started on ${deviceIp}:${serverPort}`);
    
    // Simulate real-time alert reception via Supabase
    const channel = supabase
      .channel('alert-receiver')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_alerts'
      }, (payload) => {
        const newAlert = payload.new as any;
        handleNewAlert({
          id: newAlert.id,
          type: newAlert.alert_type,
          severity: newAlert.severity,
          message: newAlert.details || 'Security alert triggered',
          timestamp: newAlert.created_at,
          confidence: newAlert.confidence_score,
          source: newAlert.source_device
        });
      })
      .subscribe();

    // Keep device heartbeat alive
    const heartbeatInterval = setInterval(async () => {
      if (isServerRunning) {
        await registerDevice();
      }
    }, 30000); // Every 30 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeatInterval);
    };
  };

  const stopServer = async () => {
    setIsServerRunning(false);
    
    // Update device status to offline
    try {
      await supabase
        .from('alert_receivers')
        .update({ status: 'offline' })
        .eq('device_name', deviceName);
    } catch (error) {
      console.error('Error updating device status:', error);
    }
    
    console.log("Alert receiver server stopped");
  };

  const handleNewAlert = (alert: ReceivedAlert) => {
    setReceivedAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    
    if (alert.severity === 'high') {
      setCurrentAlert(alert);
      setShowFullScreenAlert(true);
      
      // Play alert sound
      if (alertSound) {
        alertSound.play().catch(console.error);
      }
      
      // Auto-dismiss after 15 seconds
      setTimeout(() => {
        setShowFullScreenAlert(false);
      }, 15000);
    }
  };

  const dismissAlert = () => {
    setShowFullScreenAlert(false);
    setCurrentAlert(null);
  };

  const testAlert = () => {
    const testAlertData: ReceivedAlert = {
      id: Date.now().toString(),
      type: "Test Alert",
      severity: "high",
      message: "This is a test alert to verify the system is working",
      timestamp: new Date().toISOString(),
      source: "Manual Test"
    };
    handleNewAlert(testAlertData);
  };

  const playTestSound = () => {
    if (alertSound) {
      alertSound.play().catch(console.error);
    }
  };

  useEffect(() => {
    // Create alert sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAcBz+U2++0eyQFKXvJ8tySQgsVYbLr77BTEwlJpd/yu2AdBjiS2+6+eyQGJ33L8dyOOQYRWq7n670cBTqY3PG7dyMFl'); // Simplified beep sound
    setAlertSound(audio);
  }, []);

  if (showFullScreenAlert && currentAlert) {
    return (
      <div className="fixed inset-0 bg-red-900/95 z-50 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg border-2 border-red-500 max-w-md w-full mx-4 animate-pulse">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-20 w-20 text-red-500 mx-auto animate-bounce" />
            <h1 className="text-3xl font-bold text-white">🚨 SECURITY ALERT 🚨</h1>
            <div className="space-y-3">
              <p className="text-2xl text-red-400 font-bold">{currentAlert.type}</p>
              <p className="text-xl text-white">{currentAlert.message}</p>
              <p className="text-slate-300">
                <strong>Time:</strong> {new Date(currentAlert.timestamp).toLocaleString()}
              </p>
              {currentAlert.source && (
                <p className="text-slate-300">
                  <strong>Source:</strong> {currentAlert.source}
                </p>
              )}
              {currentAlert.confidence && (
                <p className="text-slate-300">
                  <strong>Confidence:</strong> {currentAlert.confidence}%
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button onClick={dismissAlert} variant="destructive" className="flex-1">
                Acknowledge Alert
              </Button>
              <Button onClick={playTestSound} variant="outline">
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Security Alert Receiver</h1>
          <p className="text-slate-400">Mobile App 2 - Real-time Alert Reception</p>
        </div>

        {/* Device Configuration */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Smartphone className="h-5 w-5 text-blue-400" />
              <span>Device Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deviceName" className="text-white">Device Name</Label>
              <Input
                id="deviceName"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                disabled={isServerRunning}
              />
            </div>
            <div>
              <Label htmlFor="deviceIp" className="text-white">Device IP Address</Label>
              <Input
                id="deviceIp"
                value={deviceIp}
                onChange={(e) => setDeviceIp(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                disabled={isServerRunning}
              />
            </div>
          </CardContent>
        </Card>

        {/* Server Status */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Wifi className="h-5 w-5 text-blue-400" />
                <span>Alert Server Status</span>
              </div>
              <Badge variant={isServerRunning ? "default" : "secondary"}>
                {isServerRunning ? "ONLINE" : "OFFLINE"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-400">Status</div>
                <div className={`font-medium ${isServerRunning ? 'text-green-400' : 'text-red-400'}`}>
                  {isServerRunning ? 'Listening for alerts' : 'Stopped'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Port</div>
                <div className="font-mono text-blue-400">{serverPort}</div>
              </div>
              <div>
                <div className="text-slate-400">Alerts Received</div>
                <div className="font-mono text-white">{receivedAlerts.length}</div>
              </div>
              <div>
                <div className="text-slate-400">Device IP</div>
                <div className="font-mono text-blue-400">{deviceIp}</div>
              </div>
            </div>

            <div className="flex space-x-2">
              {!isServerRunning ? (
                <Button onClick={startServer} className="flex-1">
                  <Wifi className="h-4 w-4 mr-2" />
                  Start Alert Server
                </Button>
              ) : (
                <Button onClick={stopServer} variant="destructive" className="flex-1">
                  Stop Alert Server
                </Button>
              )}
              <Button onClick={testAlert} variant="outline">
                Test Alert
              </Button>
              <Button onClick={playTestSound} variant="outline">
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>

            {isServerRunning && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Server is running and registered in the network. Ready to receive security alerts.
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
              <span>Recent Alerts ({receivedAlerts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {receivedAlerts.map((alert) => (
              <div key={alert.id} className="p-4 bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={alert.severity === 'high' ? "destructive" : alert.severity === 'medium' ? "secondary" : "outline"}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-slate-400">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-white">{alert.type}</div>
                  <div className="text-sm text-slate-400">{alert.message}</div>
                  {alert.source && (
                    <div className="text-xs text-slate-500">Source: {alert.source}</div>
                  )}
                  {alert.confidence && (
                    <div className="text-xs text-slate-500">Confidence: {alert.confidence}%</div>
                  )}
                </div>
              </div>
            ))}
            {receivedAlerts.length === 0 && (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">No alerts received</p>
                <p className="text-sm text-slate-500">Waiting for security alerts...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AlertReceiverApp;
