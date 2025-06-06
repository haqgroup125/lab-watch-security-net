
# 🔒 Professional Security System - Complete Guide

## 🚀 Project Overview

A **production-ready security system** with **REAL face recognition**, ESP32 hardware integration, and multi-device alert network. Perfect for labs, offices, or any facility requiring automated access control.

### 🎯 Key Features
- ✅ **Real-time face recognition** using device cameras
- ✅ **Hardware integration** with ESP32, LCD, buzzer, and sensors  
- ✅ **Multi-device alert system** with instant notifications
- ✅ **Authorized user management** with photo upload
- ✅ **Comprehensive logging** and security analytics
- ✅ **Mobile-responsive** design for all devices
- ✅ **Production-ready** with error handling and monitoring

---

## 📱 System Architecture

### **App 1: Main Security Dashboard**
- **URL**: `http://localhost:8080/` (or your domain)
- **Features**: Face recognition, user management, alert monitoring, ESP32 control

### **App 2: Alert Receiver** 
- **URL**: `http://localhost:8080/alert-receiver` (separate device)
- **Features**: Full-screen alerts, audio notifications, multi-device support

### **ESP32 Hardware Module**
- **Features**: LCD display, buzzer alerts, motion detection, WiFi connectivity

---

## 🛠️ Complete Hardware Setup

### **Required Components**

| Component | Quantity | Specification | Purpose |
|-----------|----------|---------------|---------|
| ESP32 Development Board | 1 | Any variant (ESP32-WROOM, NodeMCU) | Main controller |
| 16x2 LCD Display | 1 | I2C interface (with backpack) | Status display |
| Active Buzzer | 1 | 3.3V compatible | Audio alerts |
| PIR Motion Sensor | 1 | HC-SR501 or similar | Motion detection |
| LED | 1 | Any color, 3mm or 5mm | Visual indicator |
| Resistors | 2 | 220Ω for LED, 10kΩ pullup | Current limiting |
| Breadboard | 1 | Half-size or full-size | Component mounting |
| Jumper Wires | 20+ | Male-to-male, male-to-female | Connections |
| Power Supply | 1 | 5V 2A adapter or USB | Power source |

### **Detailed Wiring Diagram**

```
ESP32 Pin Assignment & Connections:

Power Distribution:
├── 3.3V  → LCD VCC, PIR VCC, Breadboard (+)
├── 5V    → Available for external power
└── GND   → LCD GND, PIR GND, Buzzer (-), LED (-), Breadboard (-)

Digital I/O:
├── GPIO 21 (SDA) → LCD SDA (I2C Data Line)
├── GPIO 22 (SCL) → LCD SCL (I2C Clock Line)  
├── GPIO 2        → Buzzer Positive (+)
├── GPIO 4        → PIR Sensor OUT pin
├── GPIO 5        → LED Anode (+) → 220Ω Resistor → GND
└── GPIO 0        → (Reserved for programming)

I2C Bus (for LCD):
├── SDA: GPIO 21 → LCD SDA pin
├── SCL: GPIO 22 → LCD SCL pin
├── VCC: 3.3V    → LCD VCC pin  
└── GND: GND     → LCD GND pin

Motion Detection:
├── PIR VCC → 3.3V
├── PIR GND → GND
└── PIR OUT → GPIO 4

Alert Systems:
├── Buzzer (+) → GPIO 2
├── Buzzer (-) → GND
├── LED Anode → GPIO 5 → 220Ω Resistor
└── LED Cathode → GND
```

### **Step-by-Step Assembly**

#### **1. LCD Display Connection (I2C)**
```
LCD Pin    ESP32 Pin    Wire Color (Suggested)
VCC        3.3V         Red
GND        GND          Black  
SDA        GPIO 21      Blue
SCL        GPIO 22      Yellow
```

#### **2. PIR Motion Sensor**
```
PIR Pin    ESP32 Pin    Wire Color
VCC        3.3V         Red
GND        GND          Black
OUT        GPIO 4       Green
```

#### **3. Active Buzzer**
```
Buzzer Pin    ESP32 Pin    Wire Color
Positive      GPIO 2       Orange
Negative      GND          Black
```

#### **4. Status LED** 
```
Component     ESP32 Pin    Notes
LED Anode  →  GPIO 5    →  Through 220Ω resistor
LED Cathode → GND       →  Direct connection
```

### **Power Requirements**

| Component | Voltage | Current | Notes |
|-----------|---------|---------|-------|
| ESP32 | 3.3V | 80-200mA | WiFi active |
| LCD Display | 3.3V | 20mA | With backlight |
| PIR Sensor | 3.3V | 5mA | Standby mode |
| Active Buzzer | 3.3V | 30mA | When active |
| LED | 3.3V | 10mA | Through resistor |
| **Total** | **3.3V** | **~350mA** | **Peak consumption** |

