
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, AlertTriangle, Wifi, Camera, Activity, Clock, CheckCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

interface SecurityDashboardProps {
  stats: {
    totalUsers: number;
    activeAlerts: number;
    esp32Status: 'online' | 'offline';
    cameraStatus: 'active' | 'inactive';
    systemHealth: number;
    lastUpdate: string;
  };
  onQuickAction: (action: string) => void;
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ stats, onQuickAction }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return 'bg-green-500';
      case 'offline':
      case 'inactive':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 80) return 'bg-green-500';
    if (health >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your security system</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(stats.esp32Status)}`}></div>
          <span className="text-sm text-muted-foreground">System Status</span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Authorized Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active personnel</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">Unresolved incidents</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ESP32 Status</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={stats.esp32Status === 'online' ? 'default' : 'destructive'}>
                {stats.esp32Status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Hardware connection</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Camera Status</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={stats.cameraStatus === 'active' ? 'default' : 'secondary'}>
                {stats.cameraStatus}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Face recognition ready</p>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Health</span>
          </CardTitle>
          <CardDescription>Overall system performance and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>System Health</span>
              <span>{stats.systemHealth}%</span>
            </div>
            <Progress value={stats.systemHealth} className="h-2" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Face Recognition</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Alert System</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Data Storage</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common security system operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => onQuickAction('face-recognition')}
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => onQuickAction('add-user')}
            >
              <Users className="h-4 w-4 mr-2" />
              Add User
            </Button>
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => onQuickAction('test-alert')}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Test Alert
            </Button>
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => onQuickAction('esp32-control')}
            >
              <Wifi className="h-4 w-4 mr-2" />
              ESP32 Control
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Update */}
      <div className="flex items-center justify-center text-sm text-muted-foreground">
        <Clock className="h-4 w-4 mr-2" />
        Last updated: {stats.lastUpdate}
      </div>
    </div>
  );
};

export default SecurityDashboard;
