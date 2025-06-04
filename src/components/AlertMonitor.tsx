import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Smartphone, Server, Clock, AlertTriangle, CheckCircle, Volume2 } from "lucide-react";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";
import { supabase } from "@/integrations/supabase/client";

const AlertMonitor = () => {
  const [serverStatus, setServerStatus] = useState("running");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const { alerts, fetchAlerts } = useSecuritySystem();

  useEffect(() => {
    // Set up real-time subscription for alerts
    const channel = supabase
      .channel('alert-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'security_alerts'
      }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  const serverStats = {
    port: "8080",
    uptime: "2d 14h 32m",
    requests: alerts.length,
    errors: alerts.filter(alert => alert.severity === 'high').length
  };

  const latestAlert = alerts[0];

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
              <div className="text-slate-400">Alerts</div>
              <div className="font-mono text-white">{serverStats.requests}</div>
            </div>
            <div>
              <div className="text-slate-400">High Priority</div>
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
          {latestAlert ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={latestAlert.severity === 'high' ? "destructive" : latestAlert.severity === 'medium' ? "secondary" : "outline"}>
                  {latestAlert.severity.toUpperCase()}
                </Badge>
                <span className="text-sm text-slate-400">
                  {new Date(latestAlert.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div>
                <div className="font-medium text-white">{latestAlert.alert_type}</div>
                <div className="text-sm text-slate-400 mt-1">{latestAlert.details}</div>
              </div>
              <div className="text-sm">
                <div className="text-slate-400">Source:</div>
                <div className="text-white">{latestAlert.source_device}</div>
              </div>
              <div className="text-sm">
                <div className="text-slate-400">Detected:</div>
                <div className="text-white">{latestAlert.detected_person || "Unknown"}</div>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">Alert logged</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No alerts yet</p>
              <p className="text-sm text-slate-500">Recent alerts will appear here</p>
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
              <span>Alert History ({alerts.length})</span>
            </div>
            <Button variant="outline" size="sm">
              Export Logs
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-slate-400 font-mono">
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                  <div>
                    <div className="font-medium text-white">{alert.alert_type}</div>
                    <div className="text-sm text-slate-400">{alert.details}</div>
                    <div className="text-sm text-slate-500">
                      Source: {alert.source_device} | Person: {alert.detected_person || "Unknown"}
                    </div>
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
                  <Badge variant="default">
                    logged
                  </Badge>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">No alerts logged yet</p>
                <p className="text-sm text-slate-500">Alert history will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertMonitor;
