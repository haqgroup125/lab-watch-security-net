
# Lab Security System - Complete Setup Guide

A comprehensive security system with face recognition, real-time alerts, and ESP32 integration.

## 🚀 Project Overview

This security system consists of:
1. **Main Security App** - Face recognition, user management, alert monitoring
2. **Alert Receiver App** - Standalone alert reception (runs on separate device)
3. **ESP32 Hardware** - Physical security module with alerts
4. **Supabase Backend** - Real-time database and file storage

## 📱 System Components

### App 1: Main Security Dashboard
- **URL**: `http://localhost:8080/` (or your domain)
- **Features**:
  - Upload and manage authorized user photos
  - Live face recognition simulation
  - Alert monitoring and management
  - ESP32 device control
  - Real-time database integration

### App 2: Alert Receiver
- **URL**: `http://localhost:8080/alert-receiver` (or your domain/alert-receiver)
- **Features**:
  - Standalone alert reception system
  - Full-screen high-priority alerts
  - Real-time alert notifications
  - Audio alert system
  - Multi-device support

### ESP32 Hardware Module
- **Features**:
  - HTTP server for receiving alerts
  - LCD display for status
  - Buzzer and LED alerts
  - WiFi connectivity

## 🛠️ Complete Setup Instructions

### 1. Database Setup (Supabase)

The system uses these database tables:
- `authorized_users` - Store user photos and face data
- `security_alerts` - Log all security events
- `esp32_devices` - Manage ESP32 hardware
- `alert_receivers` - Track alert receiver devices
- `face-images` storage bucket - Store user photos

### 2. Upload Authorized User Photos

1. Go to **Face Recognition** tab
2. Click **"Add User"** button
3. Enter user's full name
4. Upload a clear photo (JPG/PNG)
5. Click **"Add Authorized User"**

The photo will be stored in Supabase storage and the user added to the database.

### 3. Setting Up Alert Receiver App (App 2)

#### Option A: Same Computer/Different Browser
1. Open a new browser window/tab
2. Navigate to: `http://localhost:8080/alert-receiver`
3. Configure device settings (name, IP)
4. Click "Start Alert Server"

#### Option B: Different Device
1. Deploy the app or run it on another computer
2. Navigate to: `http://[your-ip]:8080/alert-receiver`
3. Configure the device IP address correctly
4. Start the alert server

#### Device Configuration:
- **Device Name**: Unique name for this receiver
- **Device IP**: The IP address where this app is running
- **Port**: 8080 (default)

### 4. ESP32 Hardware Setup

#### Required Components:
- ESP32 board
- 16x2 LCD display (I2C)
- Buzzer
- LED
- 10KΩ resistor
- Breadboard and jumper wires

#### Wiring Diagram:
```
ESP32 Pin    Component    Connection
---------    ---------    ----------
GPIO 21  →   LCD SDA   →  I2C Data
GPIO 22  →   LCD SCL   →  I2C Clock
GPIO 18  →   Buzzer    →  Positive (+)
GPIO 19  →   LED       →  Anode (+) → 10KΩ resistor → GPIO 2
GND      →   All       →  Negative (-)
3.3V     →   LCD VCC   →  Power
```

#### ESP32 Code Upload:
1. Install Arduino IDE
2. Install ESP32 board package
3. Install required libraries:
   - WiFi
   - WebServer
   - LiquidCrystal_I2C
4. Open `ESP32_Security_Alert_System.ino`
5. Update WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_NAME";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
6. Upload to ESP32

#### ESP32 API Endpoints:
- `GET /status` - Get device status
- `POST /alert` - Receive security alerts
- `POST /test` - Test buzzer and LED

### 5. Testing the Complete System

#### Test Authorized User Detection:
1. Add users via Face Recognition tab
2. Click "✅ Test Authorized" button
3. Check Alert Monitor for logged event
4. Verify low-priority alert created

#### Test Unauthorized Detection:
1. Click "🚨 Test Unauthorized" button
2. Alert Receiver should show full-screen alert
3. ESP32 should trigger buzzer and LED
4. Check Alert Monitor for high-priority alert

