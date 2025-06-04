
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Users, Plus, Trash2, Eye, EyeOff, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const FaceRecognition = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(true);
  const [newUserName, setNewUserName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    authorizedUsers, 
    alerts, 
    loading, 
    addAuthorizedUser, 
    createAlert,
    sendAlertToESP32
  } = useSecuritySystem();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  const handleAddUser = async () => {
    if (!newUserName.trim() || !selectedFile) {
      return;
    }

    await addAuthorizedUser(newUserName, selectedFile);
    setNewUserName("");
    setSelectedFile(null);
    setShowAddDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const simulateUnauthorizedDetection = async () => {
    await createAlert({
      alert_type: "Unauthorized Face",
      severity: "high",
      details: "Unknown face detected in main entrance",
      detected_person: "Unknown",
      source_device: "Mobile App 1",
      confidence_score: 0
    });

    // Send alert to ESP32 (using example IP)
    await sendAlertToESP32("192.168.1.100", {
      type: "unauthorized_face",
      message: "Unknown face detected",
      timestamp: new Date().toISOString()
    });
  };

  // Get recent detections from alerts
  const recentDetections = alerts.slice(0, 3).map(alert => ({
    time: new Date(alert.created_at).toLocaleTimeString(),
    person: alert.detected_person || "Unknown",
    confidence: alert.confidence_score || 0,
    status: alert.detected_person && alert.detected_person !== "Unknown" ? "authorized" : "blocked"
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Camera Feed */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-blue-400" />
              <span>Live Camera Feed</span>
            </div>
            <Badge variant={recognitionActive ? "default" : "secondary"}>
              {recognitionActive ? "Active" : "Paused"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video bg-slate-700 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
            <div className="text-center z-10">
              <Camera className="h-16 w-16 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-400">Camera feed would appear here</p>
              <p className="text-xs text-slate-500 mt-1">ML Kit face detection active</p>
            </div>
            {recognitionActive && (
              <div className="absolute top-4 left-4">
                <div className="flex items-center space-x-2 bg-green-500/20 px-2 py-1 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-xs">DETECTING</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => setRecognitionActive(!recognitionActive)}
              variant={recognitionActive ? "destructive" : "default"}
              className="flex-1"
            >
              {recognitionActive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {recognitionActive ? "Pause Recognition" : "Start Recognition"}
            </Button>
            <Button variant="outline" onClick={() => setIsRecording(!isRecording)}>
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={simulateUnauthorizedDetection}
              variant="destructive"
              className="flex-1"
            >
              Simulate Unauthorized Detection
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Recognition Accuracy</div>
              <div className="text-xl font-bold text-green-400">94%</div>
              <Progress value={94} className="mt-1" />
            </div>
            <div>
              <div className="text-slate-400">Processing Speed</div>
              <div className="text-xl font-bold text-blue-400">15 FPS</div>
              <Progress value={75} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authorized Users */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-400" />
              <span>Authorized Users ({authorizedUsers.length})</span>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Authorized User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-white">Name</Label>
                    <Input
                      id="name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Enter user name"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="photo" className="text-white">Photo</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        ref={fileInputRef}
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      <Upload className="h-4 w-4 text-slate-400" />
                    </div>
                    {selectedFile && (
                      <p className="text-sm text-green-400 mt-1">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleAddUser} 
                    disabled={!newUserName.trim() || !selectedFile || loading}
                    className="w-full"
                  >
                    {loading ? "Adding..." : "Add User"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-80 overflow-y-auto">
          {authorizedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center space-x-3">
                {user.image_url ? (
                  <img 
                    src={user.image_url} 
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">{user.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <div className="font-medium text-white">{user.name}</div>
                  <div className="text-sm text-slate-400">
                    Added: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <Badge variant={user.is_active ? "default" : "secondary"}>
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          ))}
          {authorizedUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No authorized users yet</p>
              <p className="text-sm text-slate-500">Add users to enable face recognition</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Detections */}
      <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Eye className="h-5 w-5 text-yellow-400" />
            <span>Recent Detections</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentDetections.map((detection, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-slate-400">{detection.time}</div>
                  <div className="font-medium text-white">{detection.person}</div>
                  {detection.confidence > 0 && (
                    <div className="text-sm text-slate-400">Confidence: {detection.confidence}%</div>
                  )}
                </div>
                <Badge 
                  variant={detection.status === "authorized" ? "default" : "destructive"}
                >
                  {detection.status}
                </Badge>
              </div>
            ))}
            {recentDetections.length === 0 && (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">No recent detections</p>
                <p className="text-sm text-slate-500">Face detection results will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceRecognition;
