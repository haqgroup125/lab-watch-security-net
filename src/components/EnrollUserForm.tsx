
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, UserCheck } from "lucide-react";
import { Label } from "@/components/ui/label";

export interface EnrollUserFormProps {
  newUserName: string;
  setNewUserName: (name: string) => void;
  isRegistering: boolean;
  registrationProgress: number;
  registerNewUser: () => void;
  isActive: boolean;
  cameraReady: boolean;
  modelsLoaded: boolean;
}

const EnrollUserForm: React.FC<EnrollUserFormProps> = ({
  newUserName,
  setNewUserName,
  isRegistering,
  registrationProgress,
  registerNewUser,
  isActive,
  cameraReady,
  modelsLoaded,
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2">
        <UserCheck className="h-5 w-5" />
        Enroll New User
      </CardTitle>
      <CardDescription>Register authorized personnel with real face descriptor</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="userName">Full Name</Label>
        <Input
          id="userName"
          value={newUserName}
          onChange={e => setNewUserName(e.target.value)}
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
        disabled={!isActive || !cameraReady || !modelsLoaded || !newUserName.trim() || isRegistering}
        className="w-full"
      >
        {isRegistering ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating Biometric Template...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Capture & Enroll (AI Biometric)
          </>
        )}
      </Button>
      {(!isActive || !cameraReady || !modelsLoaded) && (
        <p className="text-xs text-muted-foreground text-center">Camera and AI models must be ready to enroll users</p>
      )}
    </CardContent>
  </Card>
);

export default EnrollUserForm;

