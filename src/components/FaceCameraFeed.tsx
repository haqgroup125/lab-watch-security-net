
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, EyeOff, Eye, Shield, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LiveFaceBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DetectionInfo {
  name: string;
  confidence: number;
  isAuthorized: boolean;
  timestamp: Date;
}

type DetectionStatus = "idle" | "scanning" | "analyzing" | "authorized" | "unauthorized";

export interface FaceCameraFeedProps {
  isActive: boolean;
  cameraReady: boolean;
  isInitializing: boolean;
  showPreview: boolean;
  setShowPreview: (v: boolean) => void;
  detectionCount: number;
  enrolledUserCount: number;
  detectionStatus: DetectionStatus;
  liveFaceBox: LiveFaceBox | null;
  lastDetection: DetectionInfo | null;
  initializeCamera: () => void;
  stopCamera: () => void;
  cameraError: string | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const FaceCameraFeed: React.FC<FaceCameraFeedProps> = ({
  isActive,
  cameraReady,
  isInitializing,
  showPreview,
  setShowPreview,
  detectionCount,
  enrolledUserCount,
  detectionStatus,
  liveFaceBox,
  lastDetection,
  initializeCamera,
  stopCamera,
  cameraError,
  videoRef,
  canvasRef,
}) => (
  <Card className="lg:col-span-2">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2">
        <span>
          {/* Camera icon */}
          <svg width="20" height="20" className="inline mr-1" viewBox="0 0 24 24"><g><rect fill="none" height="24" width="24"/><path d="M20,5h-3.17l-1.84-2.63C14.76,2.13,14.39,2,14,2H10c-0.39,0-0.76,0.13-1.04,0.38L7.17,5H4C2.9,5,2,5.9,2,7v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V7C22,5.9,21.1,5,20,5z M20,19H4V7h4.05l1.83-2.61l0.01,0C10.15,4.16,10.57,4,11,4h2c0.43,0,0.85,0.16,1.12,0.39l0.01,0L15.95,7H20V19z"/><circle cx="12" cy="14" r="3.2"/></g></svg>
        </span>
        Live Security Feed (AI-Powered)
      </CardTitle>
      <CardDescription>True deep learning face recognition in the browser</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={isActive ? stopCamera : initializeCamera}
          variant={isActive ? "destructive" : "default"}
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
          {showPreview ? "Hide Feed" : "Show Feed"}
        </Button>
      </div>
      {/* Video Feed */}
      <div className="relative">
        <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden relative border-2 border-border">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-all duration-700 ${
              isActive && showPreview && cameraReady ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
            style={{
              transform: isActive && showPreview && cameraReady ? "scaleX(-1)" : "scaleX(-1) scale(0.95)",
              filter: "contrast(1.1) brightness(1.05)",
            }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Real face detection overlay and label */}
          {isActive && cameraReady && showPreview && liveFaceBox && (
            <>
              <div
                className="absolute border-4 rounded-lg"
                style={{
                  left: `${liveFaceBox.left}%`,
                  top: `${liveFaceBox.top}%`,
                  width: `${liveFaceBox.width}%`,
                  height: `${liveFaceBox.height}%`,
                  borderColor:
                    detectionStatus === "authorized"
                      ? "limegreen"
                      : detectionStatus === "unauthorized"
                      ? "#f44141"
                      : "#4f8bf4",
                  zIndex: 10,
                  boxShadow:
                    detectionStatus === "authorized"
                      ? "0 0 24px 3px #00ff00aa"
                      : detectionStatus === "unauthorized"
                      ? "0 0 24px 3px #ff3c3caa"
                      : "0 0 12px 2px #4f8bf444",
                  pointerEvents: "none",
                }}
              />
              {(detectionStatus === "authorized" || detectionStatus === "unauthorized") &&
                lastDetection && (
                  <div
                    className="absolute"
                    style={{
                      left: `${liveFaceBox.left}%`,
                      top: `${Math.max(liveFaceBox.top - 7, 0)}%`,
                      width: `${liveFaceBox.width}%`,
                      textAlign: "center",
                      zIndex: 20,
                      fontFamily: "monospace, monospace",
                    }}
                  >
                    <span
                      className="text-base font-semibold px-2 py-0.5 rounded shadow"
                      style={{
                        background:
                          detectionStatus === "authorized"
                            ? "rgba(50,250,50,0.82)"
                            : "rgba(250,60,60,0.82)",
                        color: "#fff",
                        border:
                          detectionStatus === "authorized"
                            ? "2px solid #05f705"
                            : "2px solid #fa3c3c",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {detectionStatus === "authorized" ? lastDetection.name : "Unknown"}{" "}
                      {(lastDetection.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
            </>
          )}

          {/* Loading overlay */}
          {isActive && !cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm">
              <div className="text-center p-6">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
                <p className="font-medium text-xl text-white mb-1">
                  Initializing biometric sensors and AI models...
                </p>
                <p className="text-sm text-gray-300">Loading deep learning face recognition...</p>
              </div>
            </div>
          )}
          {/* Offline overlay */}
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900/90 to-slate-800/90">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                  <Shield className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="font-bold text-xl text-white mb-2">Security System Offline</p>
                <p className="text-sm text-gray-300 mb-4">Face recognition monitoring is currently disabled</p>
                <Button onClick={initializeCamera} variant="secondary" size="sm" disabled={isInitializing}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Monitoring
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Detection Status alert */}
      {lastDetection && (
        <Alert
          className={`border-2 transition-all duration-300 ${
            lastDetection.isAuthorized
              ? "border-green-400 bg-green-50 dark:bg-green-950"
              : "border-red-400 bg-red-50 dark:bg-red-950"
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <div>
                <span
                  className={`font-semibold ${
                    lastDetection.isAuthorized
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {lastDetection.name}
                </span>
                <span className="text-sm ml-2">{(lastDetection.confidence * 100).toFixed(1)}% biometric confidence</span>
              </div>
              <span className="text-xs text-muted-foreground">{lastDetection.timestamp.toLocaleTimeString()}</span>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {/* Error alert (show only at bottom) */}
      {cameraError && (
        <Alert className="border-red-400 bg-red-50 dark:bg-red-950">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="text-red-700 dark:text-red-300">{cameraError}</span>
              <Button onClick={initializeCamera} variant="outline" size="sm" className="ml-2" disabled={isInitializing}>
                <Loader2 className={`h-4 w-4 mr-1 ${isInitializing ? "animate-spin" : ""}`} />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {/* Scans/users badge row */}
      <div className="flex items-center justify-end gap-2">
        <div className="text-xs bg-muted px-2 py-1 rounded">
          Scans: {detectionCount} | Users: {enrolledUserCount}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default FaceCameraFeed;

