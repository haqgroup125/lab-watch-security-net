
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Camera, Upload, User, UserCheck, UserX, Loader2, AlertCircle, CheckCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { useSecuritySystem } from '@/hooks/useSecuritySystem';
import { toast } from "@/hooks/use-toast";

const FaceRecognition: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'detecting' | 'authorized' | 'unauthorized'>('idle');
  const [lastDetection, setLastDetection] = useState<{ name: string; confidence: number } | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { 
    authorizedUsers, 
    loading, 
    addAuthorizedUser, 
    deleteAuthorizedUser,
    fetchAuthorizedUsers 
  } = useSecuritySystem();

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      console.log('Initializing camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
        toast({
          title: "Camera activated",
          description: "Face recognition is now active",
        });
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
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
    console.log('Camera stopped');
  }, []);

  // Simulate face detection (replace with actual face recognition library)
  const detectFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame
    ctx.drawImage(video, 0, 0);
    
    // Simulate face detection with random results for demo
    const simulateDetection = () => {
      const users = authorizedUsers;
      if (users.length === 0) {
        setDetectionStatus('unauthorized');
        setLastDetection({ name: 'Unknown Person', confidence: 0.65 });
        return;
      }

      // Simulate finding a face 70% of the time
      if (Math.random() > 0.3) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const confidence = 0.85 + Math.random() * 0.1; // 85-95% confidence
        
        setDetectionStatus('authorized');
        setLastDetection({ name: randomUser.name, confidence });
        
        toast({
          title: "Access Granted",
          description: `Welcome, ${randomUser.name}! (${(confidence * 100).toFixed(1)}% match)`,
        });
      } else {
        setDetectionStatus('unauthorized');
        setLastDetection({ name: 'Unknown Person', confidence: 0.45 });
        
        toast({
          title: "Access Denied",
          description: "Unauthorized person detected",
          variant: "destructive",
        });
      }
    };

    // Run detection every 3 seconds when active
    if (!detectionIntervalRef.current && isActive) {
      detectionIntervalRef.current = setInterval(simulateDetection, 3000);
    }
  }, [authorizedUsers, isActive]);

  // Start face detection
  const startDetection = useCallback(() => {
    if (isActive && videoRef.current) {
      setDetectionStatus('detecting');
      detectFace();
    }
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
      for (let i = 0; i <= 100; i += 20) {
        setRegistrationProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.8);
      });

      if (!blob) throw new Error('Failed to capture image');

      // Create file from blob
      const file = new File([blob], `${newUserName}_face.jpg`, { type: 'image/jpeg' });

      // Register user
      await addAuthorizedUser(newUserName.trim(), file);
      
      setNewUserName('');
      setRegistrationProgress(0);
      
      toast({
        title: "Registration Successful",
        description: `${newUserName} has been registered successfully`,
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
        description: `${userName} has been removed from the system`,
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

  // Start detection when video is loaded
  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.addEventListener('loadeddata', startDetection);
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadeddata', startDetection);
        }
      };
    }
  }, [isActive, startDetection]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Face Recognition</h1>
          <p className="text-muted-foreground">Secure access control with facial authentication</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isActive ? 'default' : 'secondary'} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Section */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Live Camera Feed
            </CardTitle>
            <CardDescription>
              Real-time face detection and recognition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera Controls */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={isActive ? stopCamera : initializeCamera}
                variant={isActive ? 'destructive' : 'default'}
                size="sm"
              >
                {isActive ? 'Stop Camera' : 'Start Camera'}
              </Button>
              <Button 
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                size="sm"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>

            {/* Video Feed */}
            <div className="relative">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                {showPreview && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Detection Overlay */}
                {detectionStatus !== 'idle' && showPreview && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    detectionStatus === 'authorized' 
                      ? 'bg-green-500/20 border-4 border-green-500' 
                      : detectionStatus === 'unauthorized'
                      ? 'bg-red-500/20 border-4 border-red-500'
                      : 'bg-blue-500/20 border-4 border-blue-500'
                  }`}>
                    <div className="bg-background/90 backdrop-blur-sm rounded-lg p-4 text-center">
                      {detectionStatus === 'detecting' && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span className="font-medium">Detecting...</span>
                        </div>
                      )}
                      {detectionStatus === 'authorized' && lastDetection && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <div>
                            <div className="font-medium">Access Granted</div>
                            <div className="text-sm">{lastDetection.name}</div>
                            <div className="text-xs">{(lastDetection.confidence * 100).toFixed(1)}% match</div>
                          </div>
                        </div>
                      )}
                      {detectionStatus === 'unauthorized' && lastDetection && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-5 w-5" />
                          <div>
                            <div className="font-medium">Access Denied</div>
                            <div className="text-sm">{lastDetection.name}</div>
                            <div className="text-xs">{(lastDetection.confidence * 100).toFixed(1)}% confidence</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Camera Inactive</p>
                      <p className="text-sm text-muted-foreground">Click "Start Camera" to begin</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detection Status */}
            {lastDetection && (
              <Alert className={detectionStatus === 'authorized' ? 'border-green-500' : 'border-red-500'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Last Detection: <strong>{lastDetection.name}</strong> - 
                  {(lastDetection.confidence * 100).toFixed(1)}% confidence
                  {detectionStatus === 'authorized' ? ' ✓' : ' ✗'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Controls Section */}
        <div className="space-y-6">
          {/* User Registration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Register New User
              </CardTitle>
              <CardDescription>
                Add authorized personnel to the system
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
                    <span>Processing...</span>
                    <span>{registrationProgress}%</span>
                  </div>
                  <Progress value={registrationProgress} />
                </div>
              )}

              <Button 
                onClick={capturePhoto}
                disabled={!isActive || !newUserName.trim() || isRegistering}
                className="w-full"
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
            </CardContent>
          </Card>

          {/* Authorized Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Authorized Users ({authorizedUsers.length})
              </CardTitle>
              <CardDescription>
                Manage authorized personnel access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Loading users...
                  </div>
                ) : authorizedUsers.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <UserX className="h-8 w-8 mx-auto mb-2" />
                    <p>No authorized users</p>
                    <p className="text-sm">Register someone to get started</p>
                  </div>
                ) : (
                  authorizedUsers.map((user, index) => (
                    <div key={user.id}>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {user.image_url && (
                            <img 
                              src={user.image_url} 
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.name)}
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
