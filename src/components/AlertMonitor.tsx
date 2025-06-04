
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Smartphone, Server, Clock, AlertTriangle, CheckCircle, Volume2 } from "lucide-react";

const AlertMonitor = () => {
  const [serverStatus, setServerStatus] = useState("running");
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const alerts = [
    {
      id: 1,
      time: "14:32:15",
      type: "Unauthorized Access",
      source: "Mobile App 1",
      target: ["Mobile App 2", "ESP32"],
      severity: "high",
      status: "delivered",
      details: "Unknown face detected in main entrance"
    },
    {
      id: 2,
      time: "12:15:43",
      type: "Motion Detection",
      source: "ESP32 IR Sensor",
      target: ["Mobile App 2"],
      severity: "medium",
      status: "delivered",
      details: "Movement detected after hours"
    },
    {
      id: 3,
      time: "09:43:22",
      type: "System Test",
      source: "Mobile App 1",
      target: ["Mobile App 2", "ESP32"],
      severity: "low",
      status: "delivered",
      details: "Scheduled system functionality test"
    },
  ];

  const serverStats = {
    port: "8080",
    uptime: "2d 14h 32m",
    requests: 1247,
    errors: 2
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Server Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-green-400" />
              <span>HTTP Server</span>
            </div>
            <Badge variant={serverStatus === "running" ? "default" : "destructive"}>
              {serverStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Port</div>
              <div className="font-mono text-blue-400">{serverStats.port}</div>
            </div>
            <div>
              <div className="text-slate-400">Uptime</div>
              <div className="font-mono text-green-400">{serverStats.uptime}</div>
            </div>
            <div>
              <div className="text-slate-400">Requests</div>
              <div className="font-mono text-white">{serverStats.requests}</div>
            </div>
            <div>
              <div className="text-slate-400">Errors</div>
              <div className="font-mono text-red-400">{serverStats.errors}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              variant={alertsEnabled ? "destructive" : "default"}
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className="w-full"
            >
              {alertsEnabled ? "Disable Alerts" : "Enable Alerts"}
            </Button>
            <Button variant="outline" className="w-full">
              <Volume2 className="h-4 w-4 mr-2" />
              Test Alert Sound
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert Configuration */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Bell className="h-5 w-5 text-yellow-400" />
            <span>Alert Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Full-screen popup</span>
              <Badge variant="default">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Sound alerts</span>
              <Badge variant="default">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Vibration</span>
              <Badge variant="secondary">Disabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">Log export</span>
              <Badge variant="default">Auto</Badge>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700">
            <div className="text-sm text-slate-400 mb-2">Response Targets</div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-white">Mobile App 2</span>
                <Badge variant="default" className="ml-auto">Active</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Server className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-white">ESP32 Module</span>
                <Badge variant="default" className="ml-auto">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Alert Details */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span>Latest Alert</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts[0] && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="destructive">{alerts[0].severity.toUpperCase()}</Badge>
                <span className="text-sm text-slate-400">{alerts[0].time}</span>
              </div>
              <div>
                <div className="font-medium text-white">{alerts[0].type}</div>
                <div className="text-sm text-slate-400 mt-1">{alerts[0].details}</div>
              </div>
              <div className="text-sm">
                <div className="text-slate-400">Source:</div>
                <div className="text-white">{alerts[0].source}</div>
              </div>
              <div className="text-sm">
                <div className="text-slate-400">Targets:</div>
                <div className="text-white">{alerts[0].target.join(", ")}</div>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">Successfully delivered</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card className="bg-slate-800 border-slate-700 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-400" />
              <span>Alert History</span>
            </div>
            <Button variant="outline" size="sm">
              Export Logs
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-slate-400 font-mono">{alert.time}</div>
                  <div>
                    <div className="font-medium text-white">{alert.type}</div>
                    <div className="text-sm text-slate-400">{alert.details}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge 
                    variant={
                      alert.severity === "high" ? "destructive" :
                      alert.severity === "medium" ? "secondary" : "outline"
                    }
                  >
                    {alert.severity}
                  </Badge>
                  <Badge variant={alert.status === "delivered" ? "default" : "destructive"}>
                    {alert.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertMonitor;
