import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Users, Plus, Eye, EyeOff, Upload, AlertTriangle, Smartphone, Monitor, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [debugInfo, setDebugInfo] = useState<string>('');
  
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

  // Get available cameras
  const getAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting cameras:', error);
    }
  };

  // Start camera with enhanced constraints for better face detection
  const startCamera = async () => {
    try {
      setCameraError(null);
      setDetectionStatus('scanning');
      setDebugInfo('Starting camera...');
      
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
          facingMode: isMobile ? cameraMode : undefined,
          width: { 
            ideal: isMobile ? 640 : 1280,
            min: 320,
            max: 1920
          },
          height: { 
            ideal: isMobile ? 480 : 720,
            min: 240,
            max: 1080
          },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false
      };

      console.log('Starting camera with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Camera loaded successfully');
          setRecognitionActive(true);
          setDebugInfo('Camera ready, starting detection...');
          startFaceDetection();
        };
        
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setCameraError('Camera access denied. Please allow camera permissions and try again.');
        } else if (error.name === 'NotFoundError') {
          setCameraError('No camera found. Please connect a camera and try again.');
        } else if (error.name === 'NotReadableError') {
          setCameraError('Camera is already in use by another application.');
        } else {
          setCameraError(`Camera error: ${error.message}`);
        }
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
    stopFaceDetection();
  };

  // Enhanced face detection with improved algorithms
  const startFaceDetection = () => {
    console.log('Starting face detection');
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(() => {
      if (recognitionActive && videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        detectAndAnalyzeFace();
      }
    }, 1000); // Check every second for better responsiveness
  };

  // Stop face detection
  const stopFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  // Enhanced face detection and analysis with much better algorithm
  const detectAndAnalyzeFace = async () => {
    if (detectionInProgress || !videoRef.current || !canvasRef.current) return;
    
    setDetectionInProgress(true);
    setDebugInfo('Analyzing frame...');
    
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
      
      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0);
      
      // More sensitive face detection
      const faceDetected = await simulateAdvancedFaceDetection(ctx, canvas);
      
      if (faceDetected) {
        console.log('Face detected, analyzing...');
        setDetectionCount(prev => prev + 1);
        setDebugInfo(`Face detected! Analyzing... (${detectionCount + 1} detections)`);
        
        // Analyze if face is authorized
        const authResult = await analyzeFaceAuthorization(ctx, canvas);
        
        if (authResult.isAuthorized) {
          setDetectionStatus('authorized');
          setLastDetection(`${authResult.matchedUser} - Authorized (${authResult.confidence}%)`);
          setDebugInfo(`AUTHORIZED: ${authResult.matchedUser} (${authResult.confidence}%)`);
          
          console.log('Authorized access detected:', authResult.matchedUser);
          
          // Create authorized access log
          await createAlert({
            alert_type: "Authorized Access",
            severity: "low" as const,
            details: `Access granted to ${authResult.matchedUser} - confidence: ${authResult.confidence}%`,
            detected_person: authResult.matchedUser,
            source_device: `${isMobile ? 'Mobile' : 'Desktop'} Camera - Face Recognition System`,
            confidence_score: authResult.confidence
          });
          
          // Draw authorized overlay
          drawAuthorizationOverlay(ctx, canvas, true, authResult.matchedUser, authResult.confidence);
        } else {
          setDetectionStatus('unauthorized');
          setLastDetection(`Unknown Person - Unauthorized (${authResult.confidence}%)`);
          setDebugInfo(`UNAUTHORIZED: Unknown person (${authResult.confidence}%)`);
          
          console.log('Unauthorized access detected');
          
          // Create unauthorized alert
          await createAlert({
            alert_type: "Unauthorized Face Detected",
            severity: "high" as const,
            details: `Unknown face detected - confidence: ${authResult.confidence}% - immediate attention required`,
            detected_person: "Unknown Person",
            source_device: `${isMobile ? 'Mobile' : 'Desktop'} Camera - Face Recognition System`,
            confidence_score: authResult.confidence
          });

          // Send alerts to ESP32 and receivers
          console.log('Sending unauthorized access alerts...');
          
          const alertData = {
            type: "unauthorized_face",
            severity: "high",
            message: "Unknown face detected at main entrance",
            timestamp: new Date().toISOString(),
            confidence: authResult.confidence
          };

          // Send to ESP32
          try {
            await sendAlertToESP32("192.168.1.100", alertData);
          } catch (error) {
            console.log('ESP32 not available:', error);
          }

          // Send to alert receivers
          try {
            await sendAlertToReceivers(alertData);
          } catch (error) {
            console.log('Alert receivers not available:', error);
          }
          
          // Draw unauthorized overlay
          drawAuthorizationOverlay(ctx, canvas, false, "Unknown Person", authResult.confidence);
        }
      } else {
        setDetectionStatus('no-face');
        setLastDetection(null);
        setDebugInfo('Scanning for faces...');
        
        // Clear canvas overlay
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0);
      }
    } catch (error) {
      console.error('Error in face detection:', error);
      setDebugInfo(`Detection error: ${error}`);
    } finally {
      setDetectionInProgress(false);
    }
  };

  // Much more sensitive face detection algorithm
  const simulateAdvancedFaceDetection = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): Promise<boolean> => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    console.log(`Analyzing ${width}x${height} frame`);
    
    // Multi-region face detection
    let totalFaceScore = 0;
    let skinTonePixels = 0;
    let faceRegions = 0;
    
    // Check multiple regions for faces
    const regions = [
      { x: width * 0.2, y: height * 0.1, w: width * 0.6, h: height * 0.8 }, // Center region
      { x: width * 0.1, y: height * 0.1, w: width * 0.4, h: height * 0.6 }, // Left region  
      { x: width * 0.5, y: height * 0.1, w: width * 0.4, h: height * 0.6 }, // Right region
    ];
    
    for (const region of regions) {
      let regionFaceScore = 0;
      let regionSkinPixels = 0;
      
      // Sample pixels in this region
      for (let y = region.y; y < region.y + region.h; y += 3) {
        for (let x = region.x; x < region.x + region.w; x += 3) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const index = (Math.floor(y) * width + Math.floor(x)) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // Enhanced skin tone detection
            const isSkinTone = (
              r > 80 && g > 40 && b > 20 && // Basic color range
              r > g && r > b && // Red dominance
              Math.abs(r - g) > 10 && // Color separation
              (r + g + b) > 200 && // Sufficient brightness
              (r + g + b) < 600 // Not too bright
            );
            
            if (isSkinTone) {
              regionSkinPixels++;
              regionFaceScore += 3;
            }
            
            // Check for facial features (lighter areas for eyes, darker for eyebrows)
            const brightness = (r + g + b) / 3;
            if (brightness > 120 && brightness < 200) {
              regionFaceScore += 1;
            }
            
            // Check for contrast patterns typical in faces
            if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
              regionFaceScore += 1;
            }
          }
        }
      }
      
      console.log(`Region ${faceRegions}: skin pixels: ${regionSkinPixels}, score: ${regionFaceScore}`);
      
      // This region has face-like characteristics
      if (regionSkinPixels > 20 && regionFaceScore > 100) {
        faceRegions++;
        totalFaceScore += regionFaceScore;
        skinTonePixels += regionSkinPixels;
      }
    }
    
    // Face detected if at least one region shows strong face characteristics
    const hasFace = faceRegions > 0 && skinTonePixels > 50 && totalFaceScore > 200;
    
    console.log(`Face detection result: regions=${faceRegions}, skin=${skinTonePixels}, score=${totalFaceScore}, detected=${hasFace}`);
    
    return hasFace;
  };

  // Analyze face for authorization
  const analyzeFaceAuthorization = async (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): Promise<{
    isAuthorized: boolean;
    matchedUser: string;
    confidence: number;
  }> => {
    // If no authorized users, always unauthorized
    if (authorizedUsers.length === 0) {
      return { isAuthorized: false, matchedUser: "", confidence: 25 };
    }

    // Extract face features from current frame
    const currentFaceData = extractFaceFeatures(ctx, canvas);
    
    let bestMatch = { isAuthorized: false, matchedUser: "", confidence: 0 };
    
    // Compare with authorized users
    for (const user of authorizedUsers) {
      if (user.image_url) {
        try {
          const similarity = await compareFaceWithUser(currentFaceData, user.image_url);
          const confidence = Math.round(similarity * 100);
          
          console.log(`Comparing with ${user.name}: ${confidence}% similarity`);
          
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              isAuthorized: confidence > 70, // 70% threshold for authorization
              matchedUser: user.name,
              confidence: confidence
            };
          }
        } catch (error) {
          console.error(`Error comparing with ${user.name}:`, error);
        }
      }
    }
    
    // If no good match found, return unauthorized
    if (!bestMatch.isAuthorized) {
      return { isAuthorized: false, matchedUser: "", confidence: Math.max(30, bestMatch.confidence) };
    }
    
    return bestMatch;
  };

  // Extract face features from current frame
  const extractFaceFeatures = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): ImageData => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = Math.min(canvas.width, canvas.height) * 0.3;
    return ctx.getImageData(centerX - size/2, centerY - size/2, size, size);
  };

  // Compare current face with authorized user image
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

  // Calculate similarity between two images
  const calculateImageSimilarity = (imageData1: ImageData, imageData2: ImageData): number => {
    const data1 = imageData1.data;
    const data2 = imageData2.data;
    
    // Normalize sizes
    const minLength = Math.min(data1.length, data2.length);
    let totalDiff = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < minLength; i += 16) { // Sample every 4th pixel for performance
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
      
      // Calculate color difference
      const diff = Math.sqrt(
        Math.pow(r1 - r2, 2) + 
        Math.pow(g1 - g2, 2) + 
        Math.pow(b1 - b2, 2)
      ) / (255 * Math.sqrt(3));
      
      totalDiff += diff;
      pixelCount++;
    }
    
    const avgDiff = totalDiff / pixelCount;
    return Math.max(0, 1 - avgDiff); // Convert to similarity score
  };

  // Draw authorization overlay
  const drawAuthorizationOverlay = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, isAuthorized: boolean, person: string, confidence: number) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = Math.min(canvas.width, canvas.height) * 0.5; // Larger detection box
    const x = centerX - size/2;
    const y = centerY - size/2;
    
    // Draw bounding box with thicker lines
    ctx.strokeStyle = isAuthorized ? '#10B981' : '#EF4444';
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, size, size);
    
    // Draw corner indicators
    const cornerSize = 30;
    ctx.lineWidth = 8;
    
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + cornerSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerSize, y);
    ctx.stroke();
    
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + size - cornerSize, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size, y + cornerSize);
    ctx.stroke();
    
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + size - cornerSize);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x + cornerSize, y + size);
    ctx.stroke();
    
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + size - cornerSize, y + size);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x + size, y + size - cornerSize);
    ctx.stroke();
    
    // Draw label with better visibility
    const labelHeight = 80;
    const labelY = Math.max(y - labelHeight - 10, 10);
    ctx.fillStyle = isAuthorized ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)';
    ctx.fillRect(x, labelY, size, labelHeight);
    
    // Label text with better contrast
    ctx.fillStyle = 'white';
    ctx.font = `bold ${isMobile ? '20' : '28'}px Arial`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeText(person, x + size/2, labelY + 30);
    ctx.fillText(person, x + size/2, labelY + 30);
    
    ctx.font = `${isMobile ? '18' : '24'}px Arial`;
    const statusText = `${confidence}% ${isAuthorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}`;
    ctx.strokeText(statusText, x + size/2, labelY + 60);
    ctx.fillText(statusText, x + size/2, labelY + 60);
    
    // Status indicator with animation
    ctx.beginPath();
    ctx.arc(x + size - 35, y + 35, 20, 0, 2 * Math.PI);
    ctx.fillStyle = isAuthorized ? '#10B981' : '#EF4444';
    ctx.fill();
    
    // Check or X mark
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    if (isAuthorized) {
      ctx.beginPath();
      ctx.moveTo(x + size - 45, y + 35);
      ctx.lineTo(x + size - 35, y + 45);
      ctx.lineTo(x + size - 25, y + 25);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + size - 45, y + 25);
      ctx.lineTo(x + size - 25, y + 45);
      ctx.moveTo(x + size - 45, y + 45);
      ctx.lineTo(x + size - 25, y + 25);
      ctx.stroke();
    }
  };

  // Switch camera
  const switchCamera = async () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex(cam => cam.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      setSelectedCameraId(availableCameras[nextIndex].deviceId);
    } else {
      setCameraMode(prev => prev === 'user' ? 'environment' : 'user');
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
    }
  };

  // Handle adding new user
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

  // Initialize cameras
  useEffect(() => {
    getAvailableCameras();
    
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
        return { color: 'bg-yellow-500', icon: Eye, text: 'NO FACE DETECTED' };
      default:
        return { color: 'bg-blue-500', icon: Camera, text: 'SCANNING...' };
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
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Camera className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>Live Face Recognition</h3>
                <p className="text-slate-400 text-sm">Real-time biometric security</p>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge variant={recognitionActive ? "default" : "secondary"}>
                {recognitionActive ? "Active" : "Inactive"}
              </Badge>
              {recognitionActive && (
                <div className={`flex items-center space-x-2 ${statusDisplay.color} px-3 py-1 rounded-full`}>
                  <StatusIcon className="h-4 w-4 text-white" />
                  <span className="text-white text-xs font-medium">{statusDisplay.text}</span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`${isMobile ? 'aspect-[4/3]' : 'aspect-video'} bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl relative overflow-hidden border-2 border-slate-600`}>
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
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="p-4 bg-slate-600/50 rounded-full w-fit mx-auto mb-4">
                    <Camera className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} text-slate-400`} />
                  </div>
                  <h3 className="text-slate-300 text-lg font-semibold mb-2">Camera Offline</h3>
                  <p className="text-slate-400 text-sm">Start camera to begin face recognition</p>
                </div>
              </div>
            )}
            
            {recognitionActive && (
              <>
                <div className="absolute top-4 left-4">
                  <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-medium">LIVE</span>
                  </div>
                </div>
                
                <div className="absolute top-4 right-4">
                  <div className="bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
                    <span className="text-white text-sm">
                      Detections: {detectionCount}
                    </span>
                  </div>
                </div>
                
                {/* Debug info */}
                {debugInfo && (
                  <div className="absolute top-16 left-4 right-4">
                    <div className="bg-black/80 backdrop-blur-sm text-yellow-400 px-3 py-2 rounded-lg border border-yellow-500/20 text-sm">
                      {debugInfo}
                    </div>
                  </div>
                )}
                
                {isMobile && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute bottom-4 right-4 bg-black/70 border-white/20 text-white hover:bg-black/80"
                    onClick={switchCamera}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Switch
                  </Button>
                )}
                
                {lastDetection && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/80 backdrop-blur-sm text-white px-4 py-3 rounded-lg border border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Last Detection:</span>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <p className="text-sm mt-1">{lastDetection}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {cameraError && (
            <Alert className="border-red-500 bg-red-500/10">
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
              className="w-full py-3 font-semibold"
              size="lg"
            >
              {recognitionActive ? <EyeOff className="h-5 w-5 mr-2" /> : <Eye className="h-5 w-5 mr-2" />}
              {recognitionActive ? "Stop Camera" : "Start Camera"}
            </Button>
            {isMobile && (
              <Button 
                variant="outline" 
                onClick={switchCamera}
                disabled={!recognitionActive}
                className="w-full py-3"
                size="lg"
              >
                <Camera className="h-5 w-5 mr-2" />
                Switch Camera
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-700/50 rounded-lg">
            <div className="text-center">
              <div className="text-slate-400 text-sm">Authorized</div>
              <div className="text-2xl font-bold text-green-400">{authorizedUsers.length}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-sm">Total Alerts</div>
              <div className="text-2xl font-bold text-red-400">{alerts.length}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-sm">Detections</div>
              <div className="text-xl font-bold text-blue-400">{detectionCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authorized Users Management */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>Authorized Users</h3>
                <p className="text-slate-400 text-sm">{authorizedUsers.length} registered faces</p>
              </div>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 w-[95vw] max-w-md">
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
                      className="bg-slate-700 border-slate-600 text-white mt-2"
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
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      {selectedFile && (
                        <div className="flex items-center space-x-2 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
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
                    className="w-full bg-green-600 hover:bg-green-700 py-3"
                    size="lg"
                  >
                    {loading ? "Adding User..." : "Add Authorized User"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-3 ${isMobile ? 'max-h-60' : 'max-h-80'} overflow-y-auto`}>
          {authorizedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:bg-slate-700/70 transition-colors">
              <div className="flex items-center space-x-4">
                {user.image_url ? (
                  <img 
                    src={user.image_url} 
                    alt={user.name}
                    className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} rounded-full object-cover border-2 border-green-500 shadow-lg`}
                  />
                ) : (
                  <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg`}>
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
                  user.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''
                }`}
              >
                {user.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          ))}
          {authorizedUsers.length === 0 && (
            <div className="text-center py-8">
              <div className="p-4 bg-slate-600/30 rounded-full w-fit mx-auto mb-4">
                <Users className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} text-slate-500`} />
              </div>
              <h3 className="text-slate-400 font-semibold mb-2">No Authorized Users</h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>Add users to enable face recognition</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detection Log */}
      <Card className={`bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 ${!isMobile ? 'lg:col-span-2' : ''}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-3 text-white">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Eye className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>Detection Log</h3>
              <p className="text-slate-400 text-sm">Real-time face recognition events</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentDetections.map((detection, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-4">
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 font-mono bg-slate-600/50 px-2 py-1 rounded`}>
                    {detection.time}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold text-white ${isMobile ? 'text-sm' : 'text-base'}`}>
                      {detection.person}
                    </div>
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500`}>
                      {detection.type}
                    </div>
                  </div>
                  {detection.confidence > 0 && (
                    <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 bg-slate-600/50 px-2 py-1 rounded`}>
                      {detection.confidence}%
                    </div>
                  )}
                </div>
                <Badge 
                  variant={detection.status === "authorized" ? "default" : "destructive"}
                  className={`${isMobile ? 'text-xs' : 'text-sm'} ${
                    detection.status === "authorized" 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}
                >
                  {detection.status.toUpperCase()}
                </Badge>
              </div>
            ))}
            {recentDetections.length === 0 && (
              <div className="text-center py-8">
                <div className="p-4 bg-slate-600/30 rounded-full w-fit mx-auto mb-4">
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
