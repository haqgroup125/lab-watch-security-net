
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Camera, Users, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FaceRecognition = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(true);

  const authorizedUsers = [
    { id: 1, name: "Dr. Smith", confidence: 98, lastSeen: "2 hours ago", status: "active" },
    { id: 2, name: "Lab Assistant", confidence: 95, lastSeen: "1 day ago", status: "active" },
    { id: 3, name: "Student John", confidence: 92, lastSeen: "3 days ago", status: "inactive" },
  ];

  const recentDetections = [
    { time: "14:32", person: "Unknown", confidence: 0, status: "blocked" },
    { time: "12:15", person: "Dr. Smith", confidence: 98, status: "authorized" },
    { time: "09:43", person: "Lab Assistant", confidence: 95, status: "authorized" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Camera Feed */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-blue-400" />
              <span>Live Camera Feed</span>
            </div>
            <Badge variant={recognitionActive ? "default" : "secondary"}>
              {recognitionActive ? "Active" : "Paused"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video bg-slate-700 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
            <div className="text-center z-10">
              <Camera className="h-16 w-16 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-400">Camera feed would appear here</p>
              <p className="text-xs text-slate-500 mt-1">ML Kit face detection active</p>
            </div>
            {recognitionActive && (
              <div className="absolute top-4 left-4">
                <div className="flex items-center space-x-2 bg-green-500/20 px-2 py-1 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-xs">DETECTING</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => setRecognitionActive(!recognitionActive)}
              variant={recognitionActive ? "destructive" : "default"}
              className="flex-1"
            >
              {recognitionActive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {recognitionActive ? "Pause Recognition" : "Start Recognition"}
            </Button>
            <Button variant="outline" onClick={() => setIsRecording(!isRecording)}>
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Recognition Accuracy</div>
              <div className="text-xl font-bold text-green-400">94%</div>
              <Progress value={94} className="mt-1" />
            </div>
            <div>
              <div className="text-slate-400">Processing Speed</div>
              <div className="text-xl font-bold text-blue-400">15 FPS</div>
              <Progress value={75} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authorized Users */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-400" />
              <span>Authorized Users</span>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {authorizedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">{user.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="font-medium text-white">{user.name}</div>
                  <div className="text-sm text-slate-400">Last seen: {user.lastSeen}</div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <Badge variant={user.status === "active" ? "default" : "secondary"}>
                  {user.status}
                </Badge>
                <div className="text-xs text-slate-400">{user.confidence}% match</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Detections */}
      <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Eye className="h-5 w-5 text-yellow-400" />
            <span>Recent Detections</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentDetections.map((detection, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-slate-400">{detection.time}</div>
                  <div className="font-medium text-white">{detection.person}</div>
                  {detection.confidence > 0 && (
                    <div className="text-sm text-slate-400">Confidence: {detection.confidence}%</div>
                  )}
                </div>
                <Badge 
                  variant={detection.status === "authorized" ? "default" : "destructive"}
                >
                  {detection.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceRecognition;