---

## 💻 Software Installation

### **1. Arduino IDE Setup**

1. **Install Arduino IDE** (latest version)
2. **Add ESP32 Board Support**:
   - File → Preferences → Additional Board Manager URLs
   - Add: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Tools → Board → Boards Manager → Search "ESP32" → Install

3. **Install Required Libraries**:
   ```
   Library Manager (Ctrl+Shift+I):
   ├── WiFi (built-in)
   ├── WebServer (built-in) 
   ├── ArduinoJson by Benoit Blanchon (v6.x)
   └── LiquidCrystal_I2C by Frank de Brabander
   ```

### **2. ESP32 Code Upload**

1. **Open** `ESP32_Security_Alert_System.ino` in Arduino IDE
2. **Configure WiFi** (lines 8-9):
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. **Select Board**: Tools → Board → ESP32 → ESP32 Dev Module
4. **Select Port**: Tools → Port → (your ESP32 port)
5. **Upload Code**: Click Upload button (→)

### **3. Find Device IP Address**

After upload, check Serial Monitor (Ctrl+Shift+M) at 115200 baud:
```
Security System Starting...
WiFi connected!
IP address: 192.168.1.XXX
ESP32 Security Alert System Ready
```

---

## 🌐 Web Application Setup

### **1. Install Dependencies**

```bash
# Clone or download the project
npm install

# Install additional dependencies if needed
npm install @supabase/supabase-js
npm install lucide-react
```

### **2. Database Setup (Supabase)**

1. **Create Supabase Account**: https://supabase.com
2. **Create New Project**
3. **Run Database Migration**:

```sql
-- Create authorized_users table
CREATE TABLE public.authorized_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  face_encoding JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create security_alerts table  
CREATE TABLE public.security_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  details TEXT,
  image_url TEXT,
  confidence_score INTEGER,
  detected_person TEXT,
  source_device TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create esp32_devices table
CREATE TABLE public.esp32_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_name TEXT NOT NULL,
  ip_address INET,
  mac_address TEXT,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create alert_receivers table
CREATE TABLE public.alert_receivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_name TEXT NOT NULL,
  ip_address INET,
  port INTEGER DEFAULT 8080,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create storage bucket for face images
INSERT INTO storage.buckets (id, name, public) VALUES ('face-images', 'face-images', true);

-- Enable Row Level Security (optional)
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esp32_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_receivers ENABLE ROW LEVEL SECURITY;
```

### **3. Environment Configuration**

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **4. Start Application**

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

---

## 🔧 System Configuration

### **1. ESP32 Device Registration**

1. **Access Main Dashboard**: http://localhost:8080
2. **Go to ESP32 Control tab**
3. **Enter Device IP**: (from Serial Monitor)
4. **Click "Connect"** to verify communication
5. **Test Alert** to confirm hardware functionality

### **2. Face Recognition Setup**

#### **Adding Authorized Users**:
1. **Navigate to Face Recognition tab**
2. **Click "Add User"**
3. **Enter full name**
4. **Upload clear photo** (requirements below)
5. **Click "Add Authorized User"**

#### **Photo Requirements for Best Recognition**:
- ✅ **Clear, well-lit face** (front-facing)
- ✅ **High resolution** (minimum 400x400 pixels)
- ✅ **No obstructions** (remove glasses/hats if possible)
- ✅ **Neutral expression** with eyes open
- ✅ **Single person** in photo
- ✅ **Multiple angles** (optional, for better accuracy)

### **3. Camera Configuration**

#### **Desktop/Laptop**:
- **Permission**: Allow camera access when prompted
- **Quality**: Automatic HD selection (1280x720)
- **Frame Rate**: 30 FPS for smooth detection

#### **Mobile Devices**:
- **Front Camera**: Default for face recognition
- **Back Camera**: Available via "Switch Camera" button
- **Resolution**: Optimized for mobile (640x480)
- **Portrait Mode**: Responsive design adaptation

---

## 🚨 Alert System Operation

### **Detection Flow**

```
1. Camera Capture → 2. Face Detection → 3. Feature Extraction → 
4. Database Comparison → 5. Authorization Decision → 6. Alert Routing
```

### **Alert Distribution**

When an unauthorized face is detected:

1. **Main Dashboard**: Real-time alert in detection log
2. **Alert Receiver**: Full-screen notification with sound
3. **ESP32 Device**: LCD display message + buzzer alarm
4. **Database**: Security event stored for audit trail

### **Alert Severity Levels**

| Level | Color | Response | Example |
|-------|-------|----------|---------|
| **High** | 🔴 Red | Full screen alert, persistent notification, buzzer (extended) | Unauthorized face detection | 
| **Medium** | 🟠 Amber | Standard notification, buzzer (short) | Motion detection without face match |
| **Low** | 🟢 Green | Log entry only | System test, authorized access |

