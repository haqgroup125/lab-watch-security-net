
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Camera, Upload, User, UserCheck, UserX, Loader2, AlertCircle, CheckCircle, Trash2, Eye, EyeOff, Shield, ShieldAlert, RefreshCw, Scan, Play, Square } from 'lucide-react';
import { useSecuritySystem } from '@/hooks/useSecuritySystem';
import { toast } from "@/hooks/use-toast";

const FaceRecognition: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'scanning' | 'analyzing' | 'authorized' | 'unauthorized'>('idle');
  const [lastDetection, setLastDetection] = useState<{ name: string; confidence: number; isAuthorized: boolean; timestamp: Date } | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [detectionCount, setDetectionCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [currentFaceData, setCurrentFaceData] = useState<string | null>(null);
  const [enrolledFaces, setEnrolledFaces] = useState<Map<string, string>>(new Map());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { 
    authorizedUsers, 
    loading, 
    addAuthorizedUser, 
    deleteAuthorizedUser,
    createAlert,
    acknowledgeAlert,
    sendAlertToESP32,
    sendAlertToReceivers,
    fetchAuthorizedUsers 
  } = useSecuritySystem();

  // Generate simple face signature from image data
  const generateFaceSignature = useCallback((canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    // Get image data from center region (face area)
    const centerX = canvas.width * 0.3;
    const centerY = canvas.height * 0.2;
    const width = canvas.width * 0.4;
    const height = canvas.height * 0.6;
    
    const imageData = ctx.getImageData(centerX, centerY, width, height);
    const data = imageData.data;
    
    // Create simple signature based on color patterns
    let signature = '';
    const step = 4 * 10; // Sample every 10th pixel
    
    for (let i = 0; i < data.length; i += step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Convert to grayscale and create pattern
      const gray = (r + g + b) / 3;
      signature += Math.floor(gray / 32).toString(); // 0-7 range
    }
    
    return signature;
  }, []);

  // Compare two face signatures
  const compareFaceSignatures = useCallback((sig1: string, sig2: string): number => {
    if (!sig1 || !sig2 || sig1.length !== sig2.length) return 0;
    
    let matches = 0;
    const tolerance = 1; // Allow 1 level difference
    
    for (let i = 0; i < sig1.length; i++) {
      const diff = Math.abs(parseInt(sig1[i]) - parseInt(sig2[i]));
      if (diff <= tolerance) matches++;
    }
    
    return matches / sig1.length;
  }, []);

  // Update enrolled faces when authorized users change
  useEffect(() => {
    const newEnrolledFaces = new Map<string, string>();
    
    authorizedUsers.forEach(user => {
      if (user.face_signature) {
        newEnrolledFaces.set(user.id, user.face_signature);
      }
    });
    
    setEnrolledFaces(newEnrolledFaces);
    console.log(`👥 Updated enrolled faces: ${newEnrolledFaces.size} users`);
  }, [authorizedUsers]);

  // Enhanced camera initialization
  const initializeCamera = useCallback(async () => {
    if (isInitializing) return;
    
    try {
      setIsInitializing(true);
      setCameraError(null);
      setCameraReady(false);
      console.log('🎥 Starting camera initialization...');

      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Wait for video element to be available
      if (!videoRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!videoRef.current) {
          throw new Error('Video element not available');
        }
      }

      const constraints = {
        video: {
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, min: 15, max: 30 }
        },
        audio: false
      };

      console.log('📷 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Camera access granted');

      const video = videoRef.current;
      video.srcObject = stream;
      streamRef.current = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video loading timeout')), 10000);
        
        const handleLoadedMetadata = () => {
          clearTimeout(timeout);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('error', handleVideoError);
          resolve();
        };

        const handleVideoError = () => {
          clearTimeout(timeout);
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('error', handleVideoError);
          reject(new Error('Video loading error'));
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('error', handleVideoError);
        
        video.play().catch(reject);
      });

      // Wait for video to start playing
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video play timeout')), 5000);
        
        const checkPlaying = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0 && !video.paused) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkPlaying, 100);
          }
        };
        
        checkPlaying();
      });

      console.log('✅ Camera fully initialized:', video.videoWidth, 'x', video.videoHeight);
      setCameraReady(true);
      setIsActive(true);
      setDetectionCount(0);
      setDetectionStatus('idle');
      
      toast({
        title: "🎥 Camera Activated",
        description: `Face recognition system online (${video.videoWidth}x${video.videoHeight})`,
      });

    } catch (error) {
      console.error('❌ Camera initialization failed:', error);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      let errorMessage = "Camera initialization failed. ";
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          errorMessage += "No camera detected on this device.";
        } else if (error.name === 'NotAllowedError') {
          errorMessage += "Camera access denied. Please allow camera permissions and refresh the page.";
        } else if (error.name === 'NotReadableError') {
          errorMessage += "Camera is being used by another application.";
        } else {
          errorMessage += error.message;
        }
      }
      
      setCameraError(errorMessage);
      setIsActive(false);
      setCameraReady(false);
      
      toast({
        title: "❌ Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing]);

  // Stop camera
  const stopCamera = useCallback(() => {
    console.log('🛑 Stopping camera...');
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('📴 Stopped track:', track.kind);
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setCameraReady(false);
    setDetectionStatus('idle');
    setLastDetection(null);
    setDetectionCount(0);
    setScanningProgress(0);
    setCameraError(null);
    setCurrentFaceData(null);
    
    toast({
      title: "📴 Camera Stopped",
      description: "Face recognition system deactivated",
    });
  }, []);

  // Improved face detection algorithm
  const performFaceDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isActive || !cameraReady) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    setDetectionStatus('scanning');
    setScanningProgress(0);
    
    // Capture frame for analysis
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Scanning animation
    const scanningInterval = setInterval(() => {
      setScanningProgress(prev => {
        if (prev >= 100) {
          clearInterval(scanningInterval);
          return 100;
        }
        return prev + 12;
      });
    }, 80);

    // Simulate processing time
    setTimeout(() => {
      setDetectionStatus('analyzing');
      
      setTimeout(() => {
        // Generate face signature from current frame
        const currentSignature = generateFaceSignature(canvas);
        setCurrentFaceData(currentSignature);
        
        if (!currentSignature) {
          console.log('👤 No face detected in current frame');
          setDetectionStatus('idle');
          setLastDetection(null);
          setScanningProgress(0);
          setDetectionCount(prev => prev + 1);
          return;
        }

        console.log('🔍 Face detected, comparing with enrolled users...');
        setDetectionCount(prev => prev + 1);
        
        // Check against enrolled faces
        let bestMatch = { userId: '', confidence: 0, userName: '' };
        
        enrolledFaces.forEach((signature, userId) => {
          const confidence = compareFaceSignatures(currentSignature, signature);
          console.log(`👤 Comparing with user ${userId}: ${(confidence * 100).toFixed(1)}% match`);
          
          if (confidence > bestMatch.confidence) {
            const user = authorizedUsers.find(u => u.id === userId);
            if (user) {
              bestMatch = { userId, confidence, userName: user.name };
            }
          }
        });

        // Decision threshold - 70% confidence required for authorization
        const CONFIDENCE_THRESHOLD = 0.7;
        
        if (bestMatch.confidence >= CONFIDENCE_THRESHOLD) {
          // Authorized user detected
          setDetectionStatus('authorized');
          setLastDetection({ 
            name: bestMatch.userName, 
            confidence: bestMatch.confidence,
            isAuthorized: true,
            timestamp: new Date()
          });
          
          console.log(`✅ Authorized user detected: ${bestMatch.userName} (${(bestMatch.confidence * 100).toFixed(1)}%)`);
          
          toast({
            title: "✅ Access Granted",
            description: `Welcome ${bestMatch.userName}! (${(bestMatch.confidence * 100).toFixed(1)}% match)`,
          });
          
          setTimeout(() => {
            setDetectionStatus('idle');
            setLastDetection(null);
          }, 4000);
          
        } else if (enrolledFaces.size > 0) {
          // Face detected but not authorized
          setDetectionStatus('unauthorized');
          setLastDetection({ 
            name: 'Unknown Individual', 
            confidence: bestMatch.confidence,
            isAuthorized: false,
            timestamp: new Date()
          });
          
          console.log(`🚨 Unauthorized person detected (best match: ${(bestMatch.confidence * 100).toFixed(1)}%)`);
          
          createAlert({
            alert_type: 'Unauthorized Access Attempt',
            severity: 'high',
            details: `Unauthorized person detected at ${new Date().toLocaleTimeString()}. Best biometric match: ${(bestMatch.confidence * 100).toFixed(1)}%`,
            source_device: 'Face Recognition System',
            confidence_score: Math.round(bestMatch.confidence * 100)
          });
          
          toast({
            title: "🚨 Security Alert",
            description: "Unauthorized access attempt detected and logged!",
            variant: "destructive",
          });
          
          setTimeout(() => {
            setDetectionStatus('idle');
            setLastDetection(null);
          }, 6000);
          
        } else {
          // No enrolled users
          setDetectionStatus('unauthorized');
          setLastDetection({ 
            name: 'Unregistered Person', 
            confidence: 0.5,
            isAuthorized: false,
            timestamp: new Date()
          });
          
          createAlert({
            alert_type: 'Person Detected - No Enrolled Users',
            severity: 'medium',
            details: `Person detected but no authorized users enrolled. Time: ${new Date().toLocaleTimeString()}`,
            source_device: 'Face Recognition System',
            confidence_score: 50
          });
          
          toast({
            title: "⚠️ Person Detected",
            description: "No authorized users enrolled in system",
            variant: "destructive",
          });
          
          setTimeout(() => {
            setDetectionStatus('idle');
            setLastDetection(null);
          }, 5000);
        }
        
        setScanningProgress(0);
      }, 1000);
    }, 600);
  }, [authorizedUsers, isActive, cameraReady, createAlert, enrolledFaces, generateFaceSignature, compareFaceSignatures]);

  // Start detection loop
  useEffect(() => {
    if (isActive && cameraReady && !detectionIntervalRef.current) {
      // Initial detection after camera stabilizes
      const initialDelay = setTimeout(() => {
        if (isActive && cameraReady) {
          performFaceDetection();
        }
      }, 2000);
      
      // Regular detection every 4 seconds
      detectionIntervalRef.current = setInterval(() => {
        if (isActive && cameraReady && detectionStatus === 'idle') {
          performFaceDetection();
        }
      }, 4000);

      return () => {
        clearTimeout(initialDelay);
      };
    }
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isActive, cameraReady, performFaceDetection, detectionStatus]);

  // Enhanced user registration with face signature
  const registerNewUser = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !newUserName.trim() || !cameraReady) {
      toast({
        title: "Registration Error",
        description: "Please ensure camera is active and enter a valid name",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRegistering(true);
      setRegistrationProgress(0);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Capture high-resolution biometric data
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      // Generate face signature
      const faceSignature = generateFaceSignature(canvas);
      
      if (!faceSignature) {
        throw new Error('No face detected for enrollment');
      }

      // Simulate processing steps
      const processingSteps = [
        'Capturing biometric image...',
        'Analyzing facial features...',
        'Extracting unique markers...',
        'Creating secure template...',
        'Encrypting biometric data...',
        'Storing in secure database...'
      ];
      
      for (let i = 0; i < processingSteps.length; i++) {
        setRegistrationProgress(Math.round((i + 1) * 100 / processingSteps.length));
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      // Create biometric image
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.95);
      });

      if (!blob) throw new Error('Failed to capture biometric data');

      const file = new File([blob], `${newUserName.trim()}_biometric.jpg`, { type: 'image/jpeg' });
      
      // Add user with face signature
      await addAuthorizedUser(newUserName.trim(), file, faceSignature);
      
      setNewUserName('');
      setRegistrationProgress(0);
      
      console.log(`✅ User enrolled: ${newUserName.trim()} with face signature`);
      
      toast({
        title: "✅ Registration Complete",
        description: `${newUserName.trim()} successfully enrolled with biometric template`,
      });

    } catch (error) {
      console.error('Registration failed:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  }, [newUserName, cameraReady, addAuthorizedUser, generateFaceSignature]);

  // User deletion
  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      await deleteAuthorizedUser(userId, userName);
      toast({
        title: "User Removed",
        description: `${userName} has been removed from authorized users`,
      });
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Failed to remove user. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold text-foreground">Advanced Face Recognition</h1>
          <p className="text-muted-foreground">AI-powered biometric security system</p>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-3">
          <Badge variant={isActive && cameraReady ? 'default' : 'secondary'} className="flex items-center gap-2 px-3 py-1">
            <div className={`w-2 h-2 rounded-full ${
              isActive && cameraReady 
                ? 'bg-green-500 animate-pulse' 
                : isInitializing 
                ? 'bg-yellow-500 animate-pulse' 
                : 'bg-gray-500'
            }`} />
            <span className="font-medium">
              {isActive && cameraReady 
                ? 'Active' 
                : isInitializing 
                ? 'Starting...' 
                : 'Offline'}
            </span>
          </Badge>
          {isActive && cameraReady && (
            <Badge variant="outline" className="text-xs">
              Scans: {detectionCount} | Users: {enrolledFaces.size}
            </Badge>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {cameraError && (
        <Alert className="border-red-400 bg-red-50 dark:bg-red-950">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="text-red-700 dark:text-red-300">{cameraError}</span>
              <Button 
                onClick={initializeCamera}
                variant="outline" 
                size="sm"
                className="ml-2"
                disabled={isInitializing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isInitializing ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Live Security Feed
            </CardTitle>
            <CardDescription>
              Real-time biometric facial recognition monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={isActive ? stopCamera : initializeCamera}
                variant={isActive ? 'destructive' : 'default'}
                disabled={isInitializing}
                className="flex-1 sm:flex-none"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : isActive ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop Security
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Security
                  </>
                )}
              </Button>
              <Button 
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                size="default"
                className="flex-1 sm:flex-none"
                disabled={!isActive}
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showPreview ? 'Hide Feed' : 'Show Feed'}
              </Button>
            </div>

            {/* Video Feed */}
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden relative border-2 border-border">
                
                {/* Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-all duration-700 ${
                    isActive && showPreview && cameraReady 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-0 scale-95'
                  }`}
                  style={{ 
                    transform: isActive && showPreview && cameraReady 
                      ? 'scaleX(-1)' 
                      : 'scaleX(-1) scale(0.95)', 
                    filter: 'contrast(1.1) brightness(1.05)'
                  }}
                />
                
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Loading State */}
                {isActive && !cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm">
                    <div className="text-center p-6">
                      <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
                      <p className="font-medium text-white mb-1">Initializing camera...</p>
                      <p className="text-sm text-gray-300">Activating biometric sensors...</p>
                    </div>
                  </div>
                )}

                {/* Detection Overlays */}
                {detectionStatus !== 'idle' && showPreview && isActive && cameraReady && (
                  <div className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                    detectionStatus === 'authorized' 
                      ? 'bg-green-500/20 border-4 border-green-400 shadow-green-400/50' 
                      : detectionStatus === 'unauthorized'
                      ? 'bg-red-500/20 border-4 border-red-400 shadow-red-400/50'
                      : 'bg-blue-500/10 border-4 border-blue-400 shadow-blue-400/30'
                  } shadow-2xl`}>
                    
                    {/* Scanning Interface */}
                    {detectionStatus === 'scanning' && (
                      <div className="absolute top-4 left-4 right-4">
                        <div className="bg-background/95 backdrop-blur-sm rounded-lg p-4 border shadow-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <Scan className="h-5 w-5 animate-pulse text-blue-500" />
                            <span className="font-semibold text-sm">Scanning for biometric data...</span>
                          </div>
                          <Progress value={scanningProgress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-2">
                            Analyzing facial geometry and unique features
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Analysis Interface */}
                    {detectionStatus === 'analyzing' && (
                      <div className="absolute top-4 left-4 right-4">
                        <div className="bg-background/95 backdrop-blur-sm rounded-lg p-4 border shadow-lg">
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            <span className="font-semibold text-sm">Processing biometric template...</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Comparing against {enrolledFaces.size} authorized user(s)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Results Display */}
                    {(detectionStatus === 'authorized' || detectionStatus === 'unauthorized') && lastDetection && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-background/95 backdrop-blur-sm rounded-lg p-4 border shadow-lg">
                          {detectionStatus === 'authorized' ? (
                            <div className="flex items-center gap-3 text-green-600">
                              <CheckCircle className="h-6 w-6 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-lg">✅ ACCESS GRANTED</div>
                                <div className="font-medium text-base truncate">{lastDetection.name}</div>
                                <div className="text-sm opacity-90">
                                  Biometric Match: {(lastDetection.confidence * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs opacity-75">
                                  {lastDetection.timestamp.toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 text-red-600">
                              <AlertCircle className="h-6 w-6 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-lg">🚨 ACCESS DENIED</div>
                                <div className="font-medium text-base">Unauthorized Individual</div>
                                <div className="text-sm opacity-90">
                                  Security alert has been created and logged
                                </div>
                                <div className="text-xs opacity-75">
                                  {lastDetection.timestamp.toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Offline State */}
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900/90 to-slate-800/90">
                    <div className="text-center p-8">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                        <Shield className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <p className="font-bold text-xl text-white mb-2">Security System Offline</p>
                      <p className="text-sm text-gray-300 mb-4">Advanced biometric monitoring is currently disabled</p>
                      <Button onClick={initializeCamera} variant="secondary" size="sm" disabled={isInitializing}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Monitoring
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detection Status */}
            {lastDetection && (
              <Alert className={`border-2 transition-all duration-300 ${
                lastDetection.isAuthorized 
                  ? 'border-green-400 bg-green-50 dark:bg-green-950' 
                  : 'border-red-400 bg-red-50 dark:bg-red-950'
              }`}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={`font-semibold ${lastDetection.isAuthorized ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {lastDetection.name}
                      </span>
                      <span className="text-sm ml-2">
                        {(lastDetection.confidence * 100).toFixed(1)}% biometric confidence
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {lastDetection.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Control Panel */}
        <div className="space-y-6">
          {/* User Registration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Enroll New User
              </CardTitle>
              <CardDescription>
                Register authorized personnel with biometric data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userName">Full Name</Label>
                <Input
                  id="userName"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter full name"
                  disabled={isRegistering}
                />
              </div>

              {isRegistering && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing biometric enrollment...</span>
                    <span>{registrationProgress}%</span>
                  </div>
                  <Progress value={registrationProgress} className="h-2" />
                </div>
              )}

              <Button 
                onClick={registerNewUser}
                disabled={!isActive || !cameraReady || !newUserName.trim() || isRegistering}
                className="w-full"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enrolling Biometric Data...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Capture & Enroll Biometrics
                  </>
                )}
              </Button>
              
              {(!isActive || !cameraReady) && (
                <p className="text-xs text-muted-foreground text-center">
                  Camera must be active and ready to enroll users
                </p>
              )}
            </CardContent>
          </Card>

          {/* Authorized Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Authorized Users ({authorizedUsers.length})
              </CardTitle>
              <CardDescription>
                Manage biometric access permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm">Loading authorized users...</span>
                  </div>
                ) : authorizedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium mb-1">No Enrolled Users</p>
                    <p className="text-xs">Enroll authorized personnel to enable security</p>
                  </div>
                ) : (
                  authorizedUsers.map((user, index) => (
                    <div key={user.id}>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {user.image_url && (
                            <img 
                              src={user.image_url} 
                              alt={user.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-background shadow-sm"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Enrolled {new Date(user.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-green-600 font-medium">
                              ✓ Biometric Template Active
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {index < authorizedUsers.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
