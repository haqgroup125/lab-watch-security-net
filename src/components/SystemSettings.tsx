
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, RotateCcw, TestTube } from "lucide-react";
import { useSecuritySystem, SystemSettings as SystemSettingsType } from "@/hooks/useSecuritySystem";
import { useToast } from "@/hooks/use-toast";

interface SystemSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const SystemSettings = ({ isOpen, onClose }: SystemSettingsProps) => {
  const { systemSettings, updateSystemSettings, testAllESP32Devices } = useSecuritySystem();
  const [localSettings, setLocalSettings] = useState<SystemSettingsType>(systemSettings);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSave = async () => {
    await updateSystemSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: SystemSettingsType = {
      detection_sensitivity: 75,
      alert_threshold: 65,
      auto_acknowledgment: false,
      notification_sounds: true,
      camera_resolution: '720p',
      detection_interval: 1000,
      max_detection_distance: 5,
      face_confidence_threshold: 70,
    };
    setLocalSettings(defaultSettings);
  };

  const handleTestDevices = async () => {
    setTesting(true);
    try {
      await testAllESP32Devices();
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">System Settings</h3>
                  <p className="text-gray-600 text-sm">Configure security system parameters</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Detection Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                🎯 Detection Settings
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sensitivity">Detection Sensitivity: {localSettings.detection_sensitivity}%</Label>
                  <Slider
                    id="sensitivity"
                    min={1}
                    max={100}
                    step={1}
                    value={[localSettings.detection_sensitivity]}
                    onValueChange={(value) => setLocalSettings(prev => ({ ...prev, detection_sensitivity: value[0] }))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confidence">Face Confidence Threshold: {localSettings.face_confidence_threshold}%</Label>
                  <Slider
                    id="confidence"
                    min={50}
                    max={95}
                    step={5}
                    value={[localSettings.face_confidence_threshold]}
                    onValueChange={(value) => setLocalSettings(prev => ({ ...prev, face_confidence_threshold: value[0] }))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alert-threshold">Alert Threshold: {localSettings.alert_threshold}%</Label>
                  <Slider
                    id="alert-threshold"
                    min={50}
                    max={90}
                    step={5}
                    value={[localSettings.alert_threshold]}
                    onValueChange={(value) => setLocalSettings(prev => ({ ...prev, alert_threshold: value[0] }))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="detection-interval">Detection Interval (ms)</Label>
                  <Input
                    id="detection-interval"
                    type="number"
                    min={500}
                    max={5000}
                    value={localSettings.detection_interval}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, detection_interval: parseInt(e.target.value) || 1000 }))}
                    className="bg-white border-gray-300"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Camera Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                📹 Camera Settings
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="resolution">Camera Resolution</Label>
                  <Select 
                    value={localSettings.camera_resolution} 
                    onValueChange={(value) => setLocalSettings(prev => ({ ...prev, camera_resolution: value }))}
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="480p">480p (640x480)</SelectItem>
                      <SelectItem value="720p">720p (1280x720)</SelectItem>
                      <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="distance">Max Detection Distance (meters)</Label>
                  <Input
                    id="distance"
                    type="number"
                    min={1}
                    max={10}
                    value={localSettings.max_detection_distance}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, max_detection_distance: parseInt(e.target.value) || 5 }))}
                    className="bg-white border-gray-300"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Alert Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                🚨 Alert Settings
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="auto-ack" className="font-medium">Auto Acknowledgment</Label>
                    <p className="text-xs text-gray-600">Automatically acknowledge low-priority alerts</p>
                  </div>
                  <Switch
                    id="auto-ack"
                    checked={localSettings.auto_acknowledgment}
                    onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, auto_acknowledgment: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="sounds" className="font-medium">Notification Sounds</Label>
                    <p className="text-xs text-gray-600">Play audio alerts for security events</p>
                  </div>
                  <Switch
                    id="sounds"
                    checked={localSettings.notification_sounds}
                    onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, notification_sounds: checked }))}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* System Test */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                🔧 System Testing
              </h4>
              
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">Test All ESP32 Devices</h5>
                    <p className="text-sm text-gray-600">Check connectivity to all registered ESP32 devices</p>
                  </div>
                  <Button
                    onClick={handleTestDevices}
                    disabled={testing}
                    variant="outline"
                    className="bg-white"
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    {testing ? "Testing..." : "Test Devices"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <Button
                onClick={handleReset}
                variant="outline"
                className="bg-white border-gray-300"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              
              <div className="space-x-2">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="bg-white border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemSettings;
