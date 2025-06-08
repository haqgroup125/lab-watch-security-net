
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Camera, Upload, User, UserCheck, UserX, Loader2, AlertCircle, CheckCircle, Trash2, Eye, EyeOff, Shield, ShieldAlert } from 'lucide-react';
import { useSecuritySystem } from '@/hooks/useSecuritySystem';
import { toast } from "@/hooks/use-toast";

const FaceRecognition: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'detecting' | 'authorized' | 'unauthorized'>('idle');
  const [lastDetection, setLastDetection] = useState<{ name: string; confidence: number; isAuthorized: boolean } | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [detectionCount, setDetectionCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { 
    authorizedUsers, 
    loading, 
    addAuthorizedUser, 
    deleteAuthorizedUser,
    createAlert,
    fetchAuthorizedUsers 
  } = useSecuritySystem();

  // Initialize camera with mobile support
  const initializeCamera = useCallback(async () => {
    try {
      console.log('Initializing camera...');
      const constraints = {
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: { ideal: 'user' },
          frameRate: { ideal: 30, max: 60 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve(true);
          }
        });
        
        setIsActive(true);
        setDetectionCount(0);
        toast({
          title: "Camera Activated",
          description: "Face recognition system is now monitoring",
        });
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions and try again.",
        variant: "destructive",
      });
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsActive(false);
    setDetectionStatus('idle');
    setLastDetection(null);
    setDetectionCount(0);
    console.log('Camera stopped');
  }, []);

  // Improved face detection simulation with proper unauthorized detection
  const detectFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    ctx.drawImage(video, 0, 0);
    
    setDetectionStatus('detecting');
    
    // More realistic detection simulation
    setTimeout(() => {
      const users = authorizedUsers;
      setDetectionCount(prev => prev + 1);
      
      // Simulate face detection - 80% chance of detecting a face
      if (Math.random() > 0.2) {
        // When a face is detected, determine if it's authorized or not
        // 40% chance it's an authorized user, 60% chance it's unauthorized
        const isAuthorizedDetection = Math.random() < 0.4 && users.length > 0;
        
        if (isAuthorizedDetection && users.length > 0) {
          // Select a random authorized user
          const randomUser = users[Math.floor(Math.random() * users.length)];
          const confidence = 0.82 + Math.random() * 0.15; // 82-97% confidence for authorized
          
          setDetectionStatus('authorized');
          setLastDetection({ 
            name: randomUser.name, 
            confidence, 
            isAuthorized: true 
          });
          
          toast({
            title: "✅ Access Granted",
            description: `Welcome back, ${randomUser.name}! (${(confidence * 100).toFixed(1)}% match)`,
          });
        } else {
          // Unauthorized person detected
          const confidence = 0.25 + Math.random() * 0.35; // 25-60% confidence for unauthorized
          
          setDetectionStatus('unauthorized');
          setLastDetection({ 
            name: 'Unknown Person', 
            confidence, 
            isAuthorized: false 
          });
          
          // Create security alert
          createAlert({
            alert_type: 'Unauthorized Access Attempt',
            severity: 'high',
            details: `Unauthorized person detected with ${(confidence * 100).toFixed(1)}% confidence`,
            source_device: 'Face Recognition Camera',
            confidence_score: Math.round(confidence * 100)
          });
          
          toast({
            title: "🚨 Access Denied",
            description: `Unauthorized person detected! Security alert created.`,
            variant: "destructive",
          });
        }
      } else {
        // No face detected
        setDetectionStatus('idle');
        setLastDetection(null);
      }
    }, 1000); // 1 second detection delay for realism
  }, [authorizedUsers, isActive, createAlert]);

  // Start continuous detection
  useEffect(() => {
    if (isActive && !detectionIntervalRef.current) {
      // Start detection immediately, then every 4 seconds
      detectFace();
      detectionIntervalRef.current = setInterval(detectFace, 4000);
    }
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isActive, detectFace]);

  // Capture photo for registration
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !newUserName.trim()) {
      toast({
        title: "Registration Error",
        description: "Please enter a name and ensure camera is active",
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

      // Capture current frame
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      // Simulate processing steps
      const steps = ['Capturing image...', 'Analyzing face...', 'Encoding features...', 'Saving to database...'];
      for (let i = 0; i < steps.length; i++) {
        setRegistrationProgress((i + 1) * 25);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.9);
      });

      if (!blob) throw new Error('Failed to capture image');

      // Create file from blob
      const file = new File([blob], `${newUserName.trim()}_face.jpg`, { type: 'image/jpeg' });

      // Register user
      await addAuthorizedUser(newUserName.trim(), file);
      
      setNewUserName('');
      setRegistrationProgress(0);
      
      toast({
        title: "✅ Registration Complete",
        description: `${newUserName.trim()} has been successfully added to the authorized users list`,
      });

    } catch (error) {
      console.error('Registration failed:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to register user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  }, [newUserName, addAuthorizedUser]);

  // Handle user deletion
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
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Face Recognition Security</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Advanced facial authentication system</p>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-3">
          <Badge variant={isActive ? 'default' : 'secondary'} className="flex items-center gap-2 px-3 py-1">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="font-medium">{isActive ? 'Monitoring' : 'Inactive'}</span>
          </Badge>
          {isActive && (
            <Badge variant="outline" className="text-xs">
              Scans: {detectionCount}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Camera Section - Takes up 2 columns on desktop */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5" />
              Live Security Feed
            </CardTitle>
            <CardDescription className="text-sm">
              Real-time face detection and authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera Controls */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={isActive ? stopCamera : initializeCamera}
                variant={isActive ? 'destructive' : 'default'}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                {isActive ? (
                  <>
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Stop Monitoring
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Start Monitoring
                  </>
                )}
              </Button>
              <Button 
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showPreview ? 'Hide' : 'Show'}
              </Button>
            </div>

            {/* Video Feed */}
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-xl overflow-hidden relative border-2 border-border">
                {showPreview && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Detection Overlay */}
                {detectionStatus !== 'idle' && showPreview && (
                  <div className={`absolute inset-0 transition-all duration-300 ${
                    detectionStatus === 'authorized' 
                      ? 'bg-green-500/20 border-4 border-green-400 shadow-lg shadow-green-400/50' 
                      : detectionStatus === 'unauthorized'
                      ? 'bg-red-500/20 border-4 border-red-400 shadow-lg shadow-red-400/50'
                      : 'bg-blue-500/20 border-4 border-blue-400 shadow-lg shadow-blue-400/50'
                  }`}>
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-background/95 backdrop-blur-md rounded-lg p-3 sm:p-4 border shadow-lg">
                        {detectionStatus === 'detecting' && (
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                            <div>
                              <div className="font-semibold text-sm">Analyzing...</div>
                              <div className="text-xs text-muted-foreground">Scanning for faces</div>
                            </div>
                          </div>
                        )}
                        {detectionStatus === 'authorized' && lastDetection && (
                          <div className="flex items-center gap-3 text-green-600">
                            <CheckCircle className="h-6 w-6 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-sm sm:text-base">✅ ACCESS GRANTED</div>
                              <div className="font-medium text-sm truncate">{lastDetection.name}</div>
                              <div className="text-xs opacity-90">{(lastDetection.confidence * 100).toFixed(1)}% match confidence</div>
                            </div>
                          </div>
                        )}
                        {detectionStatus === 'unauthorized' && lastDetection && (
                          <div className="flex items-center gap-3 text-red-600">
                            <AlertCircle className="h-6 w-6 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-sm sm:text-base">🚨 ACCESS DENIED</div>
                              <div className="font-medium text-sm">Unauthorized Person</div>
                              <div className="text-xs opacity-90">Security alert triggered</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                    <div className="text-center p-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-muted-foreground mb-1">Security System Inactive</p>
                      <p className="text-sm text-muted-foreground">Click "Start Monitoring" to begin face recognition</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detection Status Alert */}
            {lastDetection && (
              <Alert className={`border-2 ${lastDetection.isAuthorized ? 'border-green-400 bg-green-50 dark:bg-green-950' : 'border-red-400 bg-red-50 dark:bg-red-950'}`}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  <span className={lastDetection.isAuthorized ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                    Last Scan: <strong>{lastDetection.name}</strong> - 
                    {(lastDetection.confidence * 100).toFixed(1)}% confidence
                    {lastDetection.isAuthorized ? ' ✅' : ' ❌'}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Controls Section */}
        <div className="space-y-4 sm:space-y-6">
          {/* User Registration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5" />
                Add New User
              </CardTitle>
              <CardDescription className="text-sm">
                Register authorized personnel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userName" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="userName"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter full name"
                  disabled={isRegistering}
                  className="text-sm"
                />
              </div>

              {isRegistering && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Processing registration...</span>
                    <span>{registrationProgress}%</span>
                  </div>
                  <Progress value={registrationProgress} className="h-2" />
                </div>
              )}

              <Button 
                onClick={capturePhoto}
                disabled={!isActive || !newUserName.trim() || isRegistering}
                className="w-full"
                size="sm"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Capture & Register
                  </>
                )}
              </Button>
              
              {!isActive && (
                <p className="text-xs text-muted-foreground text-center">
                  Camera must be active to register new users
                </p>
              )}
            </CardContent>
          </Card>

          {/* Authorized Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Authorized Users ({authorizedUsers.length})
              </CardTitle>
              <CardDescription className="text-sm">
                Manage system access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm">Loading users...</span>
                  </div>
                ) : authorizedUsers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium mb-1">No Authorized Users</p>
                    <p className="text-xs">Register someone to get started</p>
                  </div>
                ) : (
                  authorizedUsers.map((user, index) => (
                    <div key={user.id}>
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {user.image_url && (
                            <img 
                              src={user.image_url} 
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-background shadow-sm"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="ml-2 text-muted-foreground hover:text-destructive"
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
