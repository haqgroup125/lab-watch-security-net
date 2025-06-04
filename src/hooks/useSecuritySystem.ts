
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

export const useSecuritySystem = () => {
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [esp32Devices, setESP32Devices] = useState<ESP32Device[]>([]);
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
        .limit(20);
      
      if (error) throw error;
      // Type assertion to ensure proper typing
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
      // Type assertion to ensure proper typing
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
      // Upload image to storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `faces/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('face-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('face-images')
        .getPublicUrl(filePath);

      // Insert user record
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

  // Send alert to ESP32
  const sendAlertToESP32 = async (deviceIp: string, alertData: any) => {
    try {
      const response = await fetch(`http://${deviceIp}/alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
      });

      if (!response.ok) throw new Error('Failed to send alert to ESP32');

      toast({
        title: "Alert Sent",
        description: `Alert sent to ESP32 device at ${deviceIp}`,
      });
    } catch (error) {
      console.error('Error sending alert to ESP32:', error);
      toast({
        title: "Error",
        description: `Failed to send alert to ESP32 at ${deviceIp}`,
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

  // Initialize data fetching
  useEffect(() => {
    fetchAuthorizedUsers();
    fetchAlerts();
    fetchESP32Devices();
  }, []);

  return {
    authorizedUsers,
    alerts,
    esp32Devices,
    loading,
    addAuthorizedUser,
    createAlert,
    sendAlertToESP32,
    sendAlertToReceivers,
    fetchAuthorizedUsers,
    fetchAlerts,
    fetchESP32Devices,
  };
};
