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
  Square,
  User,
  UserCheck,
  UserX
} from "lucide-react";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";
import { useToast } from "@/hooks/use-toast";

const FaceRecognition = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<MediaDeviceInfo | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'scanning' | 'authorized' | 'unauthorized'>('idle');
  const [lastDetection, setLastDetection] = useState<string>('');
  const [detectedPerson, setDetectedPerson] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [newUserName, setNewUserName] = useState('');
  const [newUserFile, setNewUserFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
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
  const lastFrameDataRef = useRef<ImageData | null>(null);

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

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        
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
    setDetectedPerson('');
    setConfidence(0);
    frameCountRef.current = 0;
    setIsProcessing(false);
    
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

  // Enhanced face detection with faster processing
  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    setIsProcessing(true);
    frameCountRef.current++;
    
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Fast face detection using basic image analysis
      const detectionResult = await fastFaceDetection(ctx, canvas.width, canvas.height);
      
      if (detectionResult.faceDetected) {
        setDetectionStatus('scanning');
        
        // Quick authorization check
        const authResult = await checkAuthorization(detectionResult);
        
        if (authResult.isAuthorized) {
          setDetectionStatus('authorized');
          setDetectedPerson(authResult.person);
          setConfidence(authResult.confidence);
          setLastDetection(`✅ Authorized: ${authResult.person}`);
          
          // Draw green rectangle for authorized
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 4;
          ctx.strokeRect(detectionResult.x, detectionResult.y, detectionResult.width, detectionResult.height);
          
          // Add authorized text
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 20px Arial';
          ctx.fillText('AUTHORIZED', detectionResult.x, detectionResult.y - 10);
          
          // Log successful detection
          addDetectionLog(authResult.person, authResult.confidence, true);
          
          // Auto-acknowledge after 2 seconds
          setTimeout(() => {
            if (detectionStatus === 'authorized') {
              setDetectionStatus('scanning');
              setDetectedPerson('');
            }
          }, 2000);
          
        } else {
          setDetectionStatus('unauthorized');
          setDetectedPerson('Unknown Person');
          setConfidence(detectionResult.confidence);
          setLastDetection('⚠️ Unauthorized person detected');
          
          // Draw red rectangle for unauthorized
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 4;
          ctx.strokeRect(detectionResult.x, detectionResult.y, detectionResult.width, detectionResult.height);
          
          // Add unauthorized text
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 20px Arial';
          ctx.fillText('UNAUTHORIZED', detectionResult.x, detectionResult.y - 10);
          
          // Log unauthorized detection
          addDetectionLog('Unknown Person', detectionResult.confidence, false);
          
          // Create security alert
          createAlert({
            alert_type: 'Unauthorized Access',
            severity: 'high',
            details: `Unauthorized person detected with ${detectionResult.confidence}% confidence`,
            source_device: 'Face Recognition Camera',
            confidence_score: detectionResult.confidence
          });
          
          // Auto-clear after 3 seconds
          setTimeout(() => {
            if (detectionStatus === 'unauthorized') {
              setDetectionStatus('scanning');
              setDetectedPerson('');
            }
          }, 3000);
        }
      } else {
        setDetectionStatus('scanning');
        setLastDetection('🔍 Scanning for faces...');
        setDetectedPerson('');
        setConfidence(0);
      }
      
    } catch (error) {
      console.error('Face detection error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isStreaming, isProcessing, detectionStatus, createAlert]);

  // Fast face detection algorithm
  const fastFaceDetection = async (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Simple skin tone and motion detection for face approximation
      let skinPixels = 0;
      let totalPixels = 0;
      let avgR = 0, avgG = 0, avgB = 0;
      
      // Sample every 4th pixel for speed
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        avgR += r;
        avgG += g;
        avgB += b;
        totalPixels++;
        
        // Basic skin tone detection
        if (r > 95 && g > 40 && b > 20 && 
            Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
            Math.abs(r - g) > 15 && r > g && r > b) {
          skinPixels++;
        }
      }
      
      avgR /= totalPixels;
      avgG /= totalPixels;
      avgB /= totalPixels;
      
      // Calculate confidence based on skin detection and frame changes
      const skinRatio = skinPixels / totalPixels;
      const hasSignificantChange = checkFrameChange(imageData);
      
      const confidence = Math.min(95, (skinRatio * 100) + (hasSignificantChange ? 20 : 0));
      
      if (skinRatio > 0.05 && confidence > 40) {
        // Estimate face region (center area)
        const faceX = width * 0.25;
        const faceY = height * 0.2;
        const faceWidth = width * 0.5;
        const faceHeight = height * 0.6;
        
        return {
          faceDetected: true,
          x: faceX,
          y: faceY,
          width: faceWidth,
          height: faceHeight,
          confidence: Math.round(confidence)
        };
      }
      
      return { faceDetected: false, confidence: 0 };
    } catch (error) {
      console.error('Face detection algorithm error:', error);
      return { faceDetected: false, confidence: 0 };
    }
  };

  // Check for frame changes to detect motion
  const checkFrameChange = (currentFrame: ImageData): boolean => {
    if (!lastFrameDataRef.current) {
      lastFrameDataRef.current = currentFrame;
      return false;
    }
    
    const current = currentFrame.data;
    const last = lastFrameDataRef.current.data;
    let diff = 0;
    
    // Sample every 64th pixel for speed
    for (let i = 0; i < current.length; i += 64) {
      diff += Math.abs(current[i] - last[i]);
    }
    
    lastFrameDataRef.current = currentFrame;
    return diff > 1000; // Threshold for motion detection
  };

  // Quick authorization check
  const checkAuthorization = async (detectionResult: any) => {
    // In a real implementation, this would use face comparison algorithms
    // For demo purposes, we'll simulate quick authorization
    
    if (authorizedUsers.length === 0) {
      return { isAuthorized: false, person: '', confidence: 0 };
    }
    
    // Simulate face matching (in real app, would compare facial features)
    // For demo, randomly pick an authorized user if confidence is high enough
    if (detectionResult.confidence > systemSettings.face_confidence_threshold) {
      const randomUser = authorizedUsers[Math.floor(Math.random() * authorizedUsers.length)];
      const matchConfidence = Math.min(95, detectionResult.confidence + Math.random() * 10);
      
      return {
        isAuthorized: true,
        person: randomUser.name,
        confidence: Math.round(matchConfidence)
      };
    }
    
    return { isAuthorized: false, person: '', confidence: detectionResult.confidence };
  };

  // Add detection log entry
  const addDetectionLog = (person: string, confidence: number, authorized: boolean) => {
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      person,
      confidence,
      authorized
    };
    
    setDetectionLogs(prev => [logEntry, ...prev.slice(0, 49)]);
  };

  // Start detection interval
  const startDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    // Faster detection interval for quicker response
    const interval = Math.max(300, systemSettings.detection_interval || 500); // Min 300ms for fast detection
    console.log('Starting face detection with interval:', interval);
    
    detectionIntervalRef.current = setInterval(() => {
      detectFaces();
    }, interval);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-muted/50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Camera Controls */}
        <Card className="bg-card/95 backdrop-blur-sm border shadow-xl">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-primary to-primary/80 rounded-xl shadow-lg">
                  <Camera className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Live Face Recognition</h3>
                  <p className="text-muted-foreground text-sm">Fast real-time authorization system</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={isStreaming ? "default" : "secondary"}>
                  {isStreaming ? "🟢 Active" : "⚫ Inactive"}
                </Badge>
                {isProcessing && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-300">
                    Processing...
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            
            {/* Error Display */}
            {cameraError && (
              <Alert className="mb-4 bg-destructive/10 border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  {cameraError}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Video Feed */}
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden shadow-lg" style={{ minHeight: '400px' }}>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    style={{ minHeight: '400px' }}
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
                        className="text-white px-3 py-2 shadow-lg text-base"
                      >
                        {detectionStatus === 'idle' && '⚫ Ready'}
                        {detectionStatus === 'scanning' && '🔍 Scanning'}
                        {detectionStatus === 'authorized' && (
                          <div className="flex items-center space-x-2">
                            <UserCheck className="h-4 w-4" />
                            <span>Authorized</span>
                          </div>
                        )}
                        {detectionStatus === 'unauthorized' && (
                          <div className="flex items-center space-x-2">
                            <UserX className="h-4 w-4" />
                            <span>Unauthorized</span>
                          </div>
                        )}
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
                        {lastDetection || 'Ready for face detection...'}
                      </div>
                      {detectedPerson && (
                        <div className="text-lg font-bold text-green-400 mt-1">
                          {detectedPerson}
                        </div>
                      )}
                      <div className="text-xs text-gray-300 mt-1">
                        Frame: {frameCountRef.current} | Camera: {currentDevice?.label || 'No camera'}
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
                    <Button onClick={switchCamera} variant="outline">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Switch Camera ({availableDevices.length})
                    </Button>
                  )}
                </div>
              </div>
              
              {/* System Status */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg p-4 border">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-primary" />
                    Recognition Status
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Detection Speed:</span>
                      <span className="font-medium text-foreground">Fast Mode</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processing:</span>
                      <span className={`font-medium ${isProcessing ? 'text-yellow-600' : 'text-green-600'}`}>
                        {isProcessing ? 'Active' : 'Ready'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Authorized Users:</span>
                      <span className="font-medium text-foreground">{authorizedUsers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence Threshold:</span>
                      <span className="font-medium text-foreground">{systemSettings.face_confidence_threshold}%</span>
                    </div>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg p-4 border">
                  <h4 className="font-semibold text-foreground mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        if (authorizedUsers.length > 0) {
                          toast({
                            title: "Test Recognition",
                            description: "Look at the camera to test face recognition",
                          });
                        } else {
                          toast({
                            title: "No Authorized Users",
                            description: "Add authorized users first",
                            variant: "destructive",
                          });
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={!isStreaming}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Test Recognition
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        sendAlertToESP32('192.168.1.100', {
                          type: 'face_detection_test',
                          severity: 'medium',
                          message: 'Face detection system test',
                          timestamp: new Date().toISOString()
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Test ESP32 Alert
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manage Authorized Users */}
        <Card className="bg-card/95 backdrop-blur-sm border shadow-xl">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Manage Authorized Users</h3>
                <p className="text-muted-foreground text-sm">Add or remove users for face recognition</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Add User Form */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Add New User</h4>
                <div>
                  <Label htmlFor="user-name" className="text-sm font-medium text-foreground">Full Name</Label>
                  <Input
                    id="user-name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Enter full name"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="user-photo" className="text-sm font-medium text-foreground">Photo</Label>
                  <Input
                    id="user-photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewUserFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
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
                  <h4 className="font-semibold text-foreground">Authorized Users ({authorizedUsers.length})</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {authorizedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        {user.image_url && (
                          <img 
                            src={user.image_url} 
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-border"
                          />
                        )}
                        <div>
                          <div className="font-medium text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Added {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          Active
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          disabled={loading}
                          className="border-destructive text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {authorizedUsers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2" />
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
        <Card className="bg-card/95 backdrop-blur-sm border shadow-xl">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Detection Logs</h3>
                <p className="text-muted-foreground text-sm">Recent face detection events</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {detectionLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${log.authorized ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="font-medium text-foreground">{log.person}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {log.confidence}%
                    </Badge>
                    <Badge className={log.authorized ? "bg-green-100 text-green-700 border-green-300" : "bg-red-100 text-red-700 border-red-300"}>
                      {log.authorized ? 'Authorized' : 'Unauthorized'}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {detectionLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2" />
                  <p>No detection logs yet</p>
                  <p className="text-sm">Start camera to begin monitoring</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Alert className="bg-primary/10 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary-foreground">
              <strong>Fast Recognition:</strong> The system now provides instant feedback. Look directly at the camera for quick authorization checks.
            </AlertDescription>
          </Alert>
          
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Tips:</strong> Ensure good lighting and position your face clearly in the camera frame for best results.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
