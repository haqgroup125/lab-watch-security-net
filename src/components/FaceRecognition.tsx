
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Users, Plus, Eye, EyeOff, Upload, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const FaceRecognition = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionInProgress, setDetectionInProgress] = useState(false);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    authorizedUsers, 
    alerts, 
    loading, 
    addAuthorizedUser, 
    createAlert,
    sendAlertToESP32,
    sendAlertToReceivers
  } = useSecuritySystem();

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setRecognitionActive(true);
        startFaceDetection();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Unable to access camera. Please ensure camera permissions are granted.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setRecognitionActive(false);
    stopFaceDetection();
  };

  // Start face detection
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(() => {
      if (recognitionActive && videoRef.current && canvasRef.current) {
        detectFace();
      }
    }, 2000); // Check every 2 seconds
  };

  // Stop face detection
  const stopFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  // Simulate face detection (in real implementation, this would use ML libraries like face-api.js)
  const detectFace = async () => {
    if (detectionInProgress || !videoRef.current || !canvasRef.current) return;
    
    setDetectionInProgress(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0);
      
      // Simulate face detection with random results for demo
      // In real implementation, you would use face-api.js or similar
      const faceDetected = Math.random() > 0.7; // 30% chance of detecting a face
      
      if (faceDetected) {
        // Simulate checking against authorized users
        const isAuthorized = authorizedUsers.length > 0 && Math.random() > 0.4; // 60% chance authorized if users exist
        const detectedPerson = isAuthorized 
          ? authorizedUsers[Math.floor(Math.random() * authorizedUsers.length)].name
          : "Unknown Person";
        
        const confidence = isAuthorized 
          ? Math.floor(Math.random() * 20) + 80 // 80-100% for authorized
          : Math.floor(Math.random() * 40) + 10; // 10-50% for unauthorized
        
        setLastDetection(`${detectedPerson} (${confidence}%)`);
        
        // Create alert based on detection
        const alertData = {
          alert_type: isAuthorized ? "Authorized Access" : "Unauthorized Face Detected",
          severity: isAuthorized ? "low" as const : "high" as const,
          details: isAuthorized 
            ? `Access granted to ${detectedPerson} - confidence: ${confidence}%`
            : `Unknown face detected at main entrance - confidence: ${confidence}% - immediate attention required`,
          detected_person: detectedPerson,
          source_device: "Main Camera - Face Recognition System",
          confidence_score: confidence
        };

        await createAlert(alertData);

        // If unauthorized, send alerts to devices
        if (!isAuthorized) {
          await sendAlertToESP32("192.168.1.100", {
            type: "unauthorized_face",
            message: "Unknown face detected",
            timestamp: new Date().toISOString(),
            severity: "high",
            confidence: confidence
          });

          await sendAlertToReceivers({
            type: "Unauthorized Face Detected",
            severity: "high",
            message: "Unknown face detected at main entrance",
            timestamp: new Date().toISOString(),
            confidence: confidence
          });
        }

        // Draw detection box on canvas (simulated)
        ctx.strokeStyle = isAuthorized ? '#10B981' : '#EF4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          canvas.width * 0.25, 
          canvas.height * 0.2, 
          canvas.width * 0.5, 
          canvas.height * 0.6
        );
        
        // Add label
        ctx.fillStyle = isAuthorized ? '#10B981' : '#EF4444';
        ctx.fillRect(canvas.width * 0.25, canvas.height * 0.15, canvas.width * 0.5, 30);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(
          `${detectedPerson} (${confidence}%)`, 
          canvas.width * 0.25 + 10, 
          canvas.height * 0.15 + 20
        );
      }
    } catch (error) {
      console.error('Error in face detection:', error);
    } finally {
      setDetectionInProgress(false);
    }
  };

  // Handle file selection for adding users
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  // Handle adding new authorized user
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Get recent detections from alerts
  const recentDetections = alerts.slice(0, 5).map(alert => ({
    time: new Date(alert.created_at).toLocaleTimeString(),
    person: alert.detected_person || "Unknown",
    confidence: alert.confidence_score || 0,
    status: alert.detected_person && alert.detected_person !== "Unknown Person" ? "authorized" : "blocked",
    type: alert.alert_type
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Real Camera Feed */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-blue-400" />
              <span>Live Camera Feed</span>
            </div>
            <Badge variant={recognitionActive ? "default" : "secondary"}>
              {recognitionActive ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video bg-slate-700 rounded-lg relative overflow-hidden">
            {/* Video element for camera feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ display: recognitionActive ? 'block' : 'none' }}
            />
            
            {/* Canvas for face detection overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ display: recognitionActive ? 'block' : 'none' }}
            />
            
            {/* Placeholder when camera is off */}
            {!recognitionActive && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-400">Camera is off</p>
                  <p className="text-xs text-slate-500 mt-1">Click "Start Camera" to begin detection</p>
                </div>
              </div>
            )}
            
            {/* Detection status overlay */}
            {recognitionActive && (
              <div className="absolute top-4 left-4">
                <div className="flex items-center space-x-2 bg-green-500/20 px-2 py-1 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-xs">DETECTING</span>
                </div>
              </div>
            )}
            
            {/* Last detection info */}
            {lastDetection && recognitionActive && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/70 text-white px-3 py-2 rounded text-sm">
                  Last Detection: {lastDetection}
                </div>
              </div>
            )}
          </div>
          
          {/* Camera error alert */}
          {cameraError && (
            <Alert className="border-red-500">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {cameraError}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Camera controls */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={recognitionActive ? stopCamera : startCamera}
              variant={recognitionActive ? "destructive" : "default"}
            >
              {recognitionActive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {recognitionActive ? "Stop Camera" : "Start Camera"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsRecording(!isRecording)}
              disabled={!recognitionActive}
            >
              {isRecording ? "Stop Rec" : "Start Rec"}
            </Button>
          </div>

          {/* System statistics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Authorized Users</div>
              <div className="text-xl font-bold text-green-400">{authorizedUsers.length}</div>
            </div>
            <div>
              <div className="text-slate-400">Total Alerts</div>
              <div className="text-xl font-bold text-red-400">{alerts.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authorized Users Management */}
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
                    <Label htmlFor="name" className="text-white">Full Name *</Label>
                    <Input
                      id="name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Enter user's full name"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="photo" className="text-white">Photo *</Label>
                    <div className="space-y-2">
                      <Input
                        ref={fileInputRef}
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      {selectedFile && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Upload className="h-4 w-4 text-green-400" />
                          <span className="text-green-400">
                            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddUser} 
                    disabled={!newUserName.trim() || !selectedFile || loading}
                    className="w-full"
                  >
                    {loading ? "Adding User..." : "Add Authorized User"}
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
                    className="w-12 h-12 rounded-full object-cover border-2 border-green-500"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-lg">{user.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <div className="font-medium text-white">{user.name}</div>
                  <div className="text-sm text-slate-400">
                    Added: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Badge variant={user.is_active ? "default" : "secondary"}>
                {user.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          ))}
          {authorizedUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No authorized users yet</p>
              <p className="text-sm text-slate-500">Add users to train the face recognition system</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Detection Log */}
      <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Eye className="h-5 w-5 text-yellow-400" />
            <span>Real-time Detection Log</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentDetections.map((detection, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-slate-400 font-mono">{detection.time}</div>
                  <div>
                    <div className="font-medium text-white">{detection.person}</div>
                    <div className="text-sm text-slate-500">{detection.type}</div>
                  </div>
                  {detection.confidence > 0 && (
                    <div className="text-sm text-slate-400">
                      Confidence: {detection.confidence}%
                    </div>
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
                <p className="text-slate-400">No detections yet</p>
                <p className="text-sm text-slate-500">Start camera to begin real-time face detection</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceRecognition;
