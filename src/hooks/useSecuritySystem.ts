
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AuthorizedUser {
  id: string;
  name: string;
  image_url?: string;
  face_encoding?: any;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high';
  details?: string;
  image_url?: string;
  confidence_score?: number;
  detected_person?: string;
  source_device: string;
  created_at: string;
  acknowledged: boolean;
  acknowledged_at?: string;
}

export interface ESP32Device {
  id: string;
  device_name: string;
  ip_address?: string;
  mac_address?: string;
  status: 'online' | 'offline' | 'error';
  last_seen?: string;
  created_at: string;
}

export interface SystemSettings {
  detection_sensitivity: number;
  alert_threshold: number;
  auto_acknowledgment: boolean;
  notification_sounds: boolean;
  camera_resolution: string;
  detection_interval: number;
  max_detection_distance: number;
  face_confidence_threshold: number;
}

export const useSecuritySystem = () => {
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [esp32Devices, setESP32Devices] = useState<ESP32Device[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    detection_sensitivity: 75,
    alert_threshold: 65,
    auto_acknowledgment: false,
    notification_sounds: true,
    camera_resolution: '720p',
    detection_interval: 1000,
    max_detection_distance: 5,
    face_confidence_threshold: 70,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch authorized users
  const fetchAuthorizedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('authorized_users')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAuthorizedUsers(data || []);
    } catch (error) {
      console.error('Error fetching authorized users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch authorized users",
        variant: "destructive",
      });
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      const typedAlerts = (data || []).map(alert => ({
        ...alert,
        severity: alert.severity as 'low' | 'medium' | 'high'
      }));
      setAlerts(typedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch alerts",
        variant: "destructive",
      });
    }
  };

  // Fetch ESP32 devices
  const fetchESP32Devices = async () => {
    try {
      const { data, error } = await supabase
        .from('esp32_devices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      const typedDevices = (data || []).map(device => ({
        ...device,
        ip_address: device.ip_address as string,
        status: device.status as 'online' | 'offline' | 'error'
      }));
      setESP32Devices(typedDevices);
    } catch (error) {
      console.error('Error fetching ESP32 devices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ESP32 devices",
        variant: "destructive",
      });
    }
  };

  // Add authorized user
  const addAuthorizedUser = async (name: string, imageFile: File) => {
    setLoading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `faces/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('face-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('face-images')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('authorized_users')
        .insert({
          name,
          image_url: publicUrl,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `${name} has been added to authorized users`,
      });

      fetchAuthorizedUsers();
      return data;
    } catch (error) {
      console.error('Error adding authorized user:', error);
      toast({
        title: "Error",
        description: "Failed to add authorized user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete authorized user
  const deleteAuthorizedUser = async (userId: string, userName: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('authorized_users')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "User Removed",
        description: `${userName} has been removed from authorized users`,
      });

      fetchAuthorizedUsers();
    } catch (error) {
      console.error('Error deleting authorized user:', error);
      toast({
        title: "Error",
        description: "Failed to remove authorized user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create alert
  const createAlert = async (alertData: {
    alert_type: string;
    severity: 'low' | 'medium' | 'high';
    details?: string;
    detected_person?: string;
    source_device: string;
    confidence_score?: number;
  }) => {
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .insert(alertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Alert Created",
        description: `${alertData.alert_type} alert has been logged`,
        variant: alertData.severity === 'high' ? "destructive" : "default",
      });

      fetchAlerts();
      return data;
    } catch (error) {
      console.error('Error creating alert:', error);
      toast({
        title: "Error",
        description: "Failed to create alert",
        variant: "destructive",
      });
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ 
          acknowledged: true, 
          acknowledged_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Alert Acknowledged",
        description: "Alert has been marked as acknowledged",
      });

      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    }
  };

  // Send alert to ESP32
  const sendAlertToESP32 = async (deviceIp: string, alertData: any) => {
    try {
      const response = await fetch(`http://${deviceIp}/alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) throw new Error('Failed to send alert to ESP32');

      toast({
        title: "Alert Sent",
        description: `Alert sent to ESP32 device at ${deviceIp}`,
      });
    } catch (error) {
      console.error('Error sending alert to ESP32:', error);
      toast({
        title: "ESP32 Connection Error",
        description: `Failed to send alert to ESP32 at ${deviceIp}. Check device connection.`,
        variant: "destructive",
      });
    }
  };

  // Send alert to receiver devices
  const sendAlertToReceivers = async (alertData: any) => {
    try {
      const { data: receivers, error } = await supabase
        .from('alert_receivers')
        .select('*')
        .eq('status', 'online');

      if (error) throw error;

      const promises = receivers.map(async (receiver) => {
        try {
          const response = await fetch(`http://${receiver.ip_address}:${receiver.port}/alert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(alertData),
            signal: AbortSignal.timeout(3000),
          });
          return { receiver: receiver.device_name, success: response.ok };
        } catch (error) {
          return { receiver: receiver.device_name, success: false };
        }
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      
      toast({
        title: "Alert Broadcasted",
        description: `Alert sent to ${successCount}/${receivers.length} receiver devices`,
      });
    } catch (error) {
      console.error('Error sending alert to receivers:', error);
    }
  };

  // Update system settings
  const updateSystemSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      setSystemSettings(prev => ({ ...prev, ...newSettings }));
      
      // Store in localStorage for persistence
      localStorage.setItem('security_system_settings', JSON.stringify({
        ...systemSettings,
        ...newSettings
      }));

      toast({
        title: "Settings Updated",
        description: "System settings have been saved successfully",
      });
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast({
        title: "Error",
        description: "Failed to update system settings",
        variant: "destructive",
      });
    }
  };

  // Load system settings
  const loadSystemSettings = () => {
    try {
      const savedSettings = localStorage.getItem('security_system_settings');
      if (savedSettings) {
        setSystemSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  // Test all ESP32 devices
  const testAllESP32Devices = async () => {
    const results = [];
    for (const device of esp32Devices) {
      if (device.ip_address) {
        try {
          const response = await fetch(`http://${device.ip_address}/status`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
          });
          results.push({
            device: device.device_name,
            status: response.ok ? 'online' : 'error',
            ip: device.ip_address
          });
        } catch {
          results.push({
            device: device.device_name,
            status: 'offline',
            ip: device.ip_address
          });
        }
      }
    }
    
    const onlineCount = results.filter(r => r.status === 'online').length;
    toast({
      title: "Device Test Complete",
      description: `${onlineCount}/${results.length} ESP32 devices are online`,
    });
    
    return results;
  };

  // Initialize data fetching
  useEffect(() => {
    fetchAuthorizedUsers();
    fetchAlerts();
    fetchESP32Devices();
    loadSystemSettings();
  }, []);

  return {
    authorizedUsers,
    alerts,
    esp32Devices,
    systemSettings,
    loading,
    addAuthorizedUser,
    deleteAuthorizedUser,
    createAlert,
    acknowledgeAlert,
    sendAlertToESP32,
    sendAlertToReceivers,
    updateSystemSettings,
    testAllESP32Devices,
    fetchAuthorizedUsers,
    fetchAlerts,
    fetchESP32Devices,
  };
};
