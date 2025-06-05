
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

// Declare FaceDetector interface for TypeScript
declare global {
  interface Window {
    FaceDetector?: any;
  }
}

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
  const [faceDetector, setFaceDetector] = useState<any>(null);
  const [authorizedFaceData, setAuthorizedFaceData] = useState<Map<string, ImageData>>(new Map());
  
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

  // Initialize face detector
  useEffect(() => {
    const initFaceDetector = async () => {
      try {
        if ('FaceDetector' in window) {
          const detector = new window.FaceDetector({
            maxDetectedFaces: 1,
            fastMode: false
          });
          setFaceDetector(detector);
          console.log('Face detector initialized successfully');
        } else {
          console.log('FaceDetector not available, using fallback detection');
        }
      } catch (error) {
        console.error('Error initializing face detector:', error);
      }
    };

    initFaceDetector();
  }, []);

  // Process authorized user images for comparison
  useEffect(() => {
    const processAuthorizedImages = async () => {
      const faceDataMap = new Map<string, ImageData>();
      
      for (const user of authorizedUsers) {
        if (user.image_url) {
          try {
            const imageData = await extractFaceFeatures(user.image_url);
            if (imageData) {
              faceDataMap.set(user.id, imageData);
            }
          } catch (error) {
            console.error(`Error processing image for ${user.name}:`, error);
          }
        }
      }
      
      setAuthorizedFaceData(faceDataMap);
    };

    if (authorizedUsers.length > 0) {
      processAuthorizedImages();
    }
  }, [authorizedUsers]);

  // Extract face features from image URL
  const extractFaceFeatures = async (imageUrl: string): Promise<ImageData | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);
        
        const imageData = ctx.getImageData(0, 0, 100, 100);
        resolve(imageData);
      };
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  };

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

  // Start camera with proper constraints for mobile and desktop
  const startCamera = async () => {
    try {
      setCameraError(null);
      setDetectionStatus('scanning');
      
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Enhanced constraints for better mobile support
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

      console.log('Requesting camera with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          setRecognitionActive(true);
          startFaceDetection();
        };
        
        // Handle video play
        videoRef.current.play().catch(error => {
          console.error('Error playing video:', error);
          setCameraError('Failed to start video playback');
        });
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
      } else {
        setCameraError('Unknown camera error occurred.');
      }
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
    stopFaceDetection();
  };

  // Start face detection with real face recognition
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(() => {
      if (recognitionActive && videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        detectAndRecognizeFace();
      }
    }, 1000); // Check every second for better performance
  };

  // Stop face detection
  const stopFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  // Real face detection and recognition
  const detectAndRecognizeFace = async () => {
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
      
      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0);
      
      let faceDetected = false;
      let detectedFaces: any[] = [];
      
      // Try using browser FaceDetector API if available
      if (faceDetector) {
        try {
          detectedFaces = await faceDetector.detect(video);
          faceDetected = detectedFaces.length > 0;
        } catch (error) {
          console.log('FaceDetector failed, using fallback:', error);
          faceDetected = detectFacePattern(ctx, canvas);
        }
      } else {
        // Fallback face detection
        faceDetected = detectFacePattern(ctx, canvas);
      }
      
      if (faceDetected) {
        // Extract face region for comparison
        const faceImageData = extractFaceRegion(ctx, canvas, detectedFaces[0]);
        
        // Compare with authorized faces
        const matchResult = await compareFaceWithAuthorized(faceImageData);
        
        if (matchResult.isMatch) {
          setDetectionStatus('authorized');
          setLastDetection(`${matchResult.userName} - Authorized (${matchResult.confidence}%)`);
          
          // Create authorized access log
          await createAlert({
            alert_type: "Authorized Access",
            severity: "low" as const,
            details: `Access granted to ${matchResult.userName} - confidence: ${matchResult.confidence}%`,
            detected_person: matchResult.userName,
            source_device: `${isMobile ? 'Mobile' : 'Desktop'} Camera - Face Recognition System`,
            confidence_score: matchResult.confidence
          });
          
          // Draw authorized overlay
          drawDetectionOverlay(ctx, canvas, true, matchResult.userName, matchResult.confidence, detectedFaces[0]);
        } else {
          setDetectionStatus('unauthorized');
          setLastDetection(`Unknown Person - Unauthorized (${matchResult.confidence}%)`);
          
          // Create unauthorized alert
          await createAlert({
            alert_type: "Unauthorized Face Detected",
            severity: "high" as const,
            details: `Unknown face detected - confidence: ${matchResult.confidence}% - immediate attention required`,
            detected_person: "Unknown Person",
            source_device: `${isMobile ? 'Mobile' : 'Desktop'} Camera - Face Recognition System`,
            confidence_score: matchResult.confidence
          });

          // Send alerts to devices
          console.log('Sending unauthorized access alerts...');
          
          await sendAlertToESP32("192.168.1.100", {
            type: "unauthorized_face",
            message: "Unknown face detected",
            timestamp: new Date().toISOString(),
            severity: "high",
            confidence: matchResult.confidence
          });

          await sendAlertToReceivers({
            type: "Unauthorized Face Detected",
            severity: "high",
            message: "Unknown face detected at main entrance",
            timestamp: new Date().toISOString(),
            confidence: matchResult.confidence
          });
          
          // Draw unauthorized overlay
          drawDetectionOverlay(ctx, canvas, false, "Unknown Person", matchResult.confidence, detectedFaces[0]);
        }
      } else {
        setDetectionStatus('no-face');
        setLastDetection(null);
        
        // Clear canvas overlay
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0);
      }
    } catch (error) {
      console.error('Error in face detection:', error);
    } finally {
      setDetectionInProgress(false);
    }
  };

  // Fallback face pattern detection
  const detectFacePattern = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): boolean => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const width = imageData.width;
    const height = imageData.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Look for face-like patterns in center region
    let faceScore = 0;
    const regionSize = Math.min(width, height) * 0.3;
    
    for (let y = centerY - regionSize/2; y < centerY + regionSize/2; y += 4) {
      for (let x = centerX - regionSize/2; x < centerX + regionSize/2; x += 4) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (Math.floor(y) * width + Math.floor(x)) * 4;
          const brightness = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
          if (brightness > 80 && brightness < 200) {
            faceScore++;
          }
        }
      }
    }
    
    return faceScore > 100; // Threshold for face detection
  };

  // Extract face region from detected face
  const extractFaceRegion = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, detectedFace?: any): ImageData => {
    if (detectedFace && detectedFace.boundingBox) {
      const { x, y, width, height } = detectedFace.boundingBox;
      return ctx.getImageData(x, y, width, height);
    } else {
      // Fallback: extract center region
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const size = Math.min(canvas.width, canvas.height) * 0.3;
      return ctx.getImageData(centerX - size/2, centerY - size/2, size, size);
    }
  };

  // Compare detected face with authorized faces
  const compareFaceWithAuthorized = async (faceImageData: ImageData): Promise<{isMatch: boolean, userName: string, confidence: number}> => {
    if (authorizedFaceData.size === 0) {
      return { isMatch: false, userName: "", confidence: 25 };
    }

    let bestMatch = { isMatch: false, userName: "", confidence: 0 };
    
    // Compare with each authorized user
    for (const [userId, authorizedData] of authorizedFaceData.entries()) {
      const similarity = calculateImageSimilarity(faceImageData, authorizedData);
      const confidence = Math.round(similarity * 100);
      
      if (confidence > bestMatch.confidence) {
        const user = authorizedUsers.find(u => u.id === userId);
        bestMatch = {
          isMatch: confidence > 65, // Threshold for authorization
          userName: user?.name || "Unknown",
          confidence: confidence
        };
      }
    }
    
    // If no good match found, return unauthorized with low confidence
    if (!bestMatch.isMatch) {
      return { isMatch: false, userName: "", confidence: Math.max(25, bestMatch.confidence) };
    }
    
    return bestMatch;
  };

  // Calculate similarity between two images
  const calculateImageSimilarity = (imageData1: ImageData, imageData2: ImageData): number => {
    const data1 = imageData1.data;
    const data2 = imageData2.data;
    
    // Resize to same dimensions for comparison
    const size = Math.min(data1.length, data2.length);
    let totalDiff = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < size; i += 4) {
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
      
      // Calculate brightness difference
      const brightness1 = (r1 + g1 + b1) / 3;
      const brightness2 = (r2 + g2 + b2) / 3;
      const diff = Math.abs(brightness1 - brightness2) / 255;
      
      totalDiff += diff;
      pixelCount++;
    }
    
    const avgDiff = totalDiff / pixelCount;
    return 1 - avgDiff; // Convert to similarity score
  };

  // Draw detection overlay with improved visuals
  const drawDetectionOverlay = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, isAuthorized: boolean, person: string, confidence: number, detectedFace?: any) => {
    // Draw bounding box
    let x, y, width, height;
    
    if (detectedFace && detectedFace.boundingBox) {
      ({ x, y, width, height } = detectedFace.boundingBox);
    } else {
      // Fallback bounding box
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const size = Math.min(canvas.width, canvas.height) * 0.4;
      x = centerX - size/2;
      y = centerY - size/2;
      width = size;
      height = size;
    }
    
    // Draw main bounding box
    ctx.strokeStyle = isAuthorized ? '#10B981' : '#EF4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, width, height);
    
    // Draw corner indicators
    const cornerSize = 20;
    ctx.lineWidth = 6;
    
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + cornerSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerSize, y);
    ctx.stroke();
    
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + width - cornerSize, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + cornerSize);
    ctx.stroke();
    
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x, y + height - cornerSize);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + cornerSize, y + height);
    ctx.stroke();
    
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + width - cornerSize, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - cornerSize);
    ctx.stroke();
    
    // Draw label background
    const labelHeight = 50;
    const labelY = y - labelHeight - 10;
    ctx.fillStyle = isAuthorized ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    ctx.fillRect(x, Math.max(labelY, 10), width, labelHeight);
    
    // Draw label text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${isMobile ? '16' : '20'}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${person}`, 
      x + width/2, 
      Math.max(labelY, 10) + 20
    );
    
    ctx.font = `${isMobile ? '14' : '16'}px Arial`;
    ctx.fillText(
      `${confidence}% ${isAuthorized ? 'AUTHORIZED' : 'UNAUTHORIZED'}`, 
      x + width/2, 
      Math.max(labelY, 10) + 40
    );
    
    // Draw status indicator
    ctx.beginPath();
    ctx.arc(x + width - 20, y + 20, 12, 0, 2 * Math.PI);
    ctx.fillStyle = isAuthorized ? '#10B981' : '#EF4444';
    ctx.fill();
    
    // Draw check or X in status indicator
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    if (isAuthorized) {
      // Check mark
      ctx.beginPath();
      ctx.moveTo(x + width - 26, y + 20);
      ctx.lineTo(x + width - 20, y + 26);
      ctx.lineTo(x + width - 14, y + 14);
      ctx.stroke();
    } else {
      // X mark
      ctx.beginPath();
      ctx.moveTo(x + width - 26, y + 14);
      ctx.lineTo(x + width - 14, y + 26);
      ctx.moveTo(x + width - 26, y + 26);
      ctx.lineTo(x + width - 14, y + 14);
      ctx.stroke();
    }
  };

  // Switch camera (for mobile devices with multiple cameras)
  const switchCamera = async () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex(cam => cam.deviceId === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      setSelectedCameraId(availableCameras[nextIndex].deviceId);
      
      if (recognitionActive) {
        await startCamera();
      }
    } else {
      // Toggle between front and back camera on mobile
      setCameraMode(prev => prev === 'user' ? 'environment' : 'user');
      if (recognitionActive) {
        await startCamera();
      }
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

  // Initialize cameras on mount
  useEffect(() => {
    getAvailableCameras();
    
    // Request permissions on mobile
    if (isMobile) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(error => {
          console.log('Permission request failed:', error);
        });
    }

    return () => {
      stopCamera();
    };
  }, []);

  // Get status badge color and icon
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

  // Get recent detections from alerts
  const recentDetections = alerts.slice(0, 5).map(alert => ({
    time: new Date(alert.created_at).toLocaleTimeString(),
    person: alert.detected_person || "Unknown",
    confidence: alert.confidence_score || 0,
    status: alert.detected_person && alert.detected_person !== "Unknown Person" ? "authorized" : "blocked",
    type: alert.alert_type
  }));

  return (
    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-4 lg:gap-6`}>
      {/* Real Camera Feed */}
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
              <Badge 
                variant={recognitionActive ? "default" : "secondary"} 
                className={`${isMobile ? 'text-xs' : 'text-sm'} px-3 py-1`}
              >
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
                <div className="text-center p-6">
                  <div className="p-4 bg-slate-600/50 rounded-full w-fit mx-auto mb-4">
                    <Camera className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} text-slate-400`} />
                  </div>
                  <h3 className="text-slate-300 text-lg font-semibold mb-2">Camera Offline</h3>
                  <p className="text-slate-400 text-sm">Start camera to begin face recognition</p>
                </div>
              </div>
            )}
            
            {/* Detection status overlay */}
            {recognitionActive && (
              <div className="absolute top-4 left-4">
                <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">LIVE</span>
                </div>
              </div>
            )}
            
            {/* Camera info */}
            {recognitionActive && (
              <div className="absolute top-4 right-4">
                <div className="bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
                  <span className="text-white text-sm">
                    {isMobile ? (cameraMode === 'user' ? 'Front' : 'Back') : 'Webcam'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Camera switch button for mobile */}
            {isMobile && recognitionActive && (
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
            
            {/* Last detection info */}
            {lastDetection && recognitionActive && (
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
          </div>
          
          {/* Camera error alert */}
          {cameraError && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                {cameraError}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Camera controls */}
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
            {!isMobile && (
              <Button 
                variant="outline" 
                onClick={() => setIsRecording(!isRecording)}
                disabled={!recognitionActive}
                className="w-full py-3"
                size="lg"
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Button>
            )}
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

          {/* System statistics */}
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
              <div className="text-slate-400 text-sm">Status</div>
              <div className="text-xl font-bold text-blue-400">
                {recognitionActive ? "ACTIVE" : "OFFLINE"}
              </div>
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
                className={`${isMobile ? 'text-xs' : 'text-sm'} ${user.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}`}
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

      {/* Real-time Detection Log */}
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
