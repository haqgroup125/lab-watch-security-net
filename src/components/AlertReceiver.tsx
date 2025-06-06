
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Wifi, Bell, CheckCircle, AlertTriangle, Radio, Settings } from "lucide-react";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";
import { useToast } from "@/hooks/use-toast";

const AlertReceiver = () => {
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [serverPort, setServerPort] = useState(8080);
  const [deviceName, setDeviceName] = useState("Security Alert Receiver");
  const [deviceIP, setDeviceIP] = useState("");
  const [showFullScreenAlert, setShowFullScreenAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [heartbeatCounter, setHeartbeatCounter] = useState(0);
  
  const { alerts, fetchAlerts } = useSecuritySystem();
  const { toast } = useToast();

  // Get device IP on mount
  useEffect(() => {
    const getNetworkInfo = async () => {
      try {
        // Use public API to get IP - in production you would use proper network detection
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setDeviceIP(data.ip);
      } catch (error) {
        console.error('Failed to get IP:', error);
        // Fallback to local IP format
        setDeviceIP('192.168.1.X');
      }
    };

    getNetworkInfo();
  }, []);

  // Simulate receiving alerts and heartbeat
  useEffect(() => {
    if (isServerRunning) {
      // Poll for alerts
      const alertInterval = setInterval(() => {
        fetchAlerts();
        
        // Heartbeat counter for connection status
        setHeartbeatCounter(prev => prev + 1);
      }, 5000);

      return () => clearInterval(alertInterval);
    }
  }, [isServerRunning, fetchAlerts]);

  // Listen for new alerts
  useEffect(() => {
    if (alerts.length > 0 && isServerRunning) {
      const latestAlert = alerts[0];
      
      // Check if this is a high severity alert
      if (latestAlert && latestAlert.severity === 'high') {
        handleIncomingAlert(latestAlert);
      }
    }
  }, [alerts, isServerRunning]);
  
  // Handle incoming alert
  const handleIncomingAlert = (alert: any) => {
    setCurrentAlert(alert);
    setShowFullScreenAlert(true);

    // Sound alert if enabled
    if (soundEnabled) {
      playAlertSound();
    }
    
    // Vibrate if enabled and supported by browser
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([500, 300, 500]);
    }
    
    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      setShowFullScreenAlert(false);
    }, 15000);
    
    // Show toast notification
    toast({
      title: "SECURITY ALERT",
      description: alert.details || alert.alert_type,
      variant: "destructive",
    });
  };

  // Play alert sound
  const playAlertSound = () => {
    try {
      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      
      // Create oscillator for alarm sound
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Start sound
      oscillator.start();
      
      // Alarm pattern
      for (let i = 0; i < 4; i++) {
        const startTime = audioCtx.currentTime + (i * 0.5);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(1, startTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.4);
      }
      
      // Stop after pattern
      setTimeout(() => {
        oscillator.stop();
      }, 2000);
    } catch (error) {
      console.error('Error playing alert sound:', error);
    }
  };

  // Start/stop alert server
  const toggleServer = () => {
    if (isServerRunning) {
      stopServer();
    } else {
      startServer();
    }
  };

  const startServer = () => {
    setIsServerRunning(true);
    
    toast({
      title: "Alert Receiver Active",
      description: `${deviceName} is now receiving security alerts`,
      variant: "default",
    });
    
    // Request notification permission
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    
    // Test sound if enabled
    if (soundEnabled) {
      setTimeout(() => {
        playAlertSound();
      }, 500);
    }
  };

  const stopServer = () => {
    setIsServerRunning(false);
    
    toast({
      title: "Alert Receiver Stopped",
      description: "No longer receiving security alerts",
      variant: "secondary",
    });
  };

  const dismissAlert = () => {
    setShowFullScreenAlert(false);
    setCurrentAlert(null);
  };

  // Test alert
  const triggerTestAlert = () => {
    const testAlert = {
      id: 'test-' + Date.now(),
      alert_type: 'Test Alert',
      severity: 'high',
      details: 'This is a test of the security alert system',
      source_device: deviceName,
      created_at: new Date().toISOString(),
      confidence_score: 100,
      detected_person: 'Test User'
    };
    
    handleIncomingAlert(testAlert);
  };

  // Full-screen alert display
  if (showFullScreenAlert && currentAlert) {
    return (
      <div className="fixed inset-0 bg-red-900/95 z-50 flex items-center justify-center">
        <div className="bg-slate-800 max-w-md w-full mx-4 rounded-lg border-2 border-red-500 shadow-2xl overflow-hidden">
          {/* Alert Header */}
          <div className="p-4 bg-gradient-to-r from-red-900 to-red-800 text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto animate-pulse mb-2" />
            <h1 className="text-2xl font-bold text-white mb-1">SECURITY ALERT</h1>
            <Badge variant="destructive" className="text-sm px-3 py-0.5">
              {currentAlert.severity.toUpperCase()}
            </Badge>
          </div>
          
          {/* Alert Content */}
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-red-400">{currentAlert.alert_type}</h2>
              <p className="text-white">{currentAlert.details}</p>
            </div>
            
            <div className="bg-slate-900 rounded p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Time:</span>
                <span className="text-slate-100 font-mono">
                  {new Date(currentAlert.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Source:</span>
                <span className="text-slate-100">{currentAlert.source_device}</span>
              </div>
              {currentAlert.detected_person && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Person:</span>
                  <span className="text-slate-100">{currentAlert.detected_person}</span>
                </div>
              )}
              {currentAlert.confidence_score !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Confidence:</span>
                  <span className="text-slate-100">{currentAlert.confidence_score}%</span>
                </div>
              )}
            </div>
            
            <Button 
              onClick={dismissAlert} 
              variant="destructive" 
              className="w-full bg-gradient-to-r from-red-600 to-red-700"
            >
              Acknowledge Alert
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* Server Status */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <CardTitle className="flex items-center justify-between text-gray-900">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <span>Alert Receiver</span>
              </div>
              <Badge variant={isServerRunning ? "default" : "secondary"} className={isServerRunning ? 'bg-green-600' : ''}>
                {isServerRunning ? "🟢 Running" : "⚫ Stopped"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="device-name" className="text-sm font-medium text-gray-700">Device Name</Label>
                <Input
                  id="device-name"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Security Alert Receiver"
                  className="mt-1 bg-white border-gray-300"
                  disabled={isServerRunning}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="device-ip" className="text-sm font-medium text-gray-700">IP Address</Label>
                  <Input
                    id="device-ip"
                    value={deviceIP}
                    disabled
                    className="mt-1 bg-gray-50 border-gray-300"
                  />
                </div>
                <div>
                  <Label htmlFor="device-port" className="text-sm font-medium text-gray-700">Port</Label>
                  <Input
                    id="device-port"
                    type="number"
                    value={serverPort}
                    onChange={(e) => setServerPort(parseInt(e.target.value))}
                    className="mt-1 bg-white border-gray-300"
                    disabled={isServerRunning}
                  />
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="grid grid-cols-2 gap-3 bg-gradient-to-r from-gray-50 to-blue-50 p-3 rounded-lg border border-gray-200">
              <div className="flex flex-col items-center p-2 bg-white/60 rounded">
                <Radio className={`h-5 w-5 ${isServerRunning ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
                <div className="text-xs font-medium mt-1 text-center">
                  {isServerRunning ? 'Connected' : 'Offline'}
                </div>
                <div className="text-xs text-gray-500">
                  {isServerRunning ? `Heartbeat: ${heartbeatCounter}` : 'No signal'}
                </div>
              </div>
              <div className="flex flex-col items-center p-2 bg-white/60 rounded">
                <Bell className={`h-5 w-5 ${alerts.length > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                <div className="text-xs font-medium mt-1 text-center">
                  {alerts.length} Alerts
                </div>
                <div className="text-xs text-gray-500">
                  {alerts.length > 0 
                    ? `Latest: ${new Date(alerts[0]?.created_at).toLocaleTimeString()}`
                    : 'No alerts yet'}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex space-x-2">
              <Button 
                onClick={toggleServer} 
                className={`flex-1 ${isServerRunning 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'}`}
              >
                <Wifi className="h-4 w-4 mr-2" />
                {isServerRunning ? "Stop Server" : "Start Alert Server"}
              </Button>
              
              <Button 
                onClick={triggerTestAlert} 
                variant="outline" 
                className="bg-white"
                disabled={!isServerRunning}
              >
                <Bell className="h-4 w-4 mr-2" />
                Test Alert
              </Button>
            </div>

            {/* Status Messages */}
            {isServerRunning && (
              <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Alert receiver is operational. This device will display full-screen alerts for security events.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-100">
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <Settings className="h-5 w-5 text-purple-600" />
              <span>Alert Receiver Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {/* Alert Preferences */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Alert Preferences</h3>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div>
                  <div className="font-medium text-gray-900">Sound Alerts</div>
                  <div className="text-sm text-gray-600">Play sound when alerts are received</div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox" 
                    id="sound-enabled"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div>
                  <div className="font-medium text-gray-900">Vibration</div>
                  <div className="text-sm text-gray-600">Vibrate device on critical alerts</div>
                  <div className="text-xs text-gray-500">(Only on supported devices)</div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="vibration-enabled" 
                    checked={vibrationEnabled}
                    onChange={(e) => setVibrationEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                  />
                </div>
              </div>
            </div>
            
            {/* Mobile App Instructions */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Mobile Installation</h3>
              
              <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <AlertDescription className="text-blue-800">
                  <span className="font-medium">Install as App:</span> For best experience, add this page to your home screen.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-white rounded border border-gray-200">
                  <span className="font-medium text-gray-900">Android:</span>
                  <span className="text-gray-600"> Chrome → Menu → Add to Home Screen</span>
                </div>
                <div className="p-2 bg-white rounded border border-gray-200">
                  <span className="font-medium text-gray-900">iOS:</span>
                  <span className="text-gray-600"> Safari → Share → Add to Home Screen</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100">
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <Bell className="h-5 w-5 text-amber-600" />
              <span>Alert History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:from-gray-100 hover:to-blue-100 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={
                      alert.severity === 'high' ? "destructive" : 
                      alert.severity === 'medium' ? "secondary" : "outline"
                    }>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900">{alert.alert_type}</div>
                    <div className="text-sm text-gray-600">{alert.details}</div>
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>Source: {alert.source_device}</span>
                      <span>Person: {alert.detected_person || "Unknown"}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-7 px-2 hover:bg-slate-100"
                      onClick={() => handleIncomingAlert(alert)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
              
              {alerts.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No Alerts Received</p>
                  <p className="text-sm text-gray-400 mt-1">Security system is monitoring for events</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AlertReceiver;
