
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Camera, Smartphone, Cpu, Users, Shield, AlertTriangle, Clock, Wifi } from "lucide-react";

interface SecurityDashboardProps {
  alertCount: number;
  systemStatus: string;
}

const SecurityDashboard = ({ alertCount, systemStatus }: SecurityDashboardProps) => {
  const devices = [
    { name: "Mobile App 1 (Recognition)", status: "online", type: "phone", accuracy: 94 },
    { name: "Mobile App 2 (Alert Receiver)", status: "online", type: "phone", alerts: 12 },
    { name: "ESP32 Module", status: "online", type: "esp32", uptime: "2d 14h" },
  ];

  const recentAlerts = [
    { time: "14:32", type: "Unauthorized Face", severity: "high" },
    { time: "12:15", type: "Motion Detected", severity: "medium" },
    { time: "09:43", type: "System Test", severity: "low" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* System Overview */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300 col-span-full">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">System Overview</h3>
                <p className="text-gray-600 text-sm">Real-time security monitoring status</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-r from-emerald-50/80 to-green-50/80 backdrop-blur-sm rounded-xl border border-emerald-200/50">
                <div className="text-2xl font-bold text-emerald-600">3/3</div>
                <div className="text-sm text-gray-700 font-medium">Devices Online</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-xl border border-blue-200/50">
                <div className="text-2xl font-bold text-blue-600">94%</div>
                <div className="text-sm text-gray-700 font-medium">Recognition Accuracy</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-red-50/80 to-pink-50/80 backdrop-blur-sm rounded-xl border border-red-200/50">
                <div className="text-2xl font-bold text-red-600">{alertCount}</div>
                <div className="text-sm text-gray-700 font-medium">Alerts Today</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 backdrop-blur-sm rounded-xl border border-amber-200/50">
                <div className="text-2xl font-bold text-amber-600">2.1s</div>
                <div className="text-sm text-gray-700 font-medium">Avg Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Status */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300 md:col-span-2">
          <CardHeader className="pb-4 bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl shadow-lg">
                <Wifi className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Device Status</h3>
                <p className="text-gray-600 text-sm">Connected security devices</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {devices.map((device, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/80 to-blue-50/80 backdrop-blur-sm rounded-lg border border-gray-200/50 hover:from-gray-100/80 hover:to-blue-100/80 transition-all duration-300 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {device.type === "phone" ? (
                      <Smartphone className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Cpu className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{device.name}</div>
                    <div className="text-sm text-gray-600">
                      {device.accuracy && `Accuracy: ${device.accuracy}%`}
                      {device.alerts && `Alerts: ${device.alerts}`}
                      {device.uptime && `Uptime: ${device.uptime}`}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={device.status === "online" ? "default" : "destructive"}
                  className={device.status === "online" 
                    ? 'bg-emerald-600 text-white shadow-lg border-0' 
                    : 'bg-red-600 text-white shadow-lg border-0'
                  }
                >
                  {device.status === "online" ? "🟢 Online" : "🔴 Offline"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-red-50/80 to-pink-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl shadow-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Recent Alerts</h3>
                <p className="text-gray-600 text-sm">Latest security events</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            {recentAlerts.map((alert, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50/80 to-red-50/80 backdrop-blur-sm rounded-lg border border-gray-200/50 hover:from-gray-100/80 hover:to-red-100/80 transition-all duration-300 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-1 bg-white rounded shadow-sm">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <span className="text-sm font-mono text-gray-800 bg-gray-100/80 backdrop-blur-sm px-2 py-1 rounded">{alert.time}</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">{alert.type}</div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityDashboard;
