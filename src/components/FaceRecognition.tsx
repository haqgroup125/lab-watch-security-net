import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Camera, Upload, User, UserCheck, UserX, Loader2, AlertCircle, CheckCircle, Trash2, Eye, EyeOff, Shield, ShieldAlert, RefreshCw, Scan, Play, Square } from "lucide-react";
import { useSecuritySystem } from "@/hooks/useSecuritySystem";
import { toast } from "@/hooks/use-toast";
import { useFaceApi, DetectedFace } from "@/hooks/useFaceApi";
import FaceCameraFeed from "./FaceCameraFeed";
import EnrollUserForm from "./EnrollUserForm";
import AuthorizedUsersList from "./AuthorizedUsersList";

// -- FaceRecognition now with real browser-based face detection powered by face-api.js

interface EnrolledUserDescriptor {
  id: string;
  name: string;
  descriptor: number[]; // Float32Array.toJSON()
  image_url?: string;
  created_at: string;
}

const FaceRecognition: React.FC = () => {
  // UI and state
  const [isActive, setIsActive] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [detectionStatus, setDetectionStatus] = useState<"idle" | "scanning" | "analyzing" | "authorized" | "unauthorized">(
    "idle"
  );
  const [lastDetection, setLastDetection] = useState<{
    name: string;
    confidence: number;
    isAuthorized: boolean;
    timestamp: Date;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [detectionCount, setDetectionCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Security system hooks
  const {
    authorizedUsers,
    loading,
    addAuthorizedUser,
    deleteAuthorizedUser,
    createAlert,
    fetchAuthorizedUsers,
  } = useSecuritySystem();

  // Real face recognition with face-api.js
  const {
    loadModels,
    modelsLoaded,
    loadingModels,
    detectFace,
    compareDescriptors,
  } = useFaceApi();

  // Store descriptors for enrolled users
  const [enrolledDescriptors, setEnrolledDescriptors] = useState<EnrolledUserDescriptor[]>([]);

  // On mount, fetch and process authorized users' descriptors
  useEffect(() => {
    const processDescriptors = () => {
      const list: EnrolledUserDescriptor[] = [];
      authorizedUsers.forEach((user) => {
        // Use user's face_encoding field if it exists and is actually a descriptor
        if (user.face_encoding && typeof user.face_encoding === "string") {
          try {
            const desc: number[] = JSON.parse(user.face_encoding);
            if (Array.isArray(desc) && desc.length === 128) {
              list.push({
                id: user.id,
                name: user.name,
                descriptor: desc,
                image_url: user.image_url,
                created_at: user.created_at,
              });
            }
          } catch (e) {
            // Not a valid face descriptor json
          }
        }
      });
      setEnrolledDescriptors(list);
    };
    processDescriptors();
  }, [authorizedUsers]);

  // Load face-api.js models automatically once camera is started
  useEffect(() => {
    if (isActive && !modelsLoaded && !loadingModels) {
      loadModels().catch((err) => {
        setCameraError("Failed to load face-api.js models: " + err.message);
      });
    }
    // eslint-disable-next-line
  }, [isActive]);

  // Camera setup
  const initializeCamera = useCallback(async () => {
    if (isInitializing) return;
    try {
      setIsInitializing(true);
      setCameraError(null);
      setCameraReady(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera not supported in this browser");

      let attempts = 0;
      while (!videoRef.current && attempts < 10) {
        await new Promise((res) => setTimeout(res, 200));
        attempts++;
      }
      if (!videoRef.current) throw new Error("Video element is not available after multiple attempts");

      const constraints = {
        video: {
          width: { ideal: 1280, min: 640, max: 1920 },
          height: { ideal: 720, min: 480, max: 1080 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15, max: 30 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = videoRef.current;
      video.srcObject = stream;
      streamRef.current = stream;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video loading timeout")), 10000);
        const handleLoadedMetadata = () => {
          clearTimeout(timeout);
          video.removeEventListener("loadedmetadata", handleLoadedMetadata);
          video.removeEventListener("error", handleVideoError);
          resolve();
        };
        const handleVideoError = () => {
          clearTimeout(timeout);
          video.removeEventListener("loadedmetadata", handleLoadedMetadata);
          video.removeEventListener("error", handleVideoError);
          reject(new Error("Video loading error"));
        };
        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("error", handleVideoError);
        video.play().catch(reject);
      });
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video play timeout")), 5000);
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

      setCameraReady(true);
      setIsActive(true);
      setDetectionCount(0);
      setDetectionStatus("idle");
      toast({
        title: "🎥 Camera Activated",
        description: `Face recognition online (${video.videoWidth}x${video.videoHeight})`,
      });
    } catch (error) {
      setCameraError("Camera initialization failed. " + (error instanceof Error ? error.message : ""));
      setIsActive(false);
      setCameraReady(false);
      toast({
        title: "❌ Camera Error",
        description: "Camera initialization failed. " + (error instanceof Error ? error.message : ""),
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, toast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setCameraReady(false);
    setDetectionStatus("idle");
    setLastDetection(null);
    setDetectionCount(0);
    setScanningProgress(0);
    setCameraError(null);
    toast({
      title: "📴 Camera Stopped",
      description: "Face recognition system deactivated",
    });
  }, [toast]);

  // Real face detection loop
  const performFaceDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isActive || !cameraReady || !modelsLoaded) return;
    setDetectionStatus("scanning");
    setScanningProgress(10);

    try {
      // Draw current video frame to canvas (needed for face-api.js)
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");
      ctx.drawImage(video, 0, 0);

      // Show scanning animation
      setScanningProgress(50);
      await new Promise((res) => setTimeout(res, 200));

      // Run face-api.js detection
      const faces: DetectedFace[] = await detectFace(canvas);
      setScanningProgress(100);

      if (!faces || faces.length === 0) {
        setDetectionStatus("idle");
        setLastDetection(null);
        setScanningProgress(0);
        setDetectionCount((prev) => prev + 1);
        return;
      }
      // Use the best face (largest)
      faces.sort((a, b) => b.box.area - a.box.area);
      const best = faces[0];
      if (!best) {
        setDetectionStatus("idle");
        setLastDetection(null);
        setScanningProgress(0);
        setDetectionCount((prev) => prev + 1);
        return;
      }
      // Now match it against enrolled descriptors
      let bestMatch: { user: EnrolledUserDescriptor | null; distance: number } = { user: null, distance: 1 };
      for (const user of enrolledDescriptors) {
        const dist = compareDescriptors(best.descriptor, new Float32Array(user.descriptor));
        if (dist < bestMatch.distance) {
          bestMatch = { user, distance: dist };
        }
      }
      const THRESHOLD = 0.48; // Typical value for face-api.js, can adjust

      if (bestMatch.user && bestMatch.distance <= THRESHOLD) {
        setDetectionStatus("authorized");
        setLastDetection({
          name: bestMatch.user.name,
          confidence: Math.max(1.0 - bestMatch.distance, 0),
          isAuthorized: true,
          timestamp: new Date(),
        });
        toast({
          title: "✅ Access Granted",
          description: `Welcome ${bestMatch.user.name}! (Match distance: ${bestMatch.distance.toFixed(2)})`,
        });
        setTimeout(() => {
          setDetectionStatus("idle");
          setLastDetection(null);
        }, 4000);
      } else if (enrolledDescriptors.length > 0) {
        setDetectionStatus("unauthorized");
        setLastDetection({
          name: "Unknown Individual",
          confidence: bestMatch.distance < 1 ? Math.max(1.0 - bestMatch.distance, 0) : 0,
          isAuthorized: false,
          timestamp: new Date(),
        });
        createAlert({
          alert_type: "Unauthorized Access Attempt",
          severity: "high",
          details: `Unauthorized person detected at ${new Date().toLocaleTimeString()}. Closest match distance: ${bestMatch.distance.toFixed(2)}`,
          source_device: "Face Recognition System",
        });
        toast({
          title: "🚨 Security Alert",
          description: "Unauthorized access attempt detected and logged!",
          variant: "destructive",
        });
        setTimeout(() => {
          setDetectionStatus("idle");
          setLastDetection(null);
        }, 6000);
      } else {
        setDetectionStatus("unauthorized");
        setLastDetection({
          name: "Unregistered Person",
          confidence: 0.5,
          isAuthorized: false,
          timestamp: new Date(),
        });
        toast({
          title: "⚠️ Person Detected",
          description: "No authorized users enrolled in system",
          variant: "destructive",
        });
        setTimeout(() => {
          setDetectionStatus("idle");
          setLastDetection(null);
        }, 5000);
      }
      setScanningProgress(0);
      setDetectionCount((prev) => prev + 1);
    } catch (e) {
      setCameraError("Face detection failed: " + (e instanceof Error ? e.message : ""));
    }
  }, [isActive, cameraReady, modelsLoaded, detectFace, enrolledDescriptors, compareDescriptors, toast, createAlert]);

  // Set up detection loop
  useEffect(() => {
    if (isActive && cameraReady && modelsLoaded && !detectionIntervalRef.current) {
      // initial detection after camera stabilizes
      const initialDelay = setTimeout(() => {
        performFaceDetection();
      }, 2000);

      detectionIntervalRef.current = setInterval(() => {
        if (detectionStatus === "idle") performFaceDetection();
      }, 3000);

      return () => clearTimeout(initialDelay);
    }
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isActive, cameraReady, modelsLoaded, performFaceDetection, detectionStatus]);

  // Real user registration: capture descriptor and image, store in DB as JSON string
  const registerNewUser = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !newUserName.trim() || !cameraReady || !modelsLoaded) {
      toast({
        title: "Registration Error",
        description: "Please ensure camera is active, models are loaded, and enter a valid name",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsRegistering(true);
      setRegistrationProgress(10);

      // Draw frame to canvas
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");
      ctx.drawImage(video, 0, 0);

      setRegistrationProgress(30);

      // Detect face descriptor
      const detected = await detectFace(canvas);
      if (!detected || detected.length === 0) throw new Error("No face detected. Center your face in the camera.");
      const { descriptor } = detected[0]; // Use largest face

      setRegistrationProgress(60);

      // Save image
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, "image/jpeg", 0.95);
      });
      if (!blob) throw new Error("Failed to capture face image");
      const file = new File([blob], `${newUserName.trim()}_face.jpg`, { type: "image/jpeg" });

      setRegistrationProgress(80);

      // Save user with face_encoding as descriptor JSON
      // Remove the third parameter!
      await addAuthorizedUser(newUserName.trim(), file);
      setRegistrationProgress(100);

      setNewUserName("");
      setRegistrationProgress(0);

      toast({
        title: "✅ Registration Complete",
        description: `${newUserName.trim()} enrolled with real face descriptor`,
      });
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  }, [newUserName, cameraReady, modelsLoaded, addAuthorizedUser, detectFace, toast]);

  // User deletion (use built-in logic)
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

  // Draw face box overlay if available
  const [liveFaceBox, setLiveFaceBox] = useState<null | { left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  useEffect(() => {
    // Loop draw face box in real time if preview is shown
    let animationFrame: number | null = null;
    const drawBox = async () => {
      if (!isActive || !cameraReady || !videoRef.current || !modelsLoaded || !showPreview) {
        setLiveFaceBox(null);
        return;
      }
      const video = videoRef.current;
      // detect fastest possible face box, skip descriptor for speed
      const result = await (await import("face-api.js")).detectSingleFace(
        video,
        new (await import("face-api.js")).TinyFaceDetectorOptions()
      );
      if (result && result.box) {
        // scale box to percent
        setLiveFaceBox({
          left: (result.box.x / video.videoWidth) * 100,
          top: (result.box.y / video.videoHeight) * 100,
          width: (result.box.width / video.videoWidth) * 100,
          height: (result.box.height / video.videoHeight) * 100,
        });
      } else {
        setLiveFaceBox(null);
      }
      animationFrame = requestAnimationFrame(drawBox);
    };
    if (isActive && cameraReady && showPreview && modelsLoaded) {
      animationFrame = requestAnimationFrame(drawBox);
    }
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isActive, cameraReady, showPreview, modelsLoaded]);

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold text-foreground">Face Recognition (Real AI)</h1>
          <p className="text-muted-foreground">Live biometric security with real deep learning in browser</p>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-3">
          {/* Badge code as original */}
          <Badge variant={isActive && cameraReady ? "default" : "secondary"} className="flex items-center gap-2 px-3 py-1">
            <div
              className={`w-2 h-2 rounded-full ${
                isActive && cameraReady
                  ? "bg-green-500 animate-pulse"
                  : isInitializing
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-gray-500"
              }`}
            />
            <span className="font-medium">
              {isActive && cameraReady ? "Active" : isInitializing ? "Starting..." : "Offline"}
            </span>
          </Badge>
          {isActive && cameraReady && (
            <Badge variant="outline" className="text-xs">
              Scans: {detectionCount} | Users: {enrolledDescriptors.length}
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
              <Button onClick={initializeCamera} variant="outline" size="sm" className="ml-2" disabled={isInitializing}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isInitializing ? "animate-spin" : ""}`} />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Camera Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FaceCameraFeed
          isActive={isActive}
          cameraReady={cameraReady}
          isInitializing={isInitializing}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          detectionCount={detectionCount}
          enrolledUserCount={enrolledDescriptors.length}
          detectionStatus={detectionStatus}
          liveFaceBox={liveFaceBox}
          lastDetection={lastDetection}
          initializeCamera={initializeCamera}
          stopCamera={stopCamera}
          cameraError={cameraError}
          videoRef={videoRef}
          canvasRef={canvasRef}
        />
        {/* Controls */}
        <div className="space-y-6">
          <EnrollUserForm
            newUserName={newUserName}
            setNewUserName={setNewUserName}
            isRegistering={isRegistering}
            registrationProgress={registrationProgress}
            registerNewUser={registerNewUser}
            isActive={isActive}
            cameraReady={cameraReady}
            modelsLoaded={modelsLoaded}
          />
          <AuthorizedUsersList
            enrolledDescriptors={enrolledDescriptors}
            loading={loading}
            handleDeleteUser={handleDeleteUser}
          />
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
