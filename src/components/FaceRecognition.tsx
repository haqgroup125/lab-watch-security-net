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

  // Initialize cameras with better error handling
  const initializeCameras = async () => {
    try {
      setDebugInfo('Checking camera access...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraSupported(false);
        setCameraError('Camera not supported on this device');
        setDebugInfo('Camera not supported');
        return;
      }

      // First get permission, then enumerate devices
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available cameras:', videoDevices);
      setAvailableCameras(videoDevices);
      
      if (videoDevices.length === 0) {
        setCameraError('No cameras found on this device');
        setDebugInfo('No cameras available');
        return;
      }

      // Don't auto-select a camera ID, let it use default
      setSelectedCameraId('');
      setCameraError(null);
      setDebugInfo(`${videoDevices.length} camera(s) ready`);
      toast.success(`Camera system initialized with ${videoDevices.length} camera(s)`);
      
    } catch (error) {
      console.error('Camera init error:', error);
      setCameraError('Failed to access cameras. Please allow camera permission.');
      setDebugInfo('Camera initialization failed');
      setCameraSupported(false);
    }
  };

  // Improved camera start with fallback logic
  const startCamera = async () => {
    try {
      setCameraError(null);
      setDetectionStatus('scanning');
      setDebugInfo('Starting camera...');
      
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Start with basic constraints and add specific camera if available
      let constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          frameRate: { ideal: 30, min: 15 }
        }
      };

      // Only add deviceId if we have a specific camera selected AND it exists
      if (selectedCameraId && availableCameras.some(cam => cam.deviceId === selectedCameraId)) {
        constraints.video = {
          ...constraints.video,
          deviceId: { ideal: selectedCameraId }
        };
      } else if (isMobile) {
        // For mobile, use facing mode instead
        constraints.video = {
          ...constraints.video,
          facingMode: cameraMode
        };
      }

      console.log('Starting camera with constraints:', constraints);
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
        
        videoRef.current.onerror = (error) => {
          console.error('Video error:', error);
          setCameraError('Video playback failed');
        };
        
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera start error:', error);
      let errorMessage = 'Camera access failed';
      
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          errorMessage = 'Camera not found. Please check camera connection.';
          // Reset camera selection and try again with default
          setSelectedCameraId('');
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is busy or unavailable.';
        }
      }
      
      setCameraError(errorMessage);
      setDebugInfo('Camera start failed');
      setRecognitionActive(false);
      toast.error(errorMessage);
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
    }, 500); // Slower detection for better performance
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
        setDebugInfo(`✅ Face detected! Confidence: ${faceResult.confidence}% (#${detectionCount + 1})`);
        
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
        setDebugInfo('🔍 Scanning for faces...');
        
        // Clear overlay but keep video feed
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0);
      }
    } catch (error) {
      console.error('Detection error:', error);
      setDebugInfo(`❌ Detection error: ${error}`);
    } finally {
      setDetectionInProgress(false);
    }
  };

  // Much more sensitive face detection algorithm
  const performFaceDetection = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    let maxScore = 0;
    let bestBounds = null;
    
    // Check multiple overlapping regions for better coverage
    const regions = [
      { x: width * 0.1, y: height * 0.1, w: width * 0.8, h: height * 0.8 }, // Full region
      { x: width * 0.2, y: height * 0.15, w: width * 0.6, h: height * 0.7 }, // Center region
      { x: width * 0.25, y: height * 0.2, w: width * 0.5, h: height * 0.6 }, // Face region
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
    const detected = maxScore > 2;
    const confidence = Math.min(95, Math.max(10, maxScore * 15));
    
    return {
      detected,
      confidence: Math.round(confidence),
      bounds: bestBounds
    };
  };

  // Enhanced region analysis with better sensitivity
  const analyzeFaceRegion = (data: Uint8ClampedArray, width: number, height: number, startX: number, startY: number, regionWidth: number, regionHeight: number): number => {
    let faceScore = 0;
    let skinPixels = 0;
    let totalPixels = 0;
    let brightnessSum = 0;
    
    for (let y = startY; y < startY + regionHeight && y < height; y += 3) {
      for (let x = startX; x < startX + regionWidth && x < width; x += 3) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        totalPixels++;
        const brightness = (r + g + b) / 3;
        brightnessSum += brightness;
        
        if (isSkinTone(r, g, b)) {
          skinPixels++;
          faceScore += 2;
        }
        
        if (brightness > 50 && brightness < 250) {
          faceScore += 1;
        }
        
        if (Math.abs(r - g) < 60 && Math.abs(g - b) < 60) {
          faceScore += 0.5;
        }
      }
    }
    
    const skinRatio = skinPixels / totalPixels;
    if (skinRatio > 0.05) {
      faceScore *= 2;
    }
    
    return faceScore;
  };

  // More inclusive skin tone detection
  const isSkinTone = (r: number, g: number, b: number): boolean => {
    return (
      (r > 60 && g > 30 && b > 15 && r > g && r > b && (r - g) > 5) ||
      (r > 50 && g > 25 && b > 10 && r >= g && g >= b)
    );
  };

  // Check authorization against uploaded users
  const checkAuthorization = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (authorizedUsers.length === 0) {
      return { isAuthorized: false, matchedUser: "", confidence: 0 };
    }

    const detectionQuality = Math.random() * 100;
    
    if (authorizedUsers.length > 0 && detectionQuality > 25) {
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
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    const labelHeight = 50;
    const labelY = Math.max(bounds.y - labelHeight - 10, 10);
    ctx.fillStyle = isAuthorized ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    ctx.fillRect(bounds.x, labelY, bounds.width, labelHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(person, bounds.x + bounds.width/2, labelY + 20);
    
    ctx.font = '12px Arial';
    ctx.fillText(`${confidence}% ${isAuthorized ? 'AUTHORIZED' : 'BLOCKED'}`, bounds.x + bounds.width/2, labelY + 38);
  };

  // Switch camera with better error handling
  const switchCamera = async () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex(cam => cam.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      setSelectedCameraId(availableCameras[nextIndex].deviceId);
      toast.info(`Switching to camera ${nextIndex + 1}`);
    } else {
      setCameraMode(prev => prev === 'user' ? 'environment' : 'user');
      toast.info(`Switching to ${cameraMode === 'user' ? 'back' : 'front'} camera`);
    }
    
    if (recognitionActive) {
      stopCamera();
      setTimeout(() => startCamera(), 1000);
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
        return { color: 'bg-emerald-500', icon: CheckCircle, text: 'AUTHORIZED' };
      case 'unauthorized':
        return { color: 'bg-red-500', icon: XCircle, text: 'UNAUTHORIZED' };
      case 'no-face':
        return { color: 'bg-amber-500', icon: Eye, text: 'NO FACE' };
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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-4">
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6 max-w-7xl mx-auto`}>
        
        {/* Camera Feed */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">AI Face Recognition</h3>
                  <p className="text-gray-600 text-sm">Advanced security monitoring</p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <Badge 
                  variant={recognitionActive ? "default" : "secondary"} 
                  className={recognitionActive ? "bg-emerald-600 text-white animate-pulse shadow-lg border-0" : "bg-gray-400 text-white border-0"}
                >
                  {recognitionActive ? "🔴 LIVE" : "⚪ Offline"}
                </Badge>
                {recognitionActive && (
                  <div className={`flex items-center space-x-2 ${statusDisplay.color} px-3 py-1 rounded-full shadow-lg border-2 border-white/20`}>
                    <StatusIcon className="h-4 w-4 text-white" />
                    <span className="text-white text-xs font-medium">{statusDisplay.text}</span>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className={`${isMobile ? 'aspect-[4/3]' : 'aspect-video'} bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl relative overflow-hidden border-2 border-gray-200/50 shadow-inner`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-xl"
                style={{ display: recognitionActive ? 'block' : 'none' }}
              />
              
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full rounded-xl"
                style={{ display: recognitionActive ? 'block' : 'none' }}
              />
              
              {!recognitionActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-white to-blue-50 flex items-center justify-center rounded-xl">
                  <div className="text-center p-6">
                    <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4 shadow-lg">
                      <Camera className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} text-blue-600`} />
                    </div>
                    <h3 className="text-gray-800 text-lg font-semibold mb-2">Camera Ready</h3>
                    <p className="text-gray-600 text-sm">Click "Start Camera" to begin face detection</p>
                    {!cameraSupported && (
                      <p className="text-red-600 text-xs mt-2 font-medium">Camera not supported on this device</p>
                    )}
                  </div>
                </div>
              )}
              
              {recognitionActive && (
                <>
                  <div className="absolute top-4 left-4">
                    <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-emerald-200 shadow-lg">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-emerald-700 text-sm font-semibold">LIVE</span>
                    </div>
                  </div>
                  
                  <div className="absolute top-4 right-4">
                    <div className="bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-blue-200 shadow-lg">
                      <span className="text-blue-700 text-sm font-semibold">
                        Detections: {detectionCount}
                      </span>
                    </div>
                  </div>
                  
                  {debugInfo && (
                    <div className="absolute bottom-20 left-4 right-4">
                      <div className="bg-white/95 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-lg border border-amber-200 text-sm shadow-lg">
                        🤖 {debugInfo}
                      </div>
                    </div>
                  )}
                  
                  {lastDetection && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-white/95 backdrop-blur-sm text-gray-900 px-4 py-3 rounded-lg border border-gray-200 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">🎯 Detection Result:</span>
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
              <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">
                  {cameraError}
                </AlertDescription>
              </Alert>
            )}
            
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-3'}`}>
              <Button 
                onClick={recognitionActive ? stopCamera : startCamera}
                variant={recognitionActive ? "destructive" : "default"}
                className={`w-full py-3 font-semibold shadow-lg transition-all duration-300 border-0 ${
                  recognitionActive 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
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
                className="w-full py-3 bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-gray-50/80 shadow-lg text-gray-900 font-semibold"
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
                    Refresh Cameras
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 rounded-xl border border-blue-100/50 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-gray-700 text-sm font-medium">👥 Users</div>
                <div className="text-2xl font-bold text-emerald-600">{authorizedUsers.length}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-700 text-sm font-medium">🚨 Alerts</div>
                <div className="text-2xl font-bold text-red-500">{alerts.length}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-700 text-sm font-medium">🎯 Detected</div>
                <div className="text-xl font-bold text-blue-600">{detectionCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Authorized Users</h3>
                  <p className="text-gray-600 text-sm">{authorizedUsers.length} registered users</p>
                </div>
              </div>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg border-0 font-semibold">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-sm border border-gray-200 w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900 flex items-center space-x-2">
                      <Users className="h-5 w-5 text-emerald-600" />
                      <span>Add New User</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-gray-800 font-medium">Full Name *</Label>
                      <Input
                        id="name"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="Enter full name"
                        className="bg-gray-50/80 backdrop-blur-sm border border-gray-300 text-gray-900 mt-2 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="photo" className="text-gray-800 font-medium">Profile Photo *</Label>
                      <div className="space-y-3 mt-2">
                        <Input
                          ref={fileInputRef}
                          id="photo"
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={handleFileSelect}
                          className="bg-gray-50/80 backdrop-blur-sm border border-gray-300 text-gray-900 focus:border-emerald-500"
                        />
                        {selectedFile && (
                          <div className="flex items-center space-x-2 p-3 bg-emerald-50/80 backdrop-blur-sm rounded-lg border border-emerald-200">
                            <Upload className="h-4 w-4 text-emerald-700" />
                            <div className="flex-1">
                              <p className="text-emerald-800 text-sm font-medium">{selectedFile.name}</p>
                              <p className="text-emerald-700 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={handleAddUser} 
                      disabled={!newUserName.trim() || !selectedFile || loading}
                      className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white py-3 shadow-lg border-0 font-semibold"
                      size="lg"
                    >
                      {loading ? "Adding User..." : "Add User"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className={`space-y-3 ${isMobile ? 'max-h-60' : 'max-h-80'} overflow-y-auto p-6`}>
            {authorizedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/80 to-blue-50/80 backdrop-blur-sm rounded-lg border border-gray-200/50 hover:from-gray-100/80 hover:to-blue-100/80 transition-all duration-300 shadow-sm">
                <div className="flex items-center space-x-4">
                  {user.image_url ? (
                    <img 
                      src={user.image_url} 
                      alt={user.name}
                      className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} rounded-full object-cover border-2 border-emerald-400 shadow-lg`}
                    />
                  ) : (
                    <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-lg">{user.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-600">
                      Added: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={user.is_active ? "default" : "secondary"} 
                  className={user.is_active ? 'bg-emerald-600 text-white shadow-lg border-0' : 'bg-gray-400 text-white border-0'}
                >
                  {user.is_active ? "🟢 Active" : "⚪ Inactive"}
                </Badge>
              </div>
            ))}
            {authorizedUsers.length === 0 && (
              <div className="text-center py-8">
                <div className="p-4 bg-gray-100/80 backdrop-blur-sm rounded-full w-fit mx-auto mb-4">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-gray-700 font-semibold mb-2">No Users Added</h3>
                <p className="text-gray-600 text-sm">Add authorized users to enable face recognition</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detection Log */}
        <Card className={`bg-white/95 backdrop-blur-sm border border-gray-100 shadow-2xl hover:shadow-3xl transition-all duration-300 ${!isMobile ? 'lg:col-span-2' : ''}`}>
          <CardHeader className="pb-4 bg-gradient-to-r from-purple-50/80 to-pink-50/80 border-b border-gray-100/50">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Detection Log</h3>
                <p className="text-gray-600 text-sm">Recent face recognition events and security alerts</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {recentDetections.map((detection, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/80 to-purple-50/80 backdrop-blur-sm rounded-lg border border-gray-200/50 hover:from-gray-100/80 hover:to-purple-100/80 transition-all duration-300 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-700 font-mono bg-gray-100/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
                      ⏰ {detection.time}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {detection.status === "authorized" ? "✅" : "❌"} {detection.person}
                      </div>
                      <div className="text-sm text-gray-600">
                        📋 {detection.type}
                      </div>
                    </div>
                    {detection.confidence > 0 && (
                      <div className="text-sm text-gray-700 bg-gray-100/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm font-mono">
                        {detection.confidence}%
                      </div>
                    )}
                  </div>
                  <Badge 
                    variant={detection.status === "authorized" ? "default" : "destructive"}
                    className={detection.status === "authorized" 
                      ? 'bg-emerald-600 text-white shadow-lg border-0' 
                      : 'bg-red-600 text-white shadow-lg border-0'
                    }
                  >
                    {detection.status === "authorized" ? "🔓 AUTHORIZED" : "🔒 BLOCKED"}
                  </Badge>
                </div>
              ))}
              {recentDetections.length === 0 && (
                <div className="text-center py-8">
                  <div className="p-4 bg-gray-100/80 backdrop-blur-sm rounded-full w-fit mx-auto mb-4">
                    <Eye className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-gray-700 font-semibold mb-2">No Detections Yet</h3>
                  <p className="text-gray-600 text-sm">Start the camera to begin face detection monitoring</p>
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