---

## 📊 Troubleshooting

### **ESP32 Issues**

| Problem | Solution |
|---------|----------|
| **Device not connecting** | - Verify WiFi credentials<br>- Check ESP32 power source<br>- Restart device |
| **LCD not displaying** | - Check I2C wiring<br>- Verify 3.3V connection<br>- Confirm SDA/SCL pins are correct |
| **Buzzer not sounding** | - Check pin connection<br>- Verify polarity<br>- Test with direct power (3.3V) briefly |
| **Motion sensor false triggers** | - Adjust sensitivity screw<br>- Reposition away from heat sources<br>- Add delay in code |

### **Camera Issues**

| Problem | Solution |
|---------|----------|
| **Permission denied** | - Clear browser cache<br>- Check browser settings<br>- Try different browser |
| **Camera not starting** | - Ensure no other apps use camera<br>- Refresh page<br>- Check console for errors |
| **Poor recognition** | - Improve lighting<br>- Use higher quality photos<br>- Check camera focus |

### **Network Issues**

| Problem | Solution |
|---------|----------|
| **ESP32 not reachable** | - Verify same WiFi network<br>- Check firewall settings<br>- Ping device IP to confirm connectivity |
| **Alerts not triggering** | - Check network latency<br>- Verify request format<br>- Confirm endpoint URLs |

---

## 📱 Mobile Installation Guide

To install the main security app on mobile devices:

### **Android**
1. **Open Chrome** on your Android device
2. **Visit** application URL
3. **Menu** (three dots) → **Add to Home screen**
4. **Name** the application → **Add**
5. **Grant Permissions** when prompted

### **iOS**
1. **Open Safari** on your iOS device
2. **Visit** application URL
3. **Share button** → **Add to Home Screen**
4. **Name** the application → **Add**
5. **Grant Permissions** when prompted

---

## 📖 Developer Reference

### **Key Libraries & Dependencies**

| Library | Version | Purpose |
|---------|---------|---------|
| React.js | ^18.3.1 | Frontend framework |
| Supabase | ^2.49.10 | Database & authentication |
| Tailwind CSS | ^3.x | UI styling |
| TypeScript | ^5.x | Type safety |
| Lucide Icons | ^0.462.0 | UI icons |

### **API Endpoints - Web Application**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/users` | GET | Retrieve authorized users |
| `/api/alerts` | GET/POST | Manage security alerts |
| `/api/devices` | GET/POST | Manage ESP32 devices |

### **API Endpoints - ESP32 Device**

| Endpoint | Method | Description | Example Payload |
|----------|--------|-------------|----------------|
| `/alert` | POST | Send security alert | `{"type":"unauthorized_face","severity":"high"}` |
| `/status` | GET | Device health check | N/A |
| `/config` | POST | Update settings | `{"buzzer_enabled":true,"lcd_enabled":true}` |
| `/reboot` | POST | Restart device | N/A |

---

## 🧪 Testing & Validation

### **System Integrity Tests**

1. **Face Recognition Accuracy**:
   - Test with different lighting conditions
   - Verify proper authorized/unauthorized detection
   - Check confidence score thresholds

2. **Alert Distribution**:
   - Trigger test alerts to all components
   - Verify ESP32 receives and processes alerts
   - Confirm alert receiver displays notifications

3. **Hardware Reliability**:
   - Test continuous operation (24h test)
   - Verify automatic reconnection after network issues
   - Confirm proper error handling and logging

---

## 🔐 Security Considerations

- ⚠️ **Change default credentials** for WiFi in ESP32 code
- ⚠️ **Secure the ESP32** on a private network
- ⚠️ **Encrypt API communication** for production
- ⚠️ **Implement proper authentication** for web application
- ⚠️ **Regular security updates** for all components

---

## 🌐 Resources & Links

- **ESP32 Documentation**: [Espressif ESP32](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- **LCD Library**: [LiquidCrystal_I2C](https://github.com/johnrickman/LiquidCrystal_I2C)
- **ArduinoJson**: [Documentation](https://arduinojson.org/)
- **React Docs**: [React.js](https://react.dev/)
- **Supabase Docs**: [Supabase](https://supabase.com/docs/)

---

## 🔄 Updates & Maintenance

### **Firmware Updates**
- Check for ESP32 library updates monthly
- Create backup before updating
- Test thoroughly after updates

### **Software Updates**
- Update npm packages regularly
- Test application after major dependencies change
- Consider automated testing

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📧 Support

For issues or questions, please open a GitHub issue or contact the repository maintainer.

---

**🔒 Production-Ready Security System v1.0**
