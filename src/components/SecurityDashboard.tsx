
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Smartphone, Cpu, Users, Shield, AlertTriangle, Clock, Wifi, Activity, Eye, Bell } from "lucide-react";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";

interface SecurityDashboardProps {
  alertCount: number;
  systemStatus: string;
}

const SecurityDashboard = ({ alertCount, systemStatus }: SecurityDashboardProps) => {
  const [realTimeStats, setRealTimeStats] = useState({
    totalDetections: 0,
    authorizedAccess: 0,
    unauthorizedAttempts: 0,
    systemUptime: '0h 0m',
    averageResponseTime: '1.2s',
    securityLevel: 'Normal'
  });

  const { alerts, authorizedUsers, esp32Devices } = useSecuritySystem();
  
  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeStats(prev => ({
        ...prev,
        totalDetections: prev.totalDetections + Math.floor(Math.random() * 3),
        authorizedAccess: prev.authorizedAccess + (Math.random() > 0.7 ? 1 : 0),
        unauthorizedAttempts: prev.unauthorizedAttempts + (Math.random() > 0.9 ? 1 : 0),
        systemUptime: `${Math.floor(Date.now() / 3600000)}h ${Math.floor((Date.now() % 3600000) / 60000)}m`,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const devices = [
    { 
      name: "Face Recognition Camera", 
      status: "online", 
      type: "camera", 
      accuracy: 94,
      lastActivity: "2 min ago",
      location: "Main Entrance"
    },
    { 
      name: "Alert Receiver Mobile", 
      status: "online", 
      type: "phone", 
      alerts: alerts.length,
      lastActivity: "Active",
      location: "Security Office"
    },
    { 
      name: "ESP32 Security Module", 
      status: esp32Devices.length > 0 ? "online" : "offline", 
      type: "esp32", 
      uptime: realTimeStats.systemUptime,
      lastActivity: "1 min ago",
      location: "Hardware Station"
    },
  ];

  const recentAlerts = alerts.slice(0, 5).map(alert => ({
    time: new Date(alert.created_at).toLocaleTimeString(),
    type: alert.alert_type,
    severity: alert.severity,
    person: alert.detected_person || 'Unknown',
    confidence: alert.confidence_score || 0
  }));

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        
        {/* System Overview - Enhanced */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300 col-span-full">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Security Command Center</h3>
                  <p className="text-gray-600 text-sm">Real-time monitoring and threat detection</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className={`px-3 py-1 ${getSecurityLevelColor(realTimeStats.securityLevel)}`}>
                  {realTimeStats.securityLevel} Security Level
                </Badge>
                <Badge variant={systemStatus === "active" ? "default" : "destructive"}>
                  <Activity className="h-3 w-3 mr-1" />
                  {systemStatus === "active" ? "System Active" : "System Alert"}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-xl border border-blue-200/50">
                <div className="text-2xl font-bold text-blue-600">{realTimeStats.totalDetections}</div>
                <div className="text-sm text-gray-700 font-medium">Total Detections</div>
                <div className="text-xs text-gray-500 mt-1">Today</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm rounded-xl border border-green-200/50">
                <div className="text-2xl font-bold text-green-600">{realTimeStats.authorizedAccess}</div>
                <div className="text-sm text-gray-700 font-medium">Authorized Access</div>
                <div className="text-xs text-gray-500 mt-1">Success Rate: 94%</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-red-50/80 to-pink-50/80 backdrop-blur-sm rounded-xl border border-red-200/50">
                <div className="text-2xl font-bold text-red-600">{alertCount}</div>
                <div className="text-sm text-gray-700 font-medium">Security Alerts</div>
                <div className="text-xs text-gray-500 mt-1">High Priority: {Math.floor(alertCount * 0.3)}</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-purple-50/80 to-violet-50/80 backdrop-blur-sm rounded-xl border border-purple-200/50">
                <div className="text-2xl font-bold text-purple-600">{authorizedUsers.length}</div>
                <div className="text-sm text-gray-700 font-medium">Authorized Users</div>
                <div className="text-xs text-gray-500 mt-1">Active Database</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 backdrop-blur-sm rounded-xl border border-amber-200/50">
                <div className="text-2xl font-bold text-amber-600">{realTimeStats.averageResponseTime}</div>
                <div className="text-sm text-gray-700 font-medium">Response Time</div>
                <div className="text-xs text-gray-500 mt-1">Average Detection</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-teal-50/80 to-cyan-50/80 backdrop-blur-sm rounded-xl border border-teal-200/50">
                <div className="text-2xl font-bold text-teal-600">{realTimeStats.systemUptime}</div>
                <div className="text-sm text-gray-700 font-medium">System Uptime</div>
                <div className="text-xs text-gray-500 mt-1">Continuous Operation</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Device Status */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300 md:col-span-2">
          <CardHeader className="pb-4 bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl shadow-lg">
                <Wifi className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Connected Security Devices</h3>
                <p className="text-gray-600 text-sm">Real-time device monitoring and status</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {devices.map((device, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/80 to-blue-50/80 backdrop-blur-sm rounded-lg border border-gray-200/50 hover:from-gray-100/80 hover:to-blue-100/80 transition-all duration-300 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                    {device.type === "camera" ? (
                      <Camera className="h-5 w-5 text-blue-600" />
                    ) : device.type === "phone" ? (
                      <Smartphone className="h-5 w-5 text-green-600" />
                    ) : (
                      <Cpu className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{device.name}</div>
                    <div className="text-sm text-gray-600">
                      {device.accuracy && `Accuracy: ${device.accuracy}%`}
                      {device.alerts !== undefined && `Alerts Received: ${device.alerts}`}
                      {device.uptime && `Uptime: ${device.uptime}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      📍 {device.location} • Last: {device.lastActivity}
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Badge 
                    variant={device.status === "online" ? "default" : "destructive"}
                    className={device.status === "online" 
                      ? 'bg-emerald-600 text-white shadow-lg border-0' 
                      : 'bg-red-600 text-white shadow-lg border-0'
                    }
                  >
                    {device.status === "online" ? "🟢 Online" : "🔴 Offline"}
                  </Badge>
                  {device.type === "camera" && (
                    <div className="text-xs text-gray-500">
                      <Eye className="h-3 w-3 inline mr-1" />
                      Active Monitoring
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Quick Actions */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1 bg-white">
                  <Activity className="h-4 w-4 mr-2" />
                  System Health Check
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-white">
                  <Bell className="h-4 w-4 mr-2" />
                  Test All Alerts
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Recent Alerts */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-red-50/80 to-pink-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl shadow-lg">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Recent Security Events</h3>
                  <p className="text-gray-600 text-sm">Latest threat detections</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white">
                {recentAlerts.length} Events
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-6 max-h-96 overflow-y-auto">
            {recentAlerts.map((alert, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50/80 to-red-50/80 backdrop-blur-sm rounded-lg border border-gray-200/50 hover:from-gray-100/80 hover:to-red-100/80 transition-all duration-300 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-full shadow-sm border border-gray-200">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-mono text-gray-800 bg-gray-100/80 backdrop-blur-sm px-2 py-1 rounded">
                        {alert.time}
                      </span>
                      {alert.confidence > 0 && (
                        <span className="text-xs text-gray-600">
                          {alert.confidence}% confidence
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{alert.type}</div>
                    <div className="text-xs text-gray-600">
                      Person: {alert.person} • Source: Face Recognition
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={alert.severity === "high" ? "destructive" : alert.severity === "medium" ? "secondary" : "outline"}
                  className={
                    alert.severity === "high" 
                      ? 'bg-red-600 text-white shadow-lg border-0' 
                      : alert.severity === "medium"
                      ? 'bg-amber-500 text-white shadow-lg border-0'
                      : 'bg-gray-400 text-white shadow-lg border-0'
                  }
                >
                  {alert.severity.toUpperCase()}
                </Badge>
              </div>
            ))}
            
            {recentAlerts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="font-medium">All Clear</p>
                <p className="text-sm">No recent security events</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Performance Metrics */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300 lg:col-span-2">
          <CardHeader className="pb-4 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Performance Analytics</h3>
                <p className="text-gray-600 text-sm">System metrics and optimization data</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Detection Accuracy */}
              <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-2">94.2%</div>
                <div className="text-sm font-medium text-gray-900">Detection Accuracy</div>
                <div className="text-xs text-gray-600 mt-1">Last 24 hours</div>
                <div className="mt-3 bg-green-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '94.2%' }}></div>
                </div>
              </div>
              
              {/* Response Time */}
              <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600 mb-2">1.2s</div>
                <div className="text-sm font-medium text-gray-900">Avg Response Time</div>
                <div className="text-xs text-gray-600 mt-1">Detection to Alert</div>
                <div className="mt-3 bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              
              {/* System Load */}
              <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                <div className="text-3xl font-bold text-purple-600 mb-2">23%</div>
                <div className="text-sm font-medium text-gray-900">System Load</div>
                <div className="text-xs text-gray-600 mt-1">CPU & Memory Usage</div>
                <div className="mt-3 bg-purple-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '23%' }}></div>
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900">{realTimeStats.totalDetections}</div>
                  <div className="text-xs text-gray-600">Total Scans</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{realTimeStats.unauthorizedAttempts}</div>
                  <div className="text-xs text-gray-600">Threats Blocked</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">99.8%</div>
                  <div className="text-xs text-gray-600">Uptime</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">0</div>
                  <div className="text-xs text-gray-600">False Positives</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-gray-50/80 to-slate-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-gray-600 to-slate-600 rounded-xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
                <p className="text-gray-600 text-sm">System controls and settings</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            <Button variant="outline" className="w-full justify-start bg-white hover:bg-gray-50">
              <Camera className="h-4 w-4 mr-3" />
              Restart Face Recognition
            </Button>
            <Button variant="outline" className="w-full justify-start bg-white hover:bg-gray-50">
              <Bell className="h-4 w-4 mr-3" />
              Test All Alert Systems
            </Button>
            <Button variant="outline" className="w-full justify-start bg-white hover:bg-gray-50">
              <Cpu className="h-4 w-4 mr-3" />
              Check ESP32 Status
            </Button>
            <Button variant="outline" className="w-full justify-start bg-white hover:bg-gray-50">
              <Users className="h-4 w-4 mr-3" />
              Manage User Database
            </Button>
            <Button variant="outline" className="w-full justify-start bg-white hover:bg-gray-50">
              <Activity className="h-4 w-4 mr-3" />
              Export Security Logs
            </Button>
            <Button variant="outline" className="w-full justify-start bg-white hover:bg-gray-50">
              <Shield className="h-4 w-4 mr-3" />
              Security Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityDashboard;
