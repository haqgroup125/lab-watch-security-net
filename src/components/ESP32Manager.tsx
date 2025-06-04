
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Cpu, Wifi, Monitor, Volume2, Eye, Zap, Settings, TestTube } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ESP32Manager = () => {
  const [deviceIP, setDeviceIP] = useState("192.168.1.100");
  const [buzzerEnabled, setBuzzerEnabled] = useState(true);
  const [lcdEnabled, setLcdEnabled] = useState(true);
  const [irSensorEnabled, setIrSensorEnabled] = useState(true);

  const deviceStatus = {
    connected: true,
    uptime: "2d 14h 32m",
    freeHeap: "245KB",
    wifiSignal: -45,
    temperature: 42
  };

  const components = [
    { name: "LCD Display", status: "active", icon: Monitor, description: "16x2 Character Display" },
    { name: "Buzzer", status: "ready", icon: Volume2, description: "Active Alarm System" },
    { name: "IR Sensor", status: "monitoring", icon: Eye, description: "Motion Detection" },
    { name: "WiFi Module", status: "connected", icon: Wifi, description: "Network Communication" }
  ];

  const handleTestAlert = () => {
    // Simulate sending test alert to ESP32
    console.log("Sending test alert to ESP32...");
  };

  const handleReboot = () => {
    console.log("Rebooting ESP32 device...");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Device Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-purple-400" />
              <span>ESP32 Status</span>
            </div>
            <Badge variant={deviceStatus.connected ? "default" : "destructive"}>
              {deviceStatus.connected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400">IP Address</div>
              <div className="font-mono text-blue-400">{deviceIP}</div>
            </div>
            <div>
              <div className="text-slate-400">Uptime</div>
              <div className="font-mono text-green-400">{deviceStatus.uptime}</div>
            </div>
            <div>
              <div className="text-slate-400">Free Heap</div>
              <div className="font-mono text-white">{deviceStatus.freeHeap}</div>
            </div>
            <div>
              <div className="text-slate-400">Temperature</div>
              <div className="font-mono text-yellow-400">{deviceStatus.temperature}°C</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">WiFi Signal</span>
              <div className="flex items-center space-x-2">
                <div className="text-sm text-white">{deviceStatus.wifiSignal} dBm</div>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`w-1 h-3 rounded ${
                        deviceStatus.wifiSignal > -60 || bar <= 2 ? "bg-green-400" : "bg-slate-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={handleTestAlert} variant="outline" className="flex-1">
              <TestTube className="h-4 w-4 mr-2" />
              Test Alert
            </Button>
            <Button onClick={handleReboot} variant="destructive" className="flex-1">
              <Zap className="h-4 w-4 mr-2" />
              Reboot
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Component Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Settings className="h-5 w-5 text-green-400" />
            <span>Hardware Components</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {components.map((component, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <component.icon className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="font-medium text-white">{component.name}</div>
                  <div className="text-sm text-slate-400">{component.description}</div>
                </div>
              </div>
              <Badge variant={
                component.status === "active" ? "default" :
                component.status === "connected" ? "default" :
                component.status === "monitoring" ? "secondary" : "outline"
              }>
                {component.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Settings className="h-5 w-5 text-yellow-400" />
            <span>Device Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-ip" className="text-white">Device IP Address</Label>
            <Input
              id="device-ip"
              value={deviceIP}
              onChange={(e) => setDeviceIP(e.target.value)}
              placeholder="192.168.1.100"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">LCD Display</div>
                <div className="text-sm text-slate-400">Show alerts on display</div>
              </div>
              <Switch checked={lcdEnabled} onCheckedChange={setLcdEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Buzzer Alarm</div>
                <div className="text-sm text-slate-400">Audio alert on detection</div>
              </div>
              <Switch checked={buzzerEnabled} onCheckedChange={setBuzzerEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">IR Sensor</div>
                <div className="text-sm text-slate-400">Motion detection before alert</div>
              </div>
              <Switch checked={irSensorEnabled} onCheckedChange={setIrSensorEnabled} />
            </div>
          </div>

          <Button className="w-full" variant="outline">
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Endpoint Information */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Wifi className="h-5 w-5 text-blue-400" />
            <span>API Endpoints</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 bg-slate-700 rounded border-l-4 border-green-400">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-green-400">POST /alert</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="text-sm text-slate-400">Receive alerts from Mobile App 1</div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                http://{deviceIP}/alert
              </div>
            </div>

            <div className="p-3 bg-slate-700 rounded border-l-4 border-blue-400">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-blue-400">GET /status</span>
                <Badge variant="outline">Info</Badge>
              </div>
              <div className="text-sm text-slate-400">Device health check</div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                http://{deviceIP}/status
              </div>
            </div>

            <div className="p-3 bg-slate-700 rounded border-l-4 border-yellow-400">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-yellow-400">POST /config</span>
                <Badge variant="secondary">Config</Badge>
              </div>
              <div className="text-sm text-slate-400">Update device settings</div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                http://{deviceIP}/config
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ESP32Manager;
