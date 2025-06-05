
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

  // Check camera support and get available cameras
  const initializeCameras = async () => {
    try {
      setDebugInfo('Checking camera support...');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraSupported(false);
        setCameraError('Camera not supported on this device/browser');
        return;
      }

      // Request permission first to get device list
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        console.log('Permission needed for camera access');
      }

      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available cameras:', videoDevices);
      setAvailableCameras(videoDevices);
      
      if (videoDevices.length === 0) {
        setCameraError('No cameras found on this device');
        setDebugInfo('No cameras detected');
        return;
      }

      // Set default camera
      if (!selectedCameraId && videoDevices.length > 0) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
      
      setCameraError(null);
      setDebugInfo(`Found ${videoDevices.length} camera(s)`);
      toast.success(`Camera system ready - ${videoDevices.length} camera(s) detected`);
      
    } catch (error) {
      console.error('Error initializing cameras:', error);
      setCameraError('Failed to access camera system');
      setDebugInfo('Camera initialization failed');
    }
  };

  // Enhanced camera start with multiple fallback strategies
  const startCamera = async () => {
    try {
      setCameraError(null);
      setDetectionStatus('scanning');
      setDebugInfo('Starting camera...');
      
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Try multiple constraint strategies
      const constraintStrategies = [
        // Strategy 1: Specific device ID
        selectedCameraId ? {
          video: {
            deviceId: { exact: selectedCameraId },
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            frameRate: { ideal: 30 }
          }
        } : null,
        
        // Strategy 2: Facing mode (mobile)
        isMobile ? {
          video: {
            facingMode: cameraMode,
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 }
          }
        } : null,
        
        // Strategy 3: Basic video
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        },
        
        // Strategy 4: Minimal constraints
        { video: true }
      ].filter(Boolean) as MediaStreamConstraints[];

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      for (const constraints of constraintStrategies) {
        try {
          console.log('Trying camera constraints:', constraints);
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (error) {
          console.log('Camera constraint failed:', error);
          lastError = error as Error;
          continue;
        }
      }

      if (!stream) {
        throw lastError || new Error('All camera strategies failed');
      }

      console.log('Camera stream obtained successfully');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, starting recognition');
          setRecognitionActive(true);
          setDebugInfo('Camera active - starting face detection...');
          toast.success('Camera started successfully');
          startFaceDetection();
        };
        
        videoRef.current.onerror = (error) => {
          console.error('Video element error:', error);
          setCameraError('Video playback error');
        };
        
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      if (error instanceof Error) {
        let errorMessage = 'Camera access failed';
        
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is busy or hardware error occurred.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints not supported. Trying basic settings...';
        }
        
        setCameraError(errorMessage);
        setDebugInfo(`Error: ${error.name}`);
        toast.error(errorMessage);
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    console.log('Stopping camera');
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

  // Advanced face detection with multiple algorithms
  const startFaceDetection = () => {
    console.log('Starting face detection');
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(() => {
      if (recognitionActive && videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        detectAndAnalyzeFace();
      }
    }, 500); // Faster detection for better responsiveness
  };

  const stopFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  // Enhanced face detection algorithm
  const detectAndAnalyzeFace = async () => {
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
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current frame
      ctx.drawImage(video, 0, 0);
      
      // Advanced face detection
      const faceDetected = await performAdvancedFaceDetection(ctx, canvas);
      
      if (faceDetected.detected) {
        console.log('Face detected with confidence:', faceDetected.confidence);
        setDetectionCount(prev => prev + 1);
        setDebugInfo(`Face detected! Confidence: ${faceDetected.confidence}% (Detection #${detectionCount + 1})`);
        
        // Analyze authorization
        const authResult = await analyzeFaceAuthorization(ctx, canvas);
        
        if (authResult.isAuthorized) {
          setDetectionStatus('authorized');
          setLastDetection(`${authResult.matchedUser} - Authorized (${authResult.confidence}%)`);
          setDebugInfo(`✅ AUTHORIZED: ${authResult.matchedUser} (${authResult.confidence}%)`);
          
          // Create authorized access log
          await createAlert({
            alert_type: "Authorized Access",
            severity: "low" as const,
            details: `Access granted to ${authResult.matchedUser} - confidence: ${authResult.confidence}%`,
            detected_person: authResult.matchedUser,
            source_device: `${isMobile ? 'Mobile' : 'Desktop'} Camera - Face Recognition`,
            confidence_score: authResult.confidence
          });
          
          drawFaceOverlay(ctx, canvas, true, authResult.matchedUser, authResult.confidence, faceDetected.bounds);
          toast.success(`Welcome ${authResult.matchedUser}!`);
        } else {
          setDetectionStatus('unauthorized');
          setLastDetection(`Unknown Person - Unauthorized (${authResult.confidence}%)`);
          setDebugInfo(`❌ UNAUTHORIZED: Unknown person (${authResult.confidence}%)`);
          
          // Create unauthorized alert
          await createAlert({
            alert_type: "Unauthorized Face Detected",
            severity: "high" as const,
            details: `Unknown face detected - confidence: ${authResult.confidence}% - immediate attention required`,
            detected_person: "Unknown Person",
            source_device: `${isMobile ? 'Mobile' : 'Desktop'} Camera - Face Recognition`,
            confidence_score: authResult.confidence
          });

          // Send alerts
          const alertData = {
            type: "unauthorized_face",
            severity: "high",
            message: "Unknown face detected at main entrance",
            timestamp: new Date().toISOString(),
            confidence: authResult.confidence
          };

          try {
            await sendAlertToESP32("192.168.1.100", alertData);
            await sendAlertToReceivers(alertData);
          } catch (error) {
            console.log('Alert sending failed (devices may not be available):', error);
          }
          
          drawFaceOverlay(ctx, canvas, false, "Unknown Person", authResult.confidence, faceDetected.bounds);
          toast.error('Unauthorized access detected!');
        }
      } else {
        setDetectionStatus('no-face');
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

  // Advanced multi-algorithm face detection
  const performAdvancedFaceDetection = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): Promise<{
    detected: boolean;
    confidence: number;
    bounds?: { x: number; y: number; width: number; height: number };
  }> => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    let maxConfidence = 0;
    let bestBounds = null;
    
    // Multi-scale detection windows
    const scales = [0.3, 0.4, 0.5, 0.6];
    
    for (const scale of scales) {
      const windowWidth = Math.floor(width * scale);
      const windowHeight = Math.floor(height * scale);
      
      // Scan different regions
      const regions = [
        { x: (width - windowWidth) / 2, y: (height - windowHeight) / 2 }, // Center
        { x: width * 0.1, y: height * 0.1 }, // Top-left
        { x: width * 0.6, y: height * 0.1 }, // Top-right
        { x: width * 0.1, y: height * 0.6 }, // Bottom-left
        { x: width * 0.6, y: height * 0.6 }, // Bottom-right
      ];
      
      for (const region of regions) {
        const confidence = analyzeFaceRegion(data, width, height, Math.floor(region.x), Math.floor(region.y), windowWidth, windowHeight);
        
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestBounds = {
            x: Math.floor(region.x),
            y: Math.floor(region.y),
            width: windowWidth,
            height: windowHeight
          };
        }
      }
    }
    
    // Detection threshold
    const detected = maxConfidence > 15; // Lowered threshold for better sensitivity
    
    return {
      detected,
      confidence: Math.min(95, maxConfidence),
      bounds: bestBounds || undefined
    };
  };

  // Analyze specific region for face characteristics
  const analyzeFaceRegion = (data: Uint8ClampedArray, width: number, height: number, startX: number, startY: number, regionWidth: number, regionHeight: number): number => {
    let skinPixels = 0;
    let faceScore = 0;
    let totalPixels = 0;
    
    for (let y = startY; y < startY + regionHeight && y < height; y += 2) {
      for (let x = startX; x < startX + regionWidth && x < width; x += 2) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        totalPixels++;
        
        // Enhanced skin detection
        const isSkin = detectSkinTone(r, g, b);
        if (isSkin) {
          skinPixels++;
          faceScore += 3;
        }
        
        // Face feature detection
        const brightness = (r + g + b) / 3;
        if (brightness > 100 && brightness < 200) {
          faceScore += 1;
        }
        
        // Color uniformity (typical for face regions)
        if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
          faceScore += 1;
        }
      }
    }
    
    const skinRatio = skinPixels / totalPixels;
    const adjustedScore = faceScore * (skinRatio > 0.1 ? 1.5 : 1);
    
    return adjustedScore;
  };

  // Improved skin tone detection
  const detectSkinTone = (r: number, g: number, b: number): boolean => {
    // Multiple skin tone ranges
    return (
      // Light skin
      (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) ||
      // Medium skin
      (r > 80 && g > 50 && b > 30 && r >= g && g >= b && (r - g) > 10) ||
      // Dark skin  
      (r > 60 && g > 30 && b > 15 && r > g && r > b)
    );
  };

  // Face authorization analysis
  const analyzeFaceAuthorization = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): Promise<{
    isAuthorized: boolean;
    matchedUser: string;
    confidence: number;
  }> => {
    if (authorizedUsers.length === 0) {
      return { isAuthorized: false, matchedUser: "", confidence: 30 };
    }

    const currentFaceData = extractFaceFeatures(ctx, canvas);
    let bestMatch = { isAuthorized: false, matchedUser: "", confidence: 0 };
    
    for (const user of authorizedUsers) {
      if (user.image_url) {
        try {
          const similarity = await compareFaceWithUser(currentFaceData, user.image_url);
          const confidence = Math.round(similarity * 100);
          
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              isAuthorized: confidence > 65, // Slightly lowered threshold
              matchedUser: user.name,
              confidence: confidence
            };
          }
        } catch (error) {
          console.error(`Error comparing with ${user.name}:`, error);
        }
      }
    }
    
    return bestMatch.isAuthorized ? bestMatch : { isAuthorized: false, matchedUser: "", confidence: Math.max(25, bestMatch.confidence) };
  };

  // Extract face features
  const extractFaceFeatures = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): ImageData => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = Math.min(canvas.width, canvas.height) * 0.4;
    return ctx.getImageData(centerX - size/2, centerY - size/2, size, size);
  };

  // Compare with user image
  const compareFaceWithUser = async (currentFaceData: ImageData, userImageUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(0);
          return;
        }
        
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);
        
        const userImageData = ctx.getImageData(0, 0, 100, 100);
        const similarity = calculateImageSimilarity(currentFaceData, userImageData);
        resolve(similarity);
      };
      img.onerror = () => resolve(0);
      img.src = userImageUrl;
    });
  };

  // Calculate image similarity
  const calculateImageSimilarity = (imageData1: ImageData, imageData2: ImageData): number => {
    const data1 = imageData1.data;
    const data2 = imageData2.data;
    
    const minLength = Math.min(data1.length, data2.length);
    let totalDiff = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < minLength; i += 12) { // Sample every 3rd pixel
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
      
      const diff = Math.sqrt(
        Math.pow(r1 - r2, 2) + 
        Math.pow(g1 - g2, 2) + 
        Math.pow(b1 - b2, 2)
      ) / (255 * Math.sqrt(3));
      
      totalDiff += diff;
      pixelCount++;
    }
    
    const avgDiff = totalDiff / pixelCount;
    return Math.max(0, 1 - avgDiff);
  };

  // Draw face overlay
  const drawFaceOverlay = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, isAuthorized: boolean, person: string, confidence: number, bounds?: { x: number; y: number; width: number; height: number }) => {
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
    
    // Draw corners
    const cornerSize = 20;
    ctx.lineWidth = 6;
    
    // Top-left
    ctx.beginPath();
    ctx.moveTo(bounds.x, bounds.y + cornerSize);
    ctx.lineTo(bounds.x, bounds.y);
    ctx.lineTo(bounds.x + cornerSize, bounds.y);
    ctx.stroke();
    
    // Top-right
    ctx.beginPath();
    ctx.moveTo(bounds.x + bounds.width - cornerSize, bounds.y);
    ctx.lineTo(bounds.x + bounds.width, bounds.y);
    ctx.lineTo(bounds.x + bounds.width, bounds.y + cornerSize);
    ctx.stroke();
    
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(bounds.x, bounds.y + bounds.height - cornerSize);
    ctx.lineTo(bounds.x, bounds.y + bounds.height);
    ctx.lineTo(bounds.x + cornerSize, bounds.y + bounds.height);
    ctx.stroke();
    
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(bounds.x + bounds.width - cornerSize, bounds.y + bounds.height);
    ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height);
    ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height - cornerSize);
    ctx.stroke();
    
    // Label background
    const labelHeight = 60;
    const labelY = Math.max(bounds.y - labelHeight - 10, 10);
    ctx.fillStyle = isAuthorized ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    ctx.fillRect(bounds.x, labelY, bounds.width, labelHeight);
    
    // Label text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${isMobile ? '16' : '20'}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(person, bounds.x + bounds.width/2, labelY + 25);
    
    ctx.font = `${isMobile ? '14' : '16'}px Arial`;
    const statusText = `${confidence}% ${isAuthorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}`;
    ctx.fillText(statusText, bounds.x + bounds.width/2, labelY + 45);
    
    // Status indicator
    ctx.beginPath();
    ctx.arc(bounds.x + bounds.width - 20, bounds.y + 20, 15, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Check or X mark
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    if (isAuthorized) {
      ctx.beginPath();
      ctx.moveTo(bounds.x + bounds.width - 28, bounds.y + 20);
      ctx.lineTo(bounds.x + bounds.width - 20, bounds.y + 28);
      ctx.lineTo(bounds.x + bounds.width - 12, bounds.y + 12);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(bounds.x + bounds.width - 28, bounds.y + 12);
      ctx.lineTo(bounds.x + bounds.width - 12, bounds.y + 28);
      ctx.moveTo(bounds.x + bounds.width - 28, bounds.y + 28);
      ctx.lineTo(bounds.x + bounds.width - 12, bounds.y + 12);
      ctx.stroke();
    }
  };

  // Switch camera
  const switchCamera = async () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex(cam => cam.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      setSelectedCameraId(availableCameras[nextIndex].deviceId);
      toast.info(`Switching to camera: ${availableCameras[nextIndex].label || 'Camera ' + (nextIndex + 1)}`);
    } else {
      setCameraMode(prev => prev === 'user' ? 'environment' : 'user');
      toast.info(`Switching to ${cameraMode === 'user' ? 'back' : 'front'} camera`);
    }
    
    if (recognitionActive) {
      await startCamera();
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      toast.success('Photo selected successfully');
    } else {
      toast.error('Please select a valid image file');
    }
  };

  // Handle adding new user
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

  // Initialize on mount
  useEffect(() => {
    initializeCameras();
    
    return () => {
      stopCamera();
    };
  }, []);

  // Get status display
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

  // Get recent detections
  const recentDetections = alerts.slice(0, 5).map(alert => ({
    time: new Date(alert.created_at).toLocaleTimeString(),
    person: alert.detected_person || "Unknown",
    confidence: alert.confidence_score || 0,
    status: alert.detected_person && alert.detected_person !== "Unknown Person" ? "authorized" : "blocked",
    type: alert.alert_type
  }));

  return (
    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-4 lg:gap-6`}>
      {/* Camera Feed */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-sm">
                <Camera className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent`}>
                  AI Face Recognition
                </h3>
                <p className="text-slate-400 text-sm">Advanced biometric security system</p>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge 
                variant={recognitionActive ? "default" : "secondary"} 
                className={recognitionActive ? "bg-green-500/20 text-green-400 border-green-500/30 animate-pulse" : ""}
              >
                {recognitionActive ? "🔴 LIVE" : "⚪ Offline"}
              </Badge>
              {recognitionActive && (
                <div className={`flex items-center space-x-2 ${statusDisplay.color} px-3 py-1 rounded-full shadow-lg`}>
                  <StatusIcon className="h-4 w-4 text-white animate-pulse" />
                  <span className="text-white text-xs font-medium">{statusDisplay.text}</span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`${isMobile ? 'aspect-[4/3]' : 'aspect-video'} bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl relative overflow-hidden border-2 border-slate-600 shadow-inner`}>
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
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center p-6">
                  <div className="p-4 bg-slate-600/50 rounded-full w-fit mx-auto mb-4 backdrop-blur-sm">
                    <Camera className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} text-slate-400`} />
                  </div>
                  <h3 className="text-slate-300 text-lg font-semibold mb-2">Camera System Ready</h3>
                  <p className="text-slate-400 text-sm">Click "Start Camera" to begin face recognition</p>
                  {!cameraSupported && (
                    <p className="text-red-400 text-xs mt-2">Camera not supported on this device</p>
                  )}
                </div>
              </div>
            )}
            
            {recognitionActive && (
              <>
                <div className="absolute top-4 left-4">
                  <div className="flex items-center space-x-2 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-green-500/30 shadow-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-medium">LIVE DETECTION</span>
                  </div>
                </div>
                
                <div className="absolute top-4 right-4">
                  <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-blue-500/30 shadow-lg">
                    <span className="text-blue-400 text-sm font-medium">
                      Detections: {detectionCount}
                    </span>
                  </div>
                </div>
                
                {debugInfo && (
                  <div className="absolute top-16 left-4 right-4">
                    <div className="bg-black/90 backdrop-blur-sm text-yellow-400 px-3 py-2 rounded-lg border border-yellow-500/30 text-sm shadow-lg">
                      🤖 {debugInfo}
                    </div>
                  </div>
                )}
                
                {lastDetection && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg border border-white/30 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">🎯 Detection Result:</span>
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
            <Alert className="border-red-500 bg-red-500/10 backdrop-blur-sm">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
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
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/25' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-blue-500/25'
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
              className="w-full py-3 bg-slate-700/50 border-slate-600 hover:bg-slate-700 shadow-lg"
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

          <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-lg backdrop-blur-sm border border-slate-600/50">
            <div className="text-center">
              <div className="text-slate-400 text-sm">👥 Authorized</div>
              <div className="text-2xl font-bold text-green-400">{authorizedUsers.length}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-sm">🚨 Alerts</div>
              <div className="text-2xl font-bold text-red-400">{alerts.length}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-sm">🎯 Detections</div>
              <div className="text-xl font-bold text-blue-400">{detectionCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authorized Users Management */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/20 rounded-lg backdrop-blur-sm">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent`}>
                  Authorized Users
                </h3>
                <p className="text-slate-400 text-sm">{authorizedUsers.length} registered faces</p>
              </div>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30 shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 w-[95vw] max-w-md backdrop-blur-sm">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-400" />
                    <span>Add Authorized User</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-white font-medium">Full Name *</Label>
                    <Input
                      id="name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Enter user's full name"
                      className="bg-slate-700 border-slate-600 text-white mt-2 shadow-inner"
                    />
                  </div>
                  <div>
                    <Label htmlFor="photo" className="text-white font-medium">Profile Photo *</Label>
                    <div className="space-y-3 mt-2">
                      <Input
                        ref={fileInputRef}
                        id="photo"
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFileSelect}
                        className="bg-slate-700 border-slate-600 text-white shadow-inner"
                      />
                      {selectedFile && (
                        <div className="flex items-center space-x-2 p-3 bg-green-500/20 rounded-lg border border-green-500/30 backdrop-blur-sm">
                          <Upload className="h-4 w-4 text-green-400" />
                          <div className="flex-1">
                            <p className="text-green-400 text-sm font-medium">{selectedFile.name}</p>
                            <p className="text-green-300 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddUser} 
                    disabled={!newUserName.trim() || !selectedFile || loading}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 py-3 shadow-lg"
                    size="lg"
                  >
                    {loading ? "Adding User..." : "Add Authorized User"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-3 ${isMobile ? 'max-h-60' : 'max-h-80'} overflow-y-auto custom-scrollbar`}>
          {authorizedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-lg border border-slate-600/50 hover:from-slate-700/70 hover:to-slate-600/70 transition-all duration-300 shadow-lg backdrop-blur-sm">
              <div className="flex items-center space-x-4">
                {user.image_url ? (
                  <img 
                    src={user.image_url} 
                    alt={user.name}
                    className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} rounded-full object-cover border-2 border-green-500 shadow-lg ring-2 ring-green-500/30`}
                  />
                ) : (
                  <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg ring-2 ring-blue-500/30`}>
                    <span className="text-white font-bold text-lg">{user.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <div className={`font-semibold text-white ${isMobile ? 'text-sm' : 'text-base'}`}>{user.name}</div>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400`}>
                    Added: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Badge 
                variant={user.is_active ? "default" : "secondary"} 
                className={`${isMobile ? 'text-xs' : 'text-sm'} ${
                  user.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30 shadow-lg' : 'bg-slate-600/50 text-slate-400'
                }`}
              >
                {user.is_active ? "🟢 Active" : "⚪ Inactive"}
              </Badge>
            </div>
          ))}
          {authorizedUsers.length === 0 && (
            <div className="text-center py-8">
              <div className="p-4 bg-slate-600/30 rounded-full w-fit mx-auto mb-4 backdrop-blur-sm">
                <Users className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-slate-500`} />
              </div>
              <h3 className="text-slate-400 font-semibold mb-2">No Authorized Users</h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>Add users to enable face recognition</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detection Log */}
      <Card className={`bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-2xl ${!isMobile ? 'lg:col-span-2' : ''}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-3 text-white">
            <div className="p-2 bg-yellow-500/20 rounded-lg backdrop-blur-sm">
              <Eye className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent`}>
                Detection Log
              </h3>
              <p className="text-slate-400 text-sm">Real-time face recognition events</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentDetections.map((detection, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-lg border border-slate-600/50 hover:from-slate-700/70 hover:to-slate-600/70 transition-all duration-300 shadow-lg backdrop-blur-sm">
                <div className="flex items-center space-x-4">
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 font-mono bg-slate-600/50 px-2 py-1 rounded shadow-inner`}>
                    ⏰ {detection.time}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                      {detection.status === "authorized" ? "✅" : "❌"} {detection.person}
                    </div>
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>
                      📋 {detection.type}
                    </div>
                  </div>
                  {detection.confidence > 0 && (
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 bg-slate-600/50 px-2 py-1 rounded shadow-inner font-mono`}>
                      {detection.confidence}%
                    </div>
                  )}
                </div>
                <Badge 
                  variant={detection.status === "authorized" ? "default" : "destructive"}
                  className={`${isMobile ? 'text-xs' : 'text-sm'} ${
                    detection.status === "authorized" 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30 shadow-lg' 
                      : 'bg-red-500/20 text-red-400 border-red-500/30 shadow-lg'
                  }`}
                >
                  {detection.status === "authorized" ? "🔓 AUTHORIZED" : "🔒 BLOCKED"}
                </Badge>
              </div>
            ))}
            {recentDetections.length === 0 && (
              <div className="text-center py-8">
                <div className="p-4 bg-slate-600/30 rounded-full w-fit mx-auto mb-4 backdrop-blur-sm">
                  <Eye className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-slate-500`} />
                </div>
                <h3 className="text-slate-400 font-semibold mb-2">No Detections Yet</h3>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>Start camera to begin monitoring</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceRecognition;
