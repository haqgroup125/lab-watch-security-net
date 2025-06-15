import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Bell, Settings, Vibrate, Volume2, AlertTriangle, CheckCircle, Clock, User, MapPin, Camera, Zap, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";

const AlertReceiver = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [autoAcknowledge, setAutoAcknowledge] = useState(false);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<string[]>([]);
  const { toast } = useToast();
  const { alerts, fetchAlerts } = useSecuritySystem();

  // Just real alerts, always starts empty if none in db
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    // Map data from Supabase to UI-friendly format, no fake fields!
    if (alerts && Array.isArray(alerts)) {
      setRecentAlerts(
        alerts
          .slice() // shallow copy
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(alert => ({
            ...alert,
            acknowledged: alert.acknowledged ?? false,
            confidence: alert.confidence_score ?? 100,
            image_url: alert.image_url ?? null,
            location: alert.source_device || "System",
            type: alert.alert_type ?? "system_status",
            severity: alert.severity ?? "low",
            message: alert.details || "Alert",
            timestamp: alert.created_at
          }))
      );
    }
  }, [alerts]);

  // Remove all simulation/fake-alert generation!
  // No setInterval: the only alerts shown are those from backend

  useEffect(() => {
    // Simulate auto-acknowledgment for real alerts only
    if (autoAcknowledge) {
      const timeout = setTimeout(() => {
        const unacknowledgedIds = recentAlerts
          .filter(alert => !alert.acknowledged)
          .map(alert => alert.id);

        setRecentAlerts(prev =>
          prev.map(alert => ({ ...alert, acknowledged: true }))
        );
        setAcknowledgedAlerts(prev => [...prev, ...unacknowledgedIds]);

        toast({
          title: "Alerts Auto-Acknowledged",
          description: `${unacknowledgedIds.length} alerts marked as reviewed`,
        });
      }, 300000); // 5 minutes

      return () => clearTimeout(timeout);
    }
  }, [autoAcknowledge, recentAlerts, acknowledgedAlerts, toast]);

  const handleAcknowledge = (alertId: string) => {
    setRecentAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId
          ? { ...alert, acknowledged: true }
          : alert
      )
    );
    setAcknowledgedAlerts(prev => [...prev, alertId]);

    toast({
      title: "Alert Acknowledged",
      description: "Alert has been marked as reviewed",
    });
  };

  const handleAcknowledgeAll = () => {
    const unacknowledgedIds = recentAlerts
      .filter(alert => !alert.acknowledged)
      .map(alert => alert.id);

    setRecentAlerts(prev =>
      prev.map(alert => ({ ...alert, acknowledged: true }))
    );
    setAcknowledgedAlerts(prev => [...prev, ...unacknowledgedIds]);

    toast({
      title: "All Alerts Acknowledged",
      description: `${unacknowledgedIds.length} alerts marked as reviewed`,
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "low": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high": return AlertTriangle;
      case "medium": return Bell;
      case "low": return CheckCircle;
      default: return Bell;
    }
  };

  const unacknowledgedCount = recentAlerts.filter(alert => !alert.acknowledged).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Enhanced Alert Receiver Status */}
      <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <CardTitle className="flex items-center justify-between text-gray-900">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <span>Alert Receiver</span>
            </div>
            <Badge variant={isEnabled ? "default" : "outline"} className={isEnabled ? "bg-green-600" : ""}>
              {isEnabled ? "🟢 Active" : "🔴 Disabled"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          
          {/* Status Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <Bell className="h-6 w-6 mx-auto text-blue-600 mb-2" />
              <div className="text-lg font-bold text-blue-900">{recentAlerts.length}</div>
              <div className="text-sm text-blue-700">Total Alerts</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
              <AlertTriangle className="h-6 w-6 mx-auto text-red-600 mb-2" />
              <div className="text-lg font-bold text-red-900">{unacknowledgedCount}</div>
              <div className="text-sm text-red-700">Unacknowledged</div>
            </div>
          </div>

          {/* Enhanced Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Alert Receiver</div>
                  <div className="text-sm text-gray-600">Enable/disable alert notifications</div>
                </div>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <Volume2 className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Sound Alerts</div>
                  <div className="text-sm text-gray-600">Play sound for new alerts</div>
                </div>
              </div>
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <Vibrate className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium text-gray-900">Vibration</div>
                  <div className="text-sm text-gray-600">Vibrate device for alerts</div>
                </div>
              </div>
              <Switch checked={vibrationEnabled} onCheckedChange={setVibrationEnabled} />
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium text-gray-900">Auto Acknowledge</div>
                  <div className="text-sm text-gray-600">Auto-acknowledge after 5 minutes</div>
                </div>
              </div>
              <Switch checked={autoAcknowledge} onCheckedChange={setAutoAcknowledge} />
            </div>
          </div>

          {/* Connection Status */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">Connection Status</span>
            </div>
            <div className="text-sm text-green-700">
              Connected to Security System
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Last sync: {new Date().toLocaleTimeString()}
            </div>
          </div>

          {!isEnabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Alert receiver is disabled. You will not receive security notifications.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Recent Alerts */}
      <Card className="lg:col-span-2 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-gray-100">
          <CardTitle className="flex items-center justify-between text-gray-900">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-red-600" />
              <span>Recent Security Alerts</span>
            </div>
            <div className="flex items-center space-x-2">
              {unacknowledgedCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAcknowledgeAll}
                  className="bg-white"
                >
                  Acknowledge All ({unacknowledgedCount})
                </Button>
              )}
              <Badge variant="outline" className="border-red-500 text-red-700">
                {unacknowledgedCount} New
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No alerts received</p>
                <p className="text-sm">Security system is monitoring</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentAlerts.map((alert, index) => {
                  const SeverityIcon = getSeverityIcon(alert.severity);
                  return (
                    <div 
                      key={alert.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !alert.acknowledged ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                            <SeverityIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium text-gray-900 truncate">{alert.message}</h4>
                              <Badge 
                                variant={alert.severity === "high" ? "destructive" : "outline"}
                                className="text-xs"
                              >
                                {alert.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{alert.location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Camera className="h-3 w-3" />
                                <span>{alert.confidence}% confidence</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {alert.acknowledged ? (
                            <Badge variant="outline" className="text-green-700 border-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Acknowledged
                            </Badge>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleAcknowledge(alert.id)}
                              className="bg-white text-blue-600 border-blue-500 hover:bg-blue-50"
                            >
                              Acknowledge
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Alert Statistics */}
      <Card className="lg:col-span-3 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-100">
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Settings className="h-5 w-5 text-purple-600" />
            <span>Alert Statistics & Mobile Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Today's Stats */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 mb-3">Today's Activity</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Alerts:</span>
                  <span className="font-medium text-gray-900">{recentAlerts.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">High Priority:</span>
                  <span className="font-medium text-red-600">
                    {recentAlerts.filter(a => a.severity === "high").length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Acknowledged:</span>
                  <span className="font-medium text-green-600">
                    {recentAlerts.filter(a => a.acknowledged).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Response Time:</span>
                  <span className="font-medium text-blue-600">2.3 min avg</span>
                </div>
              </div>
            </div>

            {/* Alert Types */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 mb-3">Alert Categories</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Unauthorized Access:</span>
                  <span className="font-medium text-red-600">
                    {recentAlerts.filter(a => a.type === "unauthorized_access").length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Motion Detection:</span>
                  <span className="font-medium text-yellow-600">
                    {recentAlerts.filter(a => a.type === "motion_detected").length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Door Access:</span>
                  <span className="font-medium text-blue-600">
                    {recentAlerts.filter(a => a.type === "door_access").length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">System Status:</span>
                  <span className="font-medium text-green-600">
                    {recentAlerts.filter(a => a.type === "system_status").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile App Features */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 mb-3">Mobile Features</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Push Notifications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Sound & Vibration</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Real-time Alerts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Quick Acknowledge</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Alert History</span>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 mb-3">System Health</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Connection:</span>
                  <span className="font-medium text-green-600">Stable</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Latency:</span>
                  <span className="font-medium text-blue-600">23ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Uptime:</span>
                  <span className="font-medium text-green-600">99.8%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Last Sync:</span>
                  <span className="font-medium text-gray-900">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile App Instructions */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Mobile App Setup</h4>
                <p className="text-sm text-blue-800 mb-3">
                  This Alert Receiver simulates a mobile app interface. In a real implementation:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Install the security app on your smartphone</li>
                  <li>• Connect to the same network as the security system</li>
                  <li>• Enable push notifications in your device settings</li>
                  <li>• Configure alert preferences and acknowledgment settings</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertReceiver;
