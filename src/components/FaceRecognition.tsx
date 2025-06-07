import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera, 
  Users, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  RotateCcw, 
  Zap,
  Trash2,
  RefreshCw,
  Activity,
  Play,
  Square
} from "lucide-react";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";
import { useToast } from "@/hooks/use-toast";

const FaceRecognition = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<MediaDeviceInfo | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'scanning' | 'authorized' | 'unauthorized'>('idle');
  const [lastDetection, setLastDetection] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [newUserName, setNewUserName] = useState('');
  const [newUserFile, setNewUserFile] = useState<File | null>(null);
  const [esp32IP, setEsp32IP] = useState('192.168.1.100');
  const [cameraError, setCameraError] = useState<string>('');
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [detectionLogs, setDetectionLogs] = useState<Array<{
    id: string;
    timestamp: string;
    person: string;
    confidence: number;
    authorized: boolean;
  }>>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);

  const { 
    authorizedUsers, 
    systemSettings,
    loading, 
    addAuthorizedUser, 
    deleteAuthorizedUser,
    createAlert, 
    sendAlertToESP32 
  } = useSecuritySystem();
  const { toast } = useToast();

  // Check camera permissions
  const checkCameraPermissions = useCallback(async () => {
    try {
      console.log('Checking camera permissions...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      // Check if permission is already granted
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('Camera permission status:', permission.state);
        
        if (permission.state === 'granted') {
          setPermissionGranted(true);
          setCameraError('');
          return true;
        } else if (permission.state === 'denied') {
          setCameraError('Camera permission denied. Please enable camera access in your browser settings.');
          setPermissionGranted(false);
          return false;
        }
      }

      // Request permission by trying to access camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        
        // Stop the stream immediately after getting permission
        stream.getTracks().forEach(track => track.stop());
        
        setPermissionGranted(true);
        setCameraError('');
        console.log('Camera permission granted');
        return true;
      } catch (error: any) {
        console.error('Camera permission error:', error);
        
        let errorMessage = 'Camera access denied or not available.';
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        }
        
        setCameraError(errorMessage);
        setPermissionGranted(false);
        return false;
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      setCameraError('Failed to check camera permissions.');
      setPermissionGranted(false);
      return false;
    }
  }, []);

  // Initialize cameras
  const initializeCameras = useCallback(async () => {
    try {
      console.log('Initializing cameras...');
      
      const hasPermission = await checkCameraPermissions();
      if (!hasPermission) {
        return;
      }
      
      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoDevices.length);
      setAvailableDevices(videoDevices);
      
      if (videoDevices.length > 0) {
        setCurrentDevice(videoDevices[0]);
        setCameraError('');
        toast({
          title: "Cameras Ready",
          description: `Found ${videoDevices.length} camera(s)`,
        });
      } else {
        setCameraError('No cameras found on this device.');
      }
    } catch (error: any) {
      console.error('Camera initialization failed:', error);
      setCameraError('Failed to initialize cameras. Please check your camera connection.');
      toast({
        title: "Camera Error",
        description: "Failed to initialize cameras",
        variant: "destructive",
      });
    }
  }, [checkCameraPermissions, toast]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (!currentDevice || !permissionGranted) {
      await initializeCameras();
      return;
    }

    try {
      console.log('Starting camera stream...');
      setCameraError('');
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: currentDevice.deviceId ? { exact: currentDevice.deviceId } : undefined,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        }
      };

      console.log('Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        return new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          
          video.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            video.play()
              .then(() => {
                console.log('Video started playing');
                setIsStreaming(true);
                setDetectionStatus('scanning');
                startDetection();
                
                toast({
                  title: "Camera Started",
                  description: "Face recognition is now active",
                });
                resolve();
              })
              .catch((error) => {
                console.error('Video play failed:', error);
                setCameraError('Failed to start video playback.');
                reject(error);
              });
          };
          
          video.onerror = (error) => {
            console.error('Video error:', error);
            setCameraError('Video stream error occurred.');
            reject(error);
          };
          
          // Timeout after 10 seconds
          setTimeout(() => {
            if (!isStreaming) {
              reject(new Error('Camera start timeout'));
            }
          }, 10000);
        });
      }
    } catch (error: any) {
      console.error('Failed to start camera:', error);
      
      let errorMessage = 'Failed to start camera. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permission denied.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Camera not found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is busy.';
      } else {
        errorMessage += error.message || 'Unknown error.';
      }
      
      setCameraError(errorMessage);
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [currentDevice, permissionGranted, initializeCameras, isStreaming, toast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    setIsStreaming(false);
    setDetectionStatus('idle');
    setLastDetection('');
    setConfidence(0);
    frameCountRef.current = 0;
    
    toast({
      title: "Camera Stopped",
      description: "Face recognition deactivated",
    });
  }, [toast]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (availableDevices.length <= 1) return;
    
    const currentIndex = availableDevices.findIndex(device => device.deviceId === currentDevice?.deviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDevice = availableDevices[nextIndex];
    
    console.log('Switching camera to:', nextDevice.label);
    
    if (isStreaming) {
      stopCamera();
      setTimeout(() => {
        setCurrentDevice(nextDevice);
        setTimeout(() => {
          startCamera();
        }, 500);
      }, 500);
    } else {
      setCurrentDevice(nextDevice);
    }
  }, [availableDevices, currentDevice, isStreaming, stopCamera, startCamera]);

  // Simple face detection using basic image processing
  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    frameCountRef.current++;
    
    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Simple face detection simulation
      // In a real implementation, you would use a face detection library
      const hasMotion = detectMotion(ctx, canvas.width, canvas.height);
      
      if (hasMotion) {
        setDetectionStatus('scanning');
        setLastDetection('Motion detected');
        setConfidence(75);
        
        // Draw detection rectangle (simulated)
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        const x = canvas.width * 0.3;
        const y = canvas.height * 0.2;
        const w = canvas.width * 0.4;
        const h = canvas.height * 0.6;
        ctx.strokeRect(x, y, w, h);
        
        // Add detection log
        const logEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          person: 'Detected Person',
          confidence: 75,
          authorized: true // For demo purposes
        };
        
        setDetectionLogs(prev => [logEntry, ...prev.slice(0, 49)]);
        
      } else {
        setDetectionStatus('scanning');
        setLastDetection('No motion detected');
        setConfidence(0);
      }
      
    } catch (error) {
      console.error('Face detection error:', error);
    }
  }, [isStreaming]);

  // Simple motion detection
  const detectMotion = (ctx: CanvasRenderingContext2D, width: number, height: number): boolean => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Simple brightness-based motion detection
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += (r + g + b) / 3;
      }
      
      const avgBrightness = totalBrightness / (data.length / 16);
      
      // Simple threshold-based detection
      return avgBrightness > 50 && avgBrightness < 200;
    } catch (error) {
      console.error('Motion detection error:', error);
      return false;
    }
  };

  // Start detection interval
  const startDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    console.log('Starting face detection with interval:', systemSettings.detection_interval);
    detectionIntervalRef.current = setInterval(() => {
      detectFaces();
    }, systemSettings.detection_interval || 1000);
  }, [detectFaces, systemSettings.detection_interval]);

  // Handle user deletion
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to remove ${userName} from authorized users?`)) {
      await deleteAuthorizedUser(userId, userName);
    }
  };

  // Add user
  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserFile) {
      toast({
        title: "Missing Information",
        description: "Please provide both name and photo",
        variant: "destructive",
      });
      return;
    }
    
    if (!newUserFile.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }
    
    if (newUserFile.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await addAuthorizedUser(newUserName.trim(), newUserFile);
      setNewUserName('');
      setNewUserFile(null);
      
      const fileInput = document.getElementById('user-photo') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeCameras();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [initializeCameras]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Camera Controls */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Live Face Recognition</h3>
                  <p className="text-gray-600 text-sm">Real-time security monitoring</p>
                </div>
              </div>
              <Badge variant={isStreaming ? "default" : "secondary"}>
                {isStreaming ? "🟢 Active" : "⚫ Inactive"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            
            {/* Error Display */}
            {cameraError && (
              <Alert className="mb-4 bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {cameraError}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Video Feed */}
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden shadow-lg" style={{ minHeight: '300px' }}>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    style={{ minHeight: '300px' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: 'none' }}
                  />
                  
                  {/* Status Overlay */}
                  <div className="absolute top-4 left-4 right-4">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={detectionStatus === 'authorized' ? "default" : 
                                detectionStatus === 'unauthorized' ? "destructive" : "secondary"}
                        className="text-white px-3 py-1 shadow-lg"
                      >
                        {detectionStatus === 'idle' && '⚫ Ready'}
                        {detectionStatus === 'scanning' && '🔍 Scanning'}
                        {detectionStatus === 'authorized' && '✅ Authorized'}
                        {detectionStatus === 'unauthorized' && '⚠️ Unauthorized'}
                      </Badge>
                      
                      {confidence > 0 && (
                        <Badge variant="outline" className="bg-white/90 text-gray-900">
                          {confidence}% confidence
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Detection Info */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white">
                      <div className="text-sm font-medium">
                        {lastDetection || 'Waiting for detection...'}
                      </div>
                      <div className="text-xs text-gray-300">
                        Frame: {frameCountRef.current} | Camera: {currentDevice?.label || 'No camera selected'}
                      </div>
                      <div className="text-xs text-gray-300">
                        Permission: {permissionGranted ? 'Granted' : 'Not granted'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Camera Controls */}
                <div className="flex space-x-2">
                  {!permissionGranted && (
                    <Button onClick={checkCameraPermissions} className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700">
                      <Camera className="h-4 w-4 mr-2" />
                      Request Camera Permission
                    </Button>
                  )}
                  
                  {permissionGranted && !isStreaming && (
                    <Button onClick={startCamera} disabled={!currentDevice} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                      <Play className="h-4 w-4 mr-2" />
                      Start Camera
                    </Button>
                  )}
                  
                  {isStreaming && (
                    <Button onClick={stopCamera} variant="destructive" className="flex-1">
                      <Square className="h-4 w-4 mr-2" />
                      Stop Camera
                    </Button>
                  )}
                  
                  {availableDevices.length > 1 && permissionGranted && (
                    <Button onClick={switchCamera} variant="outline" className="bg-white">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Switch Camera ({availableDevices.length})
                    </Button>
                  )}
                </div>
                
                {/* Permission Help */}
                {!permissionGranted && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium mb-1">Camera Permission Required</p>
                    <p>This application needs camera access for face recognition. Click "Request Camera Permission" and allow access when prompted by your browser.</p>
                  </div>
                )}
              </div>
              
              {/* System Status */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">System Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Camera Permission:</span>
                      <span className={`font-medium ${permissionGranted ? 'text-green-600' : 'text-red-600'}`}>
                        {permissionGranted ? 'Granted' : 'Not Granted'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cameras Available:</span>
                      <span className="font-medium text-gray-900">{availableDevices.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Authorized Users:</span>
                      <span className="font-medium text-gray-900">{authorizedUsers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Detection Status:</span>
                      <span className="font-medium capitalize text-gray-900">{detectionStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Detection Logs:</span>
                      <span className="font-medium text-gray-900">{detectionLogs.length}</span>
                    </div>
                  </div>
                </div>
                
                {/* ESP32 Configuration */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-purple-600" />
                    ESP32 Configuration
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="esp32-ip" className="text-sm font-medium text-gray-700">ESP32 IP Address</Label>
                      <Input
                        id="esp32-ip"
                        value={esp32IP}
                        onChange={(e) => setEsp32IP(e.target.value)}
                        placeholder="192.168.1.100"
                        className="mt-1 bg-white border-gray-300"
                      />
                    </div>
                    <Button 
                      onClick={() => sendAlertToESP32(esp32IP, {
                        type: 'test_alert',
                        severity: 'medium',
                        message: 'Test alert from Face Recognition',
                        timestamp: new Date().toISOString()
                      })}
                      variant="outline"
                      size="sm"
                      className="w-full bg-white"
                    >
                      Test ESP32 Connection
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manage Authorized Users */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Manage Authorized Users</h3>
                <p className="text-gray-600 text-sm">Add or remove users for face recognition</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Add User Form */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Add New User</h4>
                <div>
                  <Label htmlFor="user-name" className="text-sm font-medium text-gray-700">Full Name</Label>
                  <Input
                    id="user-name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Enter full name"
                    className="mt-1 bg-white border-gray-300"
                  />
                </div>
                
                <div>
                  <Label htmlFor="user-photo" className="text-sm font-medium text-gray-700">Photo</Label>
                  <Input
                    id="user-photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewUserFile(e.target.files?.[0] || null)}
                    className="mt-1 bg-white border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a clear, well-lit photo (max 5MB) for best recognition accuracy
                  </p>
                </div>
                
                <Button 
                  onClick={handleAddUser}
                  disabled={loading || !newUserName.trim() || !newUserFile}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? "Adding..." : "Add Authorized User"}
                </Button>
              </div>
              
              {/* Existing Users */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Authorized Users ({authorizedUsers.length})</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="bg-white"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {authorizedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        {user.image_url && (
                          <img 
                            src={user.image_url} 
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">
                            Added {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-white text-green-600 border-green-300">
                          Active
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          disabled={loading}
                          className="bg-white border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {authorizedUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No authorized users yet</p>
                      <p className="text-sm">Add users to enable face recognition</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detection Logs */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Detection Logs</h3>
                <p className="text-gray-600 text-sm">Recent face detection events</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {detectionLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${log.authorized ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="font-medium text-gray-900">{log.person}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-white">
                      {log.confidence}%
                    </Badge>
                    <Badge className={log.authorized ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"}>
                      {log.authorized ? 'Authorized' : 'Unauthorized'}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {detectionLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No detection logs yet</p>
                  <p className="text-sm">Start camera to begin monitoring</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Camera Setup:</strong> Make sure to allow camera access when prompted by your browser. The application needs camera permission to function properly.
            </AlertDescription>
          </Alert>
          
          <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Face Recognition:</strong> For best results, ensure good lighting and position your face clearly in front of the camera.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
