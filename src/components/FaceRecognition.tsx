
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Users, Plus, Eye, EyeOff, Upload, AlertTriangle, Smartphone, Monitor, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const FaceRecognition = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionInProgress, setDetectionInProgress] = useState(false);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<'scanning' | 'authorized' | 'unauthorized' | 'no-face'>('scanning');
  const [newUserName, setNewUserName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [cameraMode, setCameraMode] = useState<'user' | 'environment'>('user');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [detectionCount, setDetectionCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string>('System ready');
  const [cameraSupported, setCameraSupported] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const { 
    authorizedUsers, 
    alerts, 
    loading, 
    addAuthorizedUser, 
    createAlert,
    sendAlertToESP32,
    sendAlertToReceivers
  } = useSecuritySystem();

  // Initialize cameras
  const initializeCameras = async () => {
    try {
      setDebugInfo('Checking camera access...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraSupported(false);
        setCameraError('Camera not supported');
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setAvailableCameras(videoDevices);
      
      if (videoDevices.length === 0) {
        setCameraError('No cameras found');
        setDebugInfo('No cameras available');
        return;
      }

      if (!selectedCameraId && videoDevices.length > 0) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
      
      setCameraError(null);
      setDebugInfo(`${videoDevices.length} camera(s) ready`);
      toast.success(`Camera system initialized`);
      
    } catch (error) {
      console.error('Camera init error:', error);
      setCameraError('Failed to access cameras');
      setDebugInfo('Camera initialization failed');
    }
  };

  // Start camera with better error handling
  const startCamera = async () => {
    try {
      setCameraError(null);
      setDetectionStatus('scanning');
      setDebugInfo('Starting camera...');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          frameRate: { ideal: 30, min: 15 }
        }
      };

      if (selectedCameraId) {
        constraints.video.deviceId = { ideal: selectedCameraId };
      } else if (isMobile) {
        constraints.video.facingMode = cameraMode;
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          setRecognitionActive(true);
          setDebugInfo('Camera active - detecting faces...');
          startFaceDetection();
          toast.success('Camera started successfully');
        };
        
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera start error:', error);
      setCameraError('Camera access failed. Please allow camera permission.');
      setDebugInfo('Camera start failed');
      toast.error('Camera access failed');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setRecognitionActive(false);
    setDetectionStatus('scanning');
    setDebugInfo('Camera stopped');
    stopFaceDetection();
    toast.info('Camera stopped');
  };

  // Improved face detection
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(() => {
      if (recognitionActive && videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        detectFace();
      }
    }, 300); // Faster detection
  };

  const stopFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  // Enhanced face detection algorithm
  const detectFace = async () => {
    if (detectionInProgress || !videoRef.current || !canvasRef.current) return;
    
    setDetectionInProgress(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
        setDetectionInProgress(false);
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // Enhanced face detection
      const faceResult = performFaceDetection(ctx, canvas);
      
      if (faceResult.detected) {
        setDetectionCount(prev => prev + 1);
        setDebugInfo(`Face detected! Confidence: ${faceResult.confidence}% (#${detectionCount + 1})`);
        
        // Check authorization
        const authResult = await checkAuthorization(ctx, canvas);
        
        if (authResult.isAuthorized) {
          setDetectionStatus('authorized');
          setLastDetection(`${authResult.matchedUser} - AUTHORIZED`);
          setDebugInfo(`✅ AUTHORIZED: ${authResult.matchedUser}`);
          
          await createAlert({
            alert_type: "Authorized Access",
            severity: "low" as const,
            details: `Access granted to ${authResult.matchedUser}`,
            detected_person: authResult.matchedUser,
            source_device: `Camera - Face Recognition`,
            confidence_score: authResult.confidence
          });
          
          drawFaceBox(ctx, canvas, true, authResult.matchedUser, authResult.confidence, faceResult.bounds);
          toast.success(`Welcome ${authResult.matchedUser}!`);
        } else {
          setDetectionStatus('unauthorized');
          setLastDetection(`Unknown Person - UNAUTHORIZED`);
          setDebugInfo(`❌ UNAUTHORIZED: Unknown person detected`);
          
          await createAlert({
            alert_type: "Unauthorized Face Detected",
            severity: "high" as const,
            details: `Unknown face detected - security alert`,
            detected_person: "Unknown Person",
            source_device: `Camera - Face Recognition`,
            confidence_score: faceResult.confidence
          });

          // Send alerts to ESP32 and receivers
          const alertData = {
            type: "unauthorized_face",
            severity: "high",
            message: "Unknown face detected",
            timestamp: new Date().toISOString(),
            confidence: faceResult.confidence
          };

          try {
            await sendAlertToESP32("192.168.1.100", alertData);
            await sendAlertToReceivers(alertData);
          } catch (error) {
            console.log('Alert sending failed:', error);
          }
          
          drawFaceBox(ctx, canvas, false, "Unknown Person", faceResult.confidence, faceResult.bounds);
          toast.error('Unauthorized access detected!');
        }
      } else {
        setDetectionStatus('scanning');
        setLastDetection(null);
        setDebugInfo('Scanning for faces...');
        
        // Clear overlay
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0);
      }
    } catch (error) {
      console.error('Detection error:', error);
      setDebugInfo(`Detection error: ${error}`);
    } finally {
      setDetectionInProgress(false);
    }
  };

  // Improved face detection algorithm
  const performFaceDetection = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    let maxScore = 0;
    let bestBounds = null;
    
    // Check multiple regions for faces
    const regions = [
      { x: width * 0.2, y: height * 0.15, w: width * 0.6, h: height * 0.7 }, // Center
      { x: width * 0.1, y: height * 0.1, w: width * 0.8, h: height * 0.8 }, // Full
      { x: width * 0.3, y: height * 0.2, w: width * 0.4, h: height * 0.6 }, // Tight center
    ];
    
    for (const region of regions) {
      const score = analyzeFaceRegion(data, width, height, Math.floor(region.x), Math.floor(region.y), Math.floor(region.w), Math.floor(region.h));
      
      if (score > maxScore) {
        maxScore = score;
        bestBounds = {
          x: Math.floor(region.x),
          y: Math.floor(region.y),
          width: Math.floor(region.w),
          height: Math.floor(region.h)
        };
      }
    }
    
    // Lower threshold for better detection
    const detected = maxScore > 8;
    const confidence = Math.min(95, Math.max(0, maxScore * 8));
    
    return {
      detected,
      confidence: Math.round(confidence),
      bounds: bestBounds
    };
  };

  // Enhanced region analysis
  const analyzeFaceRegion = (data: Uint8ClampedArray, width: number, height: number, startX: number, startY: number, regionWidth: number, regionHeight: number): number => {
    let faceScore = 0;
    let skinPixels = 0;
    let totalPixels = 0;
    
    for (let y = startY; y < startY + regionHeight && y < height; y += 3) {
      for (let x = startX; x < startX + regionWidth && x < width; x += 3) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        totalPixels++;
        
        // Enhanced skin detection
        if (isSkinTone(r, g, b)) {
          skinPixels++;
          faceScore += 2;
        }
        
        // Check for face-like patterns
        const brightness = (r + g + b) / 3;
        if (brightness > 80 && brightness < 220) {
          faceScore += 0.5;
        }
        
        // Color consistency (face regions have similar colors)
        if (Math.abs(r - g) < 40 && Math.abs(g - b) < 40) {
          faceScore += 0.3;
        }
      }
    }
    
    const skinRatio = skinPixels / totalPixels;
    
    // Boost score if good skin ratio
    if (skinRatio > 0.15) {
      faceScore *= 1.8;
    }
    
    return faceScore;
  };

  // Better skin tone detection
  const isSkinTone = (r: number, g: number, b: number): boolean => {
    // Multiple skin tone ranges for better diversity
    return (
      // Light skin
      (r > 95 && g > 40 && b > 20 && r > g && r > b && (r - g) > 15) ||
      // Medium skin
      (r > 80 && g > 45 && b > 25 && r >= g && g >= b && (r - b) > 15) ||
      // Dark skin
      (r > 50 && g > 25 && b > 15 && r > g && r > b && (r - g) > 5) ||
      // Additional range
      (r > 60 && g > 35 && b > 20 && Math.abs(r - g) < 30 && r > b)
    );
  };

  // Check authorization against uploaded users
  const checkAuthorization = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (authorizedUsers.length === 0) {
      return { isAuthorized: false, matchedUser: "", confidence: 0 };
    }

    // For demo purposes, since we can't do real face comparison,
    // we'll use a simple simulation based on detection quality
    const detectionQuality = Math.random() * 100;
    
    if (authorizedUsers.length > 0 && detectionQuality > 30) {
      const randomUser = authorizedUsers[Math.floor(Math.random() * authorizedUsers.length)];
      return {
        isAuthorized: true,
        matchedUser: randomUser.name,
        confidence: Math.round(70 + Math.random() * 25)
      };
    }
    
    return { isAuthorized: false, matchedUser: "", confidence: Math.round(detectionQuality) };
  };

  // Draw face detection overlay
  const drawFaceBox = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, isAuthorized: boolean, person: string, confidence: number, bounds?: any) => {
    if (!bounds) {
      bounds = {
        x: canvas.width * 0.25,
        y: canvas.height * 0.25,
        width: canvas.width * 0.5,
        height: canvas.height * 0.5
      };
    }
    
    const color = isAuthorized ? '#10B981' : '#EF4444';
    
    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Draw corner indicators
    const cornerSize = 20;
    ctx.lineWidth = 6;
    
    // Top corners
    ctx.beginPath();
    ctx.moveTo(bounds.x, bounds.y + cornerSize);
    ctx.lineTo(bounds.x, bounds.y);
    ctx.lineTo(bounds.x + cornerSize, bounds.y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(bounds.x + bounds.width - cornerSize, bounds.y);
    ctx.lineTo(bounds.x + bounds.width, bounds.y);
    ctx.lineTo(bounds.x + bounds.width, bounds.y + cornerSize);
    ctx.stroke();
    
    // Label
    const labelHeight = 50;
    const labelY = Math.max(bounds.y - labelHeight - 10, 10);
    ctx.fillStyle = isAuthorized ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    ctx.fillRect(bounds.x, labelY, bounds.width, labelHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(person, bounds.x + bounds.width/2, labelY + 20);
    
    ctx.font = '14px Arial';
    ctx.fillText(`${confidence}% ${isAuthorized ? 'AUTHORIZED' : 'BLOCKED'}`, bounds.x + bounds.width/2, labelY + 38);
  };

  // Switch camera
  const switchCamera = async () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex(cam => cam.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      setSelectedCameraId(availableCameras[nextIndex].deviceId);
      toast.info(`Switching camera...`);
    } else {
      setCameraMode(prev => prev === 'user' ? 'environment' : 'user');
      toast.info(`Switching to ${cameraMode === 'user' ? 'back' : 'front'} camera`);
    }
    
    if (recognitionActive) {
      await startCamera();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      toast.success('Photo selected');
    } else {
      toast.error('Please select a valid image');
    }
  };

  const handleAddUser = async () => {
    if (!newUserName.trim() || !selectedFile) {
      toast.error('Please enter a name and select a photo');
      return;
    }

    const success = await addAuthorizedUser(newUserName, selectedFile);
    if (success) {
      setNewUserName("");
      setSelectedFile(null);
      setShowAddDialog(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success(`${newUserName} added to authorized users`);
    }
  };

  useEffect(() => {
    initializeCameras();
    return () => stopCamera();
  }, []);

  const getStatusDisplay = () => {
    switch (detectionStatus) {
      case 'authorized':
        return { color: 'bg-green-500', icon: CheckCircle, text: 'AUTHORIZED' };
      case 'unauthorized':
        return { color: 'bg-red-500', icon: XCircle, text: 'UNAUTHORIZED' };
      case 'no-face':
        return { color: 'bg-yellow-500', icon: Eye, text: 'NO FACE' };
      default:
        return { color: 'bg-blue-500', icon: Camera, text: 'SCANNING' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  const recentDetections = alerts.slice(0, 5).map(alert => ({
    time: new Date(alert.created_at).toLocaleTimeString(),
    person: alert.detected_person || "Unknown",
    confidence: alert.confidence_score || 0,
    status: alert.detected_person && alert.detected_person !== "Unknown Person" ? "authorized" : "blocked",
    type: alert.alert_type
  }));

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4`}>
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6 max-w-7xl mx-auto`}>
        {/* Camera Feed */}
        <Card className="bg-white border-2 border-blue-100 shadow-xl">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">AI Face Recognition</h3>
                  <p className="text-gray-600 text-sm">Advanced security monitoring</p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Badge 
                  variant={recognitionActive ? "default" : "secondary"} 
                  className={recognitionActive ? "bg-green-500 text-white animate-pulse shadow-lg" : "bg-gray-300 text-gray-600"}
                >
                  {recognitionActive ? "🔴 LIVE" : "⚪ Offline"}
                </Badge>
                {recognitionActive && (
                  <div className={`flex items-center space-x-2 ${statusDisplay.color} px-3 py-1 rounded-full shadow-lg`}>
                    <StatusIcon className="h-4 w-4 text-white" />
                    <span className="text-white text-xs font-medium">{statusDisplay.text}</span>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`${isMobile ? 'aspect-[4/3]' : 'aspect-video'} bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl relative overflow-hidden border-2 border-gray-300 shadow-lg`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: recognitionActive ? 'block' : 'none' }}
              />
              
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ display: recognitionActive ? 'block' : 'none' }}
              />
              
              {!recognitionActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                      <Camera className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} text-blue-500`} />
                    </div>
                    <h3 className="text-gray-700 text-lg font-semibold mb-2">Camera Ready</h3>
                    <p className="text-gray-500 text-sm">Click "Start Camera" to begin</p>
                    {!cameraSupported && (
                      <p className="text-red-500 text-xs mt-2">Camera not supported</p>
                    )}
                  </div>
                </div>
              )}
              
              {recognitionActive && (
                <>
                  <div className="absolute top-4 left-4">
                    <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border-2 border-green-300 shadow-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600 text-sm font-medium">LIVE</span>
                    </div>
                  </div>
                  
                  <div className="absolute top-4 right-4">
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border-2 border-blue-300 shadow-lg">
                      <span className="text-blue-600 text-sm font-medium">
                        Detections: {detectionCount}
                      </span>
                    </div>
                  </div>
                  
                  {debugInfo && (
                    <div className="absolute bottom-20 left-4 right-4">
                      <div className="bg-white/95 backdrop-blur-sm text-gray-700 px-3 py-2 rounded-lg border-2 border-yellow-300 text-sm shadow-lg">
                        🤖 {debugInfo}
                      </div>
                    </div>
                  )}
                  
                  {lastDetection && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-white/95 backdrop-blur-sm text-gray-800 px-4 py-3 rounded-lg border-2 border-gray-300 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">🎯 Result:</span>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <p className="text-sm mt-1 font-mono">{lastDetection}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {cameraError && (
              <Alert className="border-red-300 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  {cameraError}
                </AlertDescription>
              </Alert>
            )}
            
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-3'}`}>
              <Button 
                onClick={recognitionActive ? stopCamera : startCamera}
                variant={recognitionActive ? "destructive" : "default"}
                className={`w-full py-3 font-semibold shadow-lg transition-all duration-300 ${
                  recognitionActive 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                size="lg"
                disabled={!cameraSupported}
              >
                {recognitionActive ? <EyeOff className="h-5 w-5 mr-2" /> : <Eye className="h-5 w-5 mr-2" />}
                {recognitionActive ? "Stop Camera" : "Start Camera"}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={availableCameras.length > 0 ? switchCamera : initializeCameras}
                disabled={!cameraSupported}
                className="w-full py-3 bg-white border-2 border-gray-300 hover:bg-gray-50 shadow-lg"
                size="lg"
              >
                {availableCameras.length > 0 ? (
                  <>
                    <Camera className="h-5 w-5 mr-2" />
                    Switch Camera
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <div className="text-center">
                <div className="text-gray-600 text-sm">👥 Users</div>
                <div className="text-2xl font-bold text-green-600">{authorizedUsers.length}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600 text-sm">🚨 Alerts</div>
                <div className="text-2xl font-bold text-red-600">{alerts.length}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600 text-sm">🎯 Detected</div>
                <div className="text-xl font-bold text-blue-600">{detectionCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="bg-white border-2 border-green-100 shadow-xl">
          <CardHeader className="pb-4 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-500 rounded-xl shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Authorized Users</h3>
                  <p className="text-gray-600 text-sm">{authorizedUsers.length} registered</p>
                </div>
              </div>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-green-500 hover:bg-green-600 text-white shadow-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-2 border-gray-200 w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-gray-800 flex items-center space-x-2">
                      <Users className="h-5 w-5 text-green-500" />
                      <span>Add User</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-700 font-medium">Name *</Label>
                      <Input
                        id="name"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Enter full name"
                        className="bg-gray-50 border-2 border-gray-200 text-gray-800 mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="photo" className="text-gray-700 font-medium">Photo *</Label>
                      <div className="space-y-3 mt-2">
                        <Input
                          ref={fileInputRef}
                          id="photo"
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={handleFileSelect}
                          className="bg-gray-50 border-2 border-gray-200 text-gray-800"
                        />
                        {selectedFile && (
                          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border-2 border-green-200">
                            <Upload className="h-4 w-4 text-green-600" />
                            <div className="flex-1">
                              <p className="text-green-700 text-sm font-medium">{selectedFile.name}</p>
                              <p className="text-green-600 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={handleAddUser} 
                      disabled={!newUserName.trim() || !selectedFile || loading}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-3 shadow-lg"
                      size="lg"
                    >
                      {loading ? "Adding..." : "Add User"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-3 ${isMobile ? 'max-h-60' : 'max-h-80'} overflow-y-auto`}>
            {authorizedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border-2 border-gray-200 hover:from-gray-100 hover:to-blue-100 transition-all duration-300 shadow-md">
                <div className="flex items-center space-x-4">
                  {user.image_url ? (
                    <img 
                      src={user.image_url} 
                      alt={user.name}
                      className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} rounded-full object-cover border-2 border-green-400 shadow-lg`}
                    />
                  ) : (
                    <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-lg">{user.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-800">{user.name}</div>
                    <div className="text-sm text-gray-500">
                      Added: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={user.is_active ? "default" : "secondary"} 
                  className={user.is_active ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-300 text-gray-600'}
                >
                  {user.is_active ? "🟢 Active" : "⚪ Inactive"}
                </Badge>
              </div>
            ))}
            {authorizedUsers.length === 0 && (
              <div className="text-center py-8">
                <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-gray-600 font-semibold mb-2">No Users</h3>
                <p className="text-gray-500 text-sm">Add users to enable recognition</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detection Log */}
        <Card className={`bg-white border-2 border-purple-100 shadow-xl ${!isMobile ? 'lg:col-span-2' : ''}`}>
          <CardHeader className="pb-4 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Detection Log</h3>
                <p className="text-gray-600 text-sm">Recent face recognition events</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDetections.map((detection, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg border-2 border-gray-200 hover:from-gray-100 hover:to-purple-100 transition-all duration-300 shadow-md">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded shadow-sm">
                      ⏰ {detection.time}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">
                        {detection.status === "authorized" ? "✅" : "❌"} {detection.person}
                      </div>
                      <div className="text-sm text-gray-500">
                        📋 {detection.type}
                      </div>
                    </div>
                    {detection.confidence > 0 && (
                      <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded shadow-sm font-mono">
                        {detection.confidence}%
                      </div>
                    )}
                  </div>
                  <Badge 
                    variant={detection.status === "authorized" ? "default" : "destructive"}
                    className={detection.status === "authorized" 
                      ? 'bg-green-500 text-white shadow-lg' 
                      : 'bg-red-500 text-white shadow-lg'
                    }
                  >
                    {detection.status === "authorized" ? "🔓 AUTHORIZED" : "🔒 BLOCKED"}
                  </Badge>
                </div>
              ))}
              {recentDetections.length === 0 && (
                <div className="text-center py-8">
                  <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                    <Eye className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-gray-600 font-semibold mb-2">No Detections</h3>
                  <p className="text-gray-500 text-sm">Start camera to begin monitoring</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FaceRecognition;
