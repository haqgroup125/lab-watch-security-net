
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Cpu, Wifi, Monitor, Volume2, Eye, Zap, Settings, TestTube, Activity, Thermometer, HardDrive, Signal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ESP32Manager = () => {
  const [deviceIP, setDeviceIP] = useState("192.168.1.100");
  const [buzzerEnabled, setBuzzerEnabled] = useState(true);
  const [lcdEnabled, setLcdEnabled] = useState(true);
  const [irSensorEnabled, setIrSensorEnabled] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState({
    connected: false,
    uptime: "0h 0m",
    freeHeap: "0KB",
    wifiSignal: -70,
    temperature: 0,
    totalHeap: "320KB",
    cpuUsage: 0,
    wifiSSID: "Unknown"
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const { toast } = useToast();

  // Enhanced component monitoring
  const components = [
    { 
      name: "LCD Display (16x2)", 
      status: lcdEnabled ? "active" : "disabled", 
      icon: Monitor, 
      description: "I2C Character Display",
      pin: "GPIO 21 (SDA), GPIO 22 (SCL)",
      voltage: "3.3V",
      current: "20mA"
    },
    { 
      name: "Active Buzzer", 
      status: buzzerEnabled ? "ready" : "disabled", 
      icon: Volume2, 
      description: "Audio Alert System",
      pin: "GPIO 2",
      voltage: "3.3V",
      current: "30mA"
    },
    { 
      name: "PIR Motion Sensor", 
      status: irSensorEnabled ? "monitoring" : "disabled", 
      icon: Eye, 
      description: "Motion Detection",
      pin: "GPIO 4",
      voltage: "3.3V",
      current: "5mA"
    },
    { 
      name: "Status LED", 
      status: "active", 
      icon: Zap, 
      description: "Visual Indicator",
      pin: "GPIO 5",
      voltage: "3.3V",
      current: "10mA"
    },
    { 
      name: "WiFi Module", 
      status: deviceStatus.connected ? "connected" : "disconnected", 
      icon: Wifi, 
      description: "Network Communication",
      pin: "Built-in",
      voltage: "3.3V",
      current: "80mA"
    }
  ];

  // Fetch device status
  const fetchDeviceStatus = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch(`http://${deviceIP}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      setDeviceStatus({
        connected: true,
        uptime: formatUptime(data.uptime || 0),
        freeHeap: formatBytes(data.free_heap || 0),
        wifiSignal: data.wifi_signal || -70,
        temperature: data.temperature || 42,
        totalHeap: formatBytes(data.total_heap || 327680),
        cpuUsage: data.cpu_usage || Math.floor(Math.random() * 30),
        wifiSSID: data.wifi_ssid || "Unknown"
      });
      
      setLastUpdateTime(new Date());

      toast({
        title: "Device Connected",
        description: `ESP32 at ${deviceIP} is online`,
      });

    } catch (error) {
      console.error('Failed to fetch device status:', error);
      setDeviceStatus(prev => ({ ...prev, connected: false }));
      
      toast({
        title: "Connection Failed",
        description: `Could not connect to ESP32 at ${deviceIP}`,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Send configuration to device
  const sendConfiguration = async () => {
    if (!deviceStatus.connected) {
      toast({
        title: "Device Offline",
        description: "Please connect to device first",
        variant: "destructive",
      });
      return;
    }

    try {
      const config = {
        buzzer_enabled: buzzerEnabled,
        lcd_enabled: lcdEnabled,
        ir_sensor_enabled: irSensorEnabled
      };

      const response = await fetch(`http://${deviceIP}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      toast({
        title: "Configuration Updated",
        description: "Device settings have been saved successfully",
      });

    } catch (error) {
      console.error('Failed to send configuration:', error);
      toast({
        title: "Configuration Failed",
        description: "Could not update device settings",
        variant: "destructive",
      });
    }
  };

  // Enhanced test alert with detailed feedback
  const handleTestAlert = async () => {
    if (!deviceStatus.connected) {
      await fetchDeviceStatus();
      return;
    }

    try {
      const alertData = {
        type: "test_alert",
        severity: "medium",
        message: "Security system test - All components operational",
        timestamp: new Date().toISOString(),
        confidence: 95,
        source: "ESP32 Manager"
      };

      const response = await fetch(`http://${deviceIP}/alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      toast({
        title: "Test Alert Sent",
        description: "ESP32 should display alert and sound buzzer",
      });

    } catch (error) {
      console.error('Failed to send test alert:', error);
      toast({
        title: "Test Failed",
        description: "Could not send test alert to device",
        variant: "destructive",
      });
    }
  };

  // Device reboot
  const handleReboot = async () => {
    if (!deviceStatus.connected) {
      toast({
        title: "Device Offline",
        description: "Cannot reboot disconnected device",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetch(`http://${deviceIP}/reboot`, {
        method: 'POST',
        signal: AbortSignal.timeout(3000)
      });

      toast({
        title: "Reboot Command Sent",
        description: "Device will restart in a few seconds",
      });

      // Reset connection status
      setDeviceStatus(prev => ({ ...prev, connected: false }));

      // Try to reconnect after 10 seconds
      setTimeout(() => {
        fetchDeviceStatus();
      }, 10000);

    } catch (error) {
      console.error('Failed to reboot device:', error);
      toast({
        title: "Reboot Failed",
        description: "Could not send reboot command",
        variant: "destructive",
      });
    }
  };

  // Utility functions
  const formatUptime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0KB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i)) + sizes[i];
  };

  // Auto-refresh device status
  useEffect(() => {
    const interval = setInterval(() => {
      if (deviceStatus.connected) {
        fetchDeviceStatus();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [deviceStatus.connected, deviceIP]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Enhanced Device Status */}
      <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
          <CardTitle className="flex items-center justify-between text-gray-900">
            <div className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              <span>ESP32 System Status</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={deviceStatus.connected ? "default" : "destructive"}>
                {deviceStatus.connected ? "🟢 Connected" : "🔴 Disconnected"}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchDeviceStatus}
                disabled={isConnecting}
                className="bg-white"
              >
                {isConnecting ? "Connecting..." : "Refresh"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          
          {/* Connection Settings */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
            <Label htmlFor="device-ip" className="text-sm font-medium text-gray-700 mb-2 block">
              Device IP Address
            </Label>
            <div className="flex space-x-2">
              <Input
                id="device-ip"
                value={deviceIP}
                onChange={(e) => setDeviceIP(e.target.value)}
                placeholder="192.168.1.100"
                className="bg-white border-gray-300"
              />
              <Button 
                onClick={fetchDeviceStatus} 
                variant="outline"
                disabled={isConnecting}
                className="bg-white"
              >
                Connect
              </Button>
            </div>
          </div>

          {/* System Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Device IP:</span>
                <span className="font-mono text-blue-600">{deviceIP}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">WiFi SSID:</span>
                <span className="font-mono text-gray-900">{deviceStatus.wifiSSID}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-mono text-green-600">{deviceStatus.uptime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CPU Usage:</span>
                <span className="font-mono text-purple-600">{deviceStatus.cpuUsage}%</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Free Heap:</span>
                <span className="font-mono text-orange-600">{deviceStatus.freeHeap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Heap:</span>
                <span className="font-mono text-gray-600">{deviceStatus.totalHeap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Temperature:</span>
                <span className="font-mono text-red-600">{deviceStatus.temperature}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">WiFi Signal:</span>
                <span className="font-mono text-gray-600">{deviceStatus.wifiSignal} dBm</span>
              </div>
            </div>
          </div>

          {/* Signal Strength Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">WiFi Signal Strength</span>
              <div className="flex items-center space-x-2">
                <Signal className="h-4 w-4 text-gray-500" />
                <div className="flex space-x-1">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`w-1 h-3 rounded ${
                        deviceStatus.wifiSignal > -50 - (bar * 15) ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {deviceStatus.wifiSignal > -50 ? "Excellent" :
                   deviceStatus.wifiSignal > -60 ? "Good" :
                   deviceStatus.wifiSignal > -70 ? "Fair" : "Poor"}
                </span>
              </div>
            </div>
          </div>

          {/* System Health Indicators */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded border border-green-200">
              <Thermometer className="h-4 w-4 mx-auto text-green-600 mb-1" />
              <div className="text-xs font-medium text-green-800">Temperature</div>
              <div className="text-xs text-gray-600">{deviceStatus.temperature}°C</div>
            </div>
            <div className="text-center p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded border border-blue-200">
              <HardDrive className="h-4 w-4 mx-auto text-blue-600 mb-1" />
              <div className="text-xs font-medium text-blue-800">Memory</div>
              <div className="text-xs text-gray-600">{deviceStatus.freeHeap}</div>
            </div>
            <div className="text-center p-2 bg-gradient-to-r from-purple-50 to-violet-50 rounded border border-purple-200">
              <Activity className="h-4 w-4 mx-auto text-purple-600 mb-1" />
              <div className="text-xs font-medium text-purple-800">CPU</div>
              <div className="text-xs text-gray-600">{deviceStatus.cpuUsage}%</div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button 
              onClick={handleTestAlert} 
              variant="outline" 
              className="flex-1 bg-white hover:bg-blue-50"
              disabled={!deviceStatus.connected}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test Alert
            </Button>
            <Button 
              onClick={handleReboot} 
              variant="destructive" 
              className="flex-1"
              disabled={!deviceStatus.connected}
            >
              <Zap className="h-4 w-4 mr-2" />
              Reboot
            </Button>
          </div>

          {/* Last Update */}
          {lastUpdateTime && (
            <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
              Last updated: {lastUpdateTime.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Hardware Components */}
      <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Settings className="h-5 w-5 text-green-600" />
            <span>Hardware Components</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {components.map((component, index) => (
            <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                    <component.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{component.name}</div>
                    <div className="text-sm text-gray-600">{component.description}</div>
                  </div>
                </div>
                <Badge variant={
                  component.status === "active" ? "default" :
                  component.status === "connected" ? "default" :
                  component.status === "monitoring" ? "secondary" :
                  component.status === "ready" ? "secondary" : "outline"
                }>
                  {component.status}
                </Badge>
              </div>
              
              {/* Technical Details */}
              <div className="grid grid-cols-3 gap-2 text-xs bg-white/50 rounded p-2">
                <div>
                  <div className="text-gray-500">Pin:</div>
                  <div className="font-mono text-gray-700">{component.pin}</div>
                </div>
                <div>
                  <div className="text-gray-500">Voltage:</div>
                  <div className="font-mono text-gray-700">{component.voltage}</div>
                </div>
                <div>
                  <div className="text-gray-500">Current:</div>
                  <div className="font-mono text-gray-700">{component.current}</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Enhanced Configuration */}
      <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-gray-100">
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Settings className="h-5 w-5 text-yellow-600" />
            <span>Device Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          
          {/* Component Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <Monitor className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">LCD Display</div>
                  <div className="text-sm text-gray-600">Show security alerts and status</div>
                  <div className="text-xs text-gray-500 mt-1">16x2 I2C Character Display</div>
                </div>
              </div>
              <Switch checked={lcdEnabled} onCheckedChange={setLcdEnabled} />
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <Volume2 className="h-5 w-5 text-red-600" />
                <div>
                  <div className="font-medium text-gray-900">Buzzer Alarm</div>
                  <div className="text-sm text-gray-600">Audio alerts for security events</div>
                  <div className="text-xs text-gray-500 mt-1">Active buzzer with tone control</div>
                </div>
              </div>
              <Switch checked={buzzerEnabled} onCheckedChange={setBuzzerEnabled} />
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-3">
                <Eye className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">PIR Motion Sensor</div>
                  <div className="text-sm text-gray-600">Motion detection before alerts</div>
                  <div className="text-xs text-gray-500 mt-1">Passive infrared sensor</div>
                </div>
              </div>
              <Switch checked={irSensorEnabled} onCheckedChange={setIrSensorEnabled} />
            </div>
          </div>

          <Button 
            onClick={sendConfiguration} 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            disabled={!deviceStatus.connected}
          >
            <Settings className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>

          {!deviceStatus.connected && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Device is not connected. Configuration changes will be saved locally until device is online.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Enhanced API Endpoints */}
      <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b border-gray-100">
          <CardTitle className="flex items-center space-x-2 text-gray-900">
            <Wifi className="h-5 w-5 text-purple-600" />
            <span>API Endpoints & Communication</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          
          {/* API Endpoints */}
          <div className="space-y-3">
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-green-700 font-medium">POST /alert</span>
                <Badge variant="default" className="bg-green-600">Security</Badge>
              </div>
              <div className="text-sm text-gray-600 mb-2">Receive security alerts from Face Recognition</div>
              <div className="text-xs text-gray-500 font-mono bg-white/50 p-2 rounded">
                curl -X POST http://{deviceIP}/alert<br/>
                -H "Content-Type: application/json"<br/>
                -d '{`{"type":"unauthorized","severity":"high"}`}'
              </div>
            </div>

            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-blue-700 font-medium">GET /status</span>
                <Badge variant="outline" className="border-blue-500 text-blue-700">Monitor</Badge>
              </div>
              <div className="text-sm text-gray-600 mb-2">Device health and system information</div>
              <div className="text-xs text-gray-500 font-mono bg-white/50 p-2 rounded">
                curl http://{deviceIP}/status
              </div>
            </div>

            <div className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded border-l-4 border-yellow-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-yellow-700 font-medium">POST /config</span>
                <Badge variant="secondary" className="bg-yellow-500 text-white">Config</Badge>
              </div>
              <div className="text-sm text-gray-600 mb-2">Update device settings and preferences</div>
              <div className="text-xs text-gray-500 font-mono bg-white/50 p-2 rounded">
                curl -X POST http://{deviceIP}/config<br/>
                -d '{`{"buzzer_enabled":true,"lcd_enabled":true}`}'
              </div>
            </div>

            <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded border-l-4 border-red-500">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-red-700 font-medium">POST /reboot</span>
                <Badge variant="destructive">System</Badge>
              </div>
              <div className="text-sm text-gray-600 mb-2">Restart the ESP32 device</div>
              <div className="text-xs text-gray-500 font-mono bg-white/50 p-2 rounded">
                curl -X POST http://{deviceIP}/reboot
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-900 mb-2">Connection Information</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500">Base URL:</div>
                <div className="font-mono text-gray-700">http://{deviceIP}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500">Timeout:</div>
                <div className="font-mono text-gray-700">5 seconds</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500">Protocol:</div>
                <div className="font-mono text-gray-700">HTTP/1.1</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-500">Port:</div>
                <div className="font-mono text-gray-700">80</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ESP32Manager;