#### Test ESP32 Integration:
1. Ensure ESP32 is connected and shows IP
2. Add ESP32 device in ESP32 Control tab
3. Test direct communication
4. Verify alerts trigger ESP32 responses

## 🔧 Configuration Options

### Alert Severity Levels:
- **Low**: Normal access events
- **Medium**: Suspicious activity
- **High**: Security breaches (triggers full alerts)

### Network Configuration:
- Main app typically runs on port 8080
- Alert receivers also use port 8080
- ESP32 creates its own HTTP server
- All devices should be on the same network

### Database Schema:
```sql
-- Key tables and their purposes
authorized_users: Store user photos and face encodings
security_alerts: Log all security events with timestamps
esp32_devices: Manage ESP32 hardware status
alert_receivers: Track alert receiver app instances
```

## 📊 Real-time Features

### Live Database Updates:
- Uses Supabase real-time subscriptions
- Instant alert propagation
- Automatic device status updates
- Live user management

### Alert Flow:
1. Face detection triggers alert creation
2. Alert stored in database
3. Real-time subscription notifies all receivers
4. High-priority alerts trigger:
   - Full-screen popup on receiver apps
   - ESP32 hardware alerts
   - Audio notifications

## 🚀 Deployment Options

### Local Development:
```bash
npm install
npm run dev
# Runs on http://localhost:8080
```

### Production Deployment:
```bash
npm run build
# Deploy dist/ folder to web server
```

### Mobile App Development:
- Use Capacitor for native mobile apps
- React Native integration possible
- PWA support included

## 🔐 Security Features

### Access Control:
- Photo-based user authorization
- Real-time face recognition
- Confidence scoring
- Unauthorized access alerts

### Network Security:
- Local network operation
- Encrypted database connections
- Secure file storage
- Device authentication

## 📱 Mobile Integration

### For React Native App:
1. Create new React Native project
2. Implement HTTP server using react-native libraries
3. Use the same API endpoints as web version
4. Add native notifications and vibration

### For Android App:
1. Use NanoHTTPD library for HTTP server
2. Implement SQLite for local alert storage
3. Create full-screen alert activities
4. Add sound and vibration alerts

## 🛠️ Troubleshooting

### Common Issues:

**Photos not uploading:**
- Check Supabase storage bucket permissions
- Verify file size limits
- Ensure network connectivity

**Alerts not received:**
- Check device IP configuration
- Verify network connectivity
- Ensure alert receiver server is running

**ESP32 not responding:**
- Check WiFi credentials
- Verify IP address
- Test HTTP endpoints manually

**Database connection issues:**
- Check Supabase configuration
- Verify API keys
- Check network connectivity

### Debug Tools:
- Browser developer console
- Supabase dashboard logs
- ESP32 serial monitor
- Network connectivity tests

## 📈 System Monitoring

### Key Metrics:
- Total authorized users
- Daily alert count
- Device online status
- Response times

### Logs Available:
- All security events in database
- ESP32 activity logs
- Alert receiver status
- User management activities

## 🔮 Future Enhancements

### Planned Features:
- Real camera integration
- ML Kit face recognition
- Email/SMS notifications
- Advanced analytics dashboard
- Multi-location support

### Integration Options:
- Smart home systems
- Professional security systems
- Cloud deployment
- Advanced AI features

## 📞 Support

For technical support or questions:
1. Check troubleshooting section
2. Review Supabase logs
3. Test individual components
4. Verify network configuration

## 🏗️ Development

### Project Structure:
```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── pages/              # App pages/routes
├── integrations/       # Supabase integration
└── lib/               # Utility functions

ESP32_Security_Alert_System.ino  # Arduino code
```

### Technologies Used:
- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Storage, Real-time)
- **Hardware**: ESP32, Arduino IDE
- **UI**: Shadcn/ui components
- **State**: React hooks and context

---

**Ready to secure your lab! 🔒**
