
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  Activity, 
  Settings, 
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Camera,
  Wifi
} from "lucide-react";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";
import SystemSettings from "./SystemSettings";

const SecurityDashboard = () => {
  const { 
    authorizedUsers, 
    alerts, 
    esp32Devices, 
    systemSettings,
    acknowledgeAlert,
    testAllESP32Devices 
  } = useSecuritySystem();
  
  const [showSettings, setShowSettings] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState(alerts.slice(0, 5));
  const [systemStatus, setSystemStatus] = useState({
    camera: 'operational',
    esp32: 'connected',
    database: 'online',
    alerts: 'active'
  });

  useEffect(() => {
    setRecentAlerts(alerts.slice(0, 5));
  }, [alerts]);

  // Get system statistics
  const stats = {
    totalUsers: authorizedUsers.length,
    activeAlerts: alerts.filter(alert => !alert.acknowledged).length,
    onlineDevices: esp32Devices.filter(device => device.status === 'online').length,
    totalDevices: esp32Devices.length,
    todayAlerts: alerts.filter(alert => {
      const today = new Date().toDateString();
      return new Date(alert.created_at).toDateString() === today;
    }).length,
    highPriorityAlerts: alerts.filter(alert => 
      alert.severity === 'high' && !alert.acknowledged
    ).length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'operational':
      case 'connected':
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'offline':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
            <p className="text-gray-600">Real-time security system monitoring</p>
          </div>
          <Button 
            onClick={() => setShowSettings(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            System Settings
          </Button>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Camera System</p>
                  <p className="text-2xl font-bold text-gray-900">Active</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
              <Badge className={`mt-2 ${getStatusColor(systemStatus.camera)}`}>
                {systemStatus.camera}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ESP32 Devices</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.onlineDevices}/{stats.totalDevices}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
              <Badge className={`mt-2 ${getStatusColor(stats.onlineDevices > 0 ? 'online' : 'offline')}`}>
                {stats.onlineDevices > 0 ? 'Connected' : 'Offline'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeAlerts}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
              <Badge className={`mt-2 ${stats.activeAlerts > 0 ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'}`}>
                {stats.activeAlerts > 0 ? 'Attention Required' : 'All Clear'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Authorized Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <Badge className="mt-2 text-blue-600 bg-blue-100">
                Registered
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Today's Alerts</p>
                  <p className="text-xl font-bold text-gray-900">{stats.todayAlerts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Detection Threshold</p>
                  <p className="text-xl font-bold text-gray-900">{systemSettings.face_confidence_threshold}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Eye className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Sensitivity</p>
                  <p className="text-xl font-bold text-gray-900">{systemSettings.detection_sensitivity}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-100">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl shadow-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Recent Security Alerts</h3>
                <p className="text-gray-600 text-sm">Latest 5 security events</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {recentAlerts.length > 0 ? (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`} />
                      <div>
                        <div className="font-medium text-gray-900">{alert.alert_type}</div>
                        <div className="text-sm text-gray-600">
                          {alert.detected_person || 'Unknown'} • {new Date(alert.created_at).toLocaleString()}
                        </div>
                        {alert.details && (
                          <div className="text-xs text-gray-500 mt-1">{alert.details}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.confidence_score && (
                        <Badge variant="outline" className="bg-white">
                          {alert.confidence_score}%
                        </Badge>
                      )}
                      {alert.acknowledged ? (
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Acknowledged
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="bg-white"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No recent alerts</p>
                <p className="text-sm">System is secure</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Device Status */}
          <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Device Status</h3>
                  <p className="text-gray-600 text-sm">ESP32 hardware monitoring</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {esp32Devices.length > 0 ? (
                <div className="space-y-3">
                  {esp32Devices.slice(0, 5).map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${device.status === 'online' ? 'bg-green-500' : device.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        <div>
                          <div className="font-medium text-gray-900">{device.device_name}</div>
                          <div className="text-sm text-gray-600">{device.ip_address}</div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(device.status)}>
                        {device.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Wifi className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No ESP32 devices registered</p>
                  <p className="text-sm">Add devices to monitor hardware status</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
              <CardTitle className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">System Health</h3>
                  <p className="text-gray-600 text-sm">Overall system status</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Camera className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Face Recognition</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Operational
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-purple-600" />
                    <span className="font-medium text-gray-900">ESP32 Network</span>
                  </div>
                  <Badge className={stats.onlineDevices > 0 ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"}>
                    {stats.onlineDevices > 0 ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Disconnected
                      </>
                    )}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-gray-900">Alert System</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* High Priority Alerts */}
        {stats.highPriorityAlerts > 0 && (
          <Alert className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Urgent Attention Required:</strong> You have {stats.highPriorityAlerts} high-priority security alert{stats.highPriorityAlerts > 1 ? 's' : ''} that need immediate attention.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* System Settings Modal */}
      <SystemSettings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
};

export default SecurityDashboard;
