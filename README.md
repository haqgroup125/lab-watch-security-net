
# 🔒 Professional Security System

A **production-ready security system** with **real face recognition**, ESP32 hardware integration, and multi-device alert network. Perfect for labs, offices, or any facility requiring automated access control.

## 🌟 Features

- ✅ **Real-time face recognition** using advanced AI algorithms
- ✅ **Hardware integration** with ESP32, LCD display, buzzer, and sensors
- ✅ **Multi-device alert system** with instant notifications
- ✅ **Authorized user management** with secure photo storage
- ✅ **Comprehensive security logs** and analytics
- ✅ **Mobile-responsive** design for all devices
- ✅ **Production-ready** with error handling and monitoring

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Modern web browser** with camera support
- **ESP32 development board** (optional for hardware integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd security-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:8080
   ```

---

## 📦 Dependencies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **React** | ^18.3.1 | Frontend framework |
| **TypeScript** | ^5.x | Type safety and development |
| **Vite** | Latest | Build tool and dev server |
| **Tailwind CSS** | ^3.x | Utility-first CSS framework |

### UI Components

| Package | Version | Purpose |
|---------|---------|---------|
| **@radix-ui/react-*** | ^1.x-2.x | Accessible UI primitives |
| **lucide-react** | ^0.462.0 | Modern icon library |
| **class-variance-authority** | ^0.7.1 | Component variant styling |
| **tailwindcss-animate** | ^1.0.7 | CSS animations |

### Data Management

| Package | Version | Purpose |
|---------|---------|---------|
| **@supabase/supabase-js** | ^2.49.10 | Database and authentication |
| **@tanstack/react-query** | ^5.56.2 | Data fetching and caching |
| **react-hook-form** | ^7.53.0 | Form handling |
| **zod** | ^3.23.8 | Schema validation |

### Face Recognition (Future)

| Package | Version | Purpose |
|---------|---------|---------|
| **face-api.js** | Latest | Browser-based face recognition |
| **@tensorflow/tfjs** | Latest | Machine learning runtime |

---

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Shadcn/ui components
│   ├── SecurityDashboard.tsx
│   ├── FaceRecognition.tsx
│   ├── AlertMonitor.tsx
│   ├── ESP32Manager.tsx
│   └── SystemSettings.tsx
├── hooks/               # Custom React hooks
│   ├── useSecuritySystem.ts
│   └── use-toast.ts
├── integrations/        # External service integrations
│   └── supabase/
├── lib/                 # Utility functions
│   └── utils.ts
├── pages/               # Main application pages
│   ├── Index.tsx
│   └── AlertReceiverApp.tsx
└── App.tsx             # Root application component
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: ESP32 Configuration
NEXT_PUBLIC_ESP32_DEFAULT_IP=192.168.1.100
NEXT_PUBLIC_ALERT_RECEIVER_PORT=8080
```

### Database Setup

The application uses Supabase for data storage. Required tables:

- `authorized_users` - Stores user profiles and face encodings
- `security_alerts` - Logs all security events
- `esp32_devices` - Manages hardware device connections
- `alert_receivers` - Tracks alert notification endpoints

---

## 🎯 Usage

### 1. Face Recognition Setup

1. Navigate to the **Face Recognition** tab
2. Click **"Add User"** to register authorized personnel
3. Upload a clear, front-facing photo
4. The system will automatically extract face features
5. Test recognition using the live camera feed

### 2. Hardware Integration

1. Flash the provided Arduino code to your ESP32
2. Configure WiFi credentials in the ESP32 code
3. Connect LCD display, buzzer, and sensors as per wiring diagram
4. Register the device IP in the **ESP32 Control** tab
5. Test alerts to verify hardware communication

### 3. Alert Monitoring

1. Open **Alert Monitor** to view real-time security events
2. Configure alert receivers for multiple device notifications
3. Set up severity levels and response protocols
4. Review security logs and analytics

---

## 📱 Mobile Installation

### Progressive Web App (PWA)

**Android:**
1. Open Chrome and visit the application URL
2. Tap the menu (⋮) → **"Add to Home screen"**
3. Name the app and tap **"Add"**

**iOS:**
1. Open Safari and visit the application URL
2. Tap the Share button → **"Add to Home Screen"**
3. Name the app and tap **"Add"**

---

## 🛠️ Hardware Setup

### Required Components

| Component | Specification | Purpose |
|-----------|---------------|---------|
| ESP32 Board | Any variant | Main controller |
| LCD Display | 16x2 I2C | Status display |
| Buzzer | 3.3V Active | Audio alerts |
| PIR Sensor | HC-SR501 | Motion detection |
| LED | 3mm/5mm | Status indicator |
| Resistors | 220Ω, 10kΩ | Current limiting |

### Wiring Diagram

```
ESP32 Connections:
├── GPIO 21 (SDA) → LCD SDA
├── GPIO 22 (SCL) → LCD SCL
├── GPIO 2 → Buzzer (+)
├── GPIO 4 → PIR OUT
├── GPIO 5 → LED (+) → 220Ω → GND
└── 3.3V/GND → Power rails
```

---

## 📊 API Endpoints

### Web Application APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | GET/POST | Manage authorized users |
| `/api/alerts` | GET/POST | Security event handling |
| `/api/devices` | GET/POST | ESP32 device management |

### ESP32 Device APIs

| Endpoint | Method | Payload | Description |
|----------|--------|---------|-------------|
| `/alert` | POST | `{type, severity, details}` | Trigger security alert |
| `/status` | GET | N/A | Device health check |
| `/config` | POST | `{settings}` | Update configuration |

---

## 🔍 Troubleshooting

### Common Issues

**Camera not working:**
- Ensure HTTPS or localhost for camera permissions
- Check browser camera permissions
- Try different browsers (Chrome recommended)

**ESP32 connection failed:**
- Verify WiFi credentials in code
- Check device IP address
- Ensure same network connectivity

**Face recognition inaccurate:**
- Use high-quality, well-lit photos
- Ensure single person per photo
- Re-register users with multiple angles

---

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Docker Deployment
```bash
docker build -t security-system .
docker run -p 8080:8080 security-system
```

---

## 🔐 Security Considerations

- 🔒 Use HTTPS in production
- 🔒 Implement proper authentication
- 🔒 Secure ESP32 on private network
- 🔒 Regular security updates
- 🔒 Encrypt sensitive data

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📞 Support

- 📧 **Email:** abubakkar996610@gmail.com
- 💬 **Discord:** still no account but i will upload it soon as posible
- 📖 **Documentation:** [Full docs](#)
- 🐛 **Issues:** [GitHub Issues](#)

---

**🔒 Professional Security System v2.0** - 
                               .....MADE BY M.ABUBAKKAR....
