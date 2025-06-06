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
  Settings,
  Activity
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

  // Initialize cameras with better error handling
  const initializeCameras = useCallback(async () => {
    try {
      console.log('Initializing cameras...');
      
      // First check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }

      // Request camera permission with retry logic
      let stream: MediaStream | null = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Camera access attempt ${attempt}/${maxRetries}`);
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280, min: 640 },
              height: { ideal: 720, min: 480 }
            } 
          });
          break;
        } catch (error) {
          console.log(`Attempt ${attempt} failed:`, error);
          if (attempt === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available video devices:', videoDevices);
      setAvailableDevices(videoDevices);
      
      if (videoDevices.length > 0) {
        setCurrentDevice(videoDevices[0]);
        toast({
          title: "Cameras Ready",
          description: `Found ${videoDevices.length} camera(s)`,
        });
      } else {
        throw new Error('No video devices found');
      }
    } catch (error: any) {
      console.error('Camera initialization failed:', error);
      let errorMessage = 'Failed to access cameras.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and refresh the page.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No cameras found. Please connect a camera and refresh the page.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    if (!currentDevice) {
      await initializeCameras();
      return;
    }

    try {
      console.log('Starting camera stream with device:', currentDevice.label);
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: currentDevice.deviceId,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            setIsStreaming(true);
            startDetection();
            
            toast({
              title: "Camera Started",
              description: "Face recognition is now active",
            });
          }
        };
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      toast({
        title: "Camera Error",
        description: "Failed to start camera. Please try again.",
        variant: "destructive",
      });
    }
  }, [currentDevice, initializeCameras, toast]);

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
    frameCountRef.current = 0;
    
    toast({
      title: "Camera Stopped",
      description: "Face recognition deactivated",
    });
  }, [toast]);

  // Switch camera
  const switchCamera = useCallback(() => {
    if (availableDevices.length <= 1) return;
    
    const currentIndex = availableDevices.findIndex(device => device.deviceId === currentDevice?.deviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDevice = availableDevices[nextIndex];
    
    setCurrentDevice(nextDevice);
    
    if (isStreaming) {
      stopCamera();
      setTimeout(() => {
        setCurrentDevice(nextDevice);
      }, 500);
    }
  }, [availableDevices, currentDevice, isStreaming, stopCamera]);

  // Enhanced face detection with system settings integration
  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    frameCountRef.current++;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    try {
      let faces: any[] = [];
      
      // Enhanced face detection using multiple methods
      if ('FaceDetector' in window) {
        try {
          const faceDetector = new (window as any).FaceDetector({
            maxDetectedFaces: 5,
            fastMode: false
          });
          faces = await faceDetector.detect(canvas);
        } catch (e) {
          console.log('FaceDetector API failed, using fallback');
        }
      }
      
      if (faces.length === 0) {
        faces = await detectFacesPatternRecognition(ctx, canvas.width, canvas.height);
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0);
      
      if (faces.length > 0) {
        setDetectionStatus('scanning');
        
        for (const face of faces) {
          const box = face.boundingBox || face;
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          const faceImageData = ctx.getImageData(box.x, box.y, box.width, box.height);
          const recognitionResult = await recognizeFace(faceImageData);
          
          // Log detection
          const logEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            person: recognitionResult.isAuthorized ? recognitionResult.name : 'Unknown',
            confidence: recognitionResult.confidence,
            authorized: recognitionResult.isAuthorized
          };
          
          setDetectionLogs(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 logs
          
          if (recognitionResult.isAuthorized) {
            setDetectionStatus('authorized');
            setLastDetection(recognitionResult.name);
            setConfidence(recognitionResult.confidence);
            
            ctx.strokeStyle = '#00ff00';
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.fillRect(box.x, box.y, box.width, box.height);
            
            await createAlert({
              alert_type: 'Authorized Access',
              severity: 'low',
              details: `${recognitionResult.name} detected with ${recognitionResult.confidence}% confidence`,
              detected_person: recognitionResult.name,
              source_device: 'Face Recognition Camera',
              confidence_score: recognitionResult.confidence,
            });
            
          } else {
            setDetectionStatus('unauthorized');
            setLastDetection('Unknown Person');
            setConfidence(recognitionResult.confidence);
            
            ctx.strokeStyle = '#ff0000';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(box.x, box.y, box.width, box.height);
            
            await handleUnauthorizedDetection(recognitionResult.confidence);
          }
          
          ctx.fillStyle = recognitionResult.isAuthorized ? '#00ff00' : '#ff0000';
          ctx.font = '16px Arial';
          ctx.fillText(
            `${recognitionResult.isAuthorized ? recognitionResult.name : 'UNAUTHORIZED'} (${recognitionResult.confidence}%)`,
            box.x,
            box.y - 10
          );
        }
      } else {
        setDetectionStatus('scanning');
        setLastDetection('No face detected');
        setConfidence(0);
      }
      
    } catch (error) {
      console.error('Face detection error:', error);
    }
  }, [createAlert, systemSettings]);

  // Enhanced pattern recognition fallback
  const detectFacesPatternRecognition = async (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const faces = [];
    
    // Enhanced face detection algorithm
    const blockSize = 20;
    const threshold = 30;
    
    for (let y = 0; y < height - 100; y += blockSize) {
      for (let x = 0; x < width - 100; x += blockSize) {
        let skinPixels = 0;
        let totalPixels = 0;
        
        // Analyze skin tone and facial features
        for (let dy = 0; dy < 100; dy += 2) {
          for (let dx = 0; dx < 100; dx += 2) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // Enhanced skin detection
            if (isSkinTone(r, g, b)) {
              skinPixels++;
            }
            totalPixels++;
          }
        }
        
        const skinRatio = skinPixels / totalPixels;
        if (skinRatio > 0.3) {
          // Verify facial features
          if (hasFacialFeatures(ctx, x, y, 100, 100)) {
            faces.push({
              x: x,
              y: y,
              width: 100,
              height: 100,
              confidence: skinRatio
            });
          }
        }
      }
    }
    
    return faces;
  };

  // Enhanced skin tone detection
  const isSkinTone = (r: number, g: number, b: number): boolean => {
    // Multiple skin tone ranges for better detection
    return (
      (r > 95 && g > 40 && b > 20 && Math.max(r, g, b) - Math.min(r, g, b) > 15 && Math.abs(r - g) > 15 && r > g && r > b) ||
      (r > 220 && g > 210 && b > 170 && Math.abs(r - g) <= 15 && r > b && g > b) ||
      (r > 180 && g > 120 && b > 80 && Math.abs(r - g) <= 20 && r > b)
    );
  };

  // Check for facial features
  const hasFacialFeatures = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): boolean => {
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;
    
    // Look for eye regions (darker areas in upper third)
    let darkPixelsUpper = 0;
    let totalPixelsUpper = 0;
    
    for (let dy = h * 0.2; dy < h * 0.5; dy++) {
      for (let dx = w * 0.2; dx < w * 0.8; dx++) {
        const idx = (Math.floor(dy) * w + Math.floor(dx)) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (brightness < 100) darkPixelsUpper++;
        totalPixelsUpper++;
      }
    }
    
    return (darkPixelsUpper / totalPixelsUpper) > 0.1;
  };

  // Enhanced face recognition with system settings
  const recognizeFace = async (faceImageData: ImageData): Promise<{
    isAuthorized: boolean;
    name: string;
    confidence: number;
  }> => {
    try {
      let bestMatch = { name: '', confidence: 0 };
      
      for (const user of authorizedUsers) {
        if (!user.image_url) continue;
        
        const confidence = await compareFaceImages(faceImageData, user.image_url);
        
        if (confidence > bestMatch.confidence) {
          bestMatch = { name: user.name, confidence };
        }
      }
      
      // Use system settings threshold
      const isAuthorized = bestMatch.confidence >= systemSettings.face_confidence_threshold;
      
      return {
        isAuthorized,
        name: isAuthorized ? bestMatch.name : 'Unknown',
        confidence: Math.round(bestMatch.confidence)
      };
      
    } catch (error) {
      console.error('Face recognition error:', error);
      return { isAuthorized: false, name: 'Error', confidence: 0 };
    }
  };

  // Enhanced image comparison algorithm
  const compareFaceImages = async (faceImageData: ImageData, referenceImageUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(0);
            return;
          }
          
          // Resize both images to same size for comparison
          const size = 64;
          canvas.width = size;
          canvas.height = size;
          
          // Draw reference image
          ctx.drawImage(img, 0, 0, size, size);
          const refImageData = ctx.getImageData(0, 0, size, size);
          
          // Resize detected face
          const faceCanvas = document.createElement('canvas');
          const faceCtx = faceCanvas.getContext('2d');
          if (!faceCtx) {
            resolve(0);
            return;
          }
          
          faceCanvas.width = size;
          faceCanvas.height = size;
          
          // Create temporary canvas for face image
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) {
            resolve(0);
            return;
          }
          
          tempCanvas.width = faceImageData.width;
          tempCanvas.height = faceImageData.height;
          tempCtx.putImageData(faceImageData, 0, 0);
          
          faceCtx.drawImage(tempCanvas, 0, 0, size, size);
          const detectedImageData = faceCtx.getImageData(0, 0, size, size);
          
          // Multiple comparison methods
          const similarity1 = calculatePixelSimilarity(refImageData.data, detectedImageData.data);
          const similarity2 = calculateHistogramSimilarity(refImageData.data, detectedImageData.data);
          const similarity3 = calculateStructuralSimilarity(refImageData.data, detectedImageData.data, size);
          
          // Weighted average of different methods
          const finalSimilarity = (similarity1 * 0.4 + similarity2 * 0.3 + similarity3 * 0.3);
          resolve(Math.min(100, Math.max(0, finalSimilarity)));
          
        } catch (error) {
          console.error('Image comparison error:', error);
          resolve(0);
        }
      };
      
      img.onerror = () => resolve(0);
      img.src = referenceImageUrl;
    });
  };

  // Pixel-by-pixel similarity
  const calculatePixelSimilarity = (data1: Uint8ClampedArray, data2: Uint8ClampedArray): number => {
    let totalDiff = 0;
    const pixels = data1.length / 4;
    
    for (let i = 0; i < data1.length; i += 4) {
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
      
      const diff = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
      totalDiff += diff;
    }
    
    const avgDiff = totalDiff / pixels;
    return Math.max(0, 100 - (avgDiff / 441) * 100); // 441 is max possible diff
  };

  // Histogram similarity
  const calculateHistogramSimilarity = (data1: Uint8ClampedArray, data2: Uint8ClampedArray): number => {
    const hist1 = new Array(256).fill(0);
    const hist2 = new Array(256).fill(0);
    
    for (let i = 0; i < data1.length; i += 4) {
      const gray1 = Math.round((data1[i] + data1[i + 1] + data1[i + 2]) / 3);
      const gray2 = Math.round((data2[i] + data2[i + 1] + data2[i + 2]) / 3);
      hist1[gray1]++;
      hist2[gray2]++;
    }
    
    let correlation = 0;
    const pixels = data1.length / 4;
    
    for (let i = 0; i < 256; i++) {
      correlation += Math.min(hist1[i], hist2[i]);
    }
    
    return (correlation / pixels) * 100;
  };

  // Structural similarity
  const calculateStructuralSimilarity = (data1: Uint8ClampedArray, data2: Uint8ClampedArray, size: number): number => {
    let similarity = 0;
    const blockSize = 8;
    const blocks = (size / blockSize) ** 2;
    
    for (let by = 0; by < size; by += blockSize) {
      for (let bx = 0; bx < size; bx += blockSize) {
        let blockSim = 0;
        let blockPixels = 0;
        
        for (let y = by; y < Math.min(by + blockSize, size); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, size); x++) {
            const idx = (y * size + x) * 4;
            const gray1 = (data1[idx] + data1[idx + 1] + data1[idx + 2]) / 3;
            const gray2 = (data2[idx] + data2[idx + 1] + data2[idx + 2]) / 3;
            
            blockSim += Math.abs(gray1 - gray2);
            blockPixels++;
          }
        }
        
        similarity += Math.max(0, 255 - (blockSim / blockPixels));
      }
    }
    
    return (similarity / blocks / 255) * 100;
  };

  // Handle unauthorized detection with ESP32 integration
  const handleUnauthorizedDetection = async (confidence: number) => {
    try {
      console.log('Unauthorized person detected!');
      
      await createAlert({
        alert_type: 'Unauthorized Face Detected',
        severity: 'high',
        details: `Unknown person detected with ${confidence}% confidence. Immediate attention required.`,
        detected_person: 'Unknown',
        source_device: 'Face Recognition Camera',
        confidence_score: confidence,
      });
      
      // Send alert to ESP32 with detailed payload
      if (esp32IP) {
        await sendAlertToESP32(esp32IP, {
          type: 'unauthorized_face',
          severity: 'high',
          message: 'Unauthorized person detected',
          timestamp: new Date().toISOString(),
          confidence: confidence,
          location: 'Face Recognition Camera',
          action_required: true
        });
      }
      
      // Play sound if enabled
      if (systemSettings.notification_sounds) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
          console.log('Audio notification failed:', error);
        }
      }
      
      toast({
        title: "SECURITY ALERT",
        description: "Unauthorized person detected!",
        variant: "destructive",
      });
      
    } catch (error) {
      console.error('Error handling unauthorized detection:', error);
    }
  };

  // Start detection with system settings interval
  const startDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(() => {
      detectFaces();
    }, systemSettings.detection_interval);
  }, [detectFaces, systemSettings.detection_interval]);

  // Handle user deletion
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to remove ${userName} from authorized users?`)) {
      await deleteAuthorizedUser(userId, userName);
    }
  };

  // Add user with validation
  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserFile) {
      toast({
        title: "Missing Information",
        description: "Please provide both name and photo",
        variant: "destructive",
      });
      return;
    }
    
    // Validate image file
    if (!newUserFile.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }
    
    if (newUserFile.size > 5 * 1024 * 1024) { // 5MB limit
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

  // Initialize on component mount
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

  // Re-start detection when settings change
  useEffect(() => {
    if (isStreaming) {
      startDetection();
    }
  }, [systemSettings.detection_interval, isStreaming, startDetection]);

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Video Feed */}
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
                  <video
                    ref={videoRef}
                    className="w-full h-64 object-cover"
                    playsInline
                    muted
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
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
                  {lastDetection && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white">
                        <div className="text-sm font-medium">{lastDetection}</div>
                        <div className="text-xs text-gray-300">
                          Frame: {frameCountRef.current} | Camera: {currentDevice?.label || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Camera Controls */}
                <div className="flex space-x-2">
                  {!isStreaming ? (
                    <Button onClick={startCamera} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                      <Camera className="h-4 w-4 mr-2" />
                      Start Camera
                    </Button>
                  ) : (
                    <Button onClick={stopCamera} variant="destructive" className="flex-1">
                      <Camera className="h-4 w-4 mr-2" />
                      Stop Camera
                    </Button>
                  )}
                  
                  {availableDevices.length > 1 && (
                    <Button onClick={switchCamera} variant="outline" className="bg-white">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Switch Camera
                    </Button>
                  )}
                </div>
              </div>
              
              {/* System Status */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">System Status</h4>
                  <div className="space-y-2 text-sm">
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
                      <span className="text-gray-600">ESP32 IP:</span>
                      <span className="font-mono text-xs text-gray-900">{esp32IP}</span>
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

        {/* Add Authorized User with improved UI */}
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
              
              {/* Existing Users with Delete Option */}
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

        {/* Alerts & Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Security Alert */}
          <Alert className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Security Notice:</strong> Unauthorized face detection will trigger immediate alerts to all connected devices including ESP32 modules and alert receivers.
            </AlertDescription>
          </Alert>
          
          {/* Success Info */}
          <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>System Ready:</strong> Face recognition is operational. Authorized users will be automatically recognized and logged.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
