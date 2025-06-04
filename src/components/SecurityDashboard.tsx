
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* System Overview */}
      <Card className="bg-slate-800 border-slate-700 col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Shield className="h-5 w-5 text-blue-400" />
            <span>System Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">3/3</div>
              <div className="text-sm text-slate-400">Devices Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">94%</div>
              <div className="text-sm text-slate-400">Recognition Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{alertCount}</div>
              <div className="text-sm text-slate-400">Alerts Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">2.1s</div>
              <div className="text-sm text-slate-400">Avg Response Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Status */}
      <Card className="bg-slate-800 border-slate-700 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Wifi className="h-5 w-5 text-green-400" />
            <span>Device Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {devices.map((device, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center space-x-3">
                {device.type === "phone" ? (
                  <Smartphone className="h-5 w-5 text-blue-400" />
                ) : (
                  <Cpu className="h-5 w-5 text-purple-400" />
                )}
                <div>
                  <div className="font-medium text-white">{device.name}</div>
                  <div className="text-sm text-slate-400">
                    {device.accuracy && `Accuracy: ${device.accuracy}%`}
                    {device.alerts && `Alerts: ${device.alerts}`}
                    {device.uptime && `Uptime: ${device.uptime}`}
                  </div>
                </div>
              </div>
              <Badge variant={device.status === "online" ? "default" : "destructive"}>
                {device.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span>Recent Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentAlerts.map((alert, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-slate-700 rounded">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-white">{alert.time}</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-white">{alert.type}</div>
                <Badge 
                  variant={alert.severity === "high" ? "destructive" : alert.severity === "medium" ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {alert.severity}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;
