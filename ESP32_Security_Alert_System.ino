
/*
 * ESP32 Security Alert System
 * Receives HTTP POST alerts and triggers LCD display + buzzer
 * Compatible with the Lab Security System
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Hardware Configuration
const int BUZZER_PIN = 2;
const int IR_SENSOR_PIN = 4;
const int LED_PIN = 5;

// LCD Configuration (I2C)
LiquidCrystal_I2C lcd(0x27, 16, 2); // Address, columns, rows

// Web Server
WebServer server(80);

// System Variables
bool alertActive = false;
bool buzzerEnabled = true;
bool lcdEnabled = true;
bool irSensorEnabled = true;
unsigned long alertStartTime = 0;
const unsigned long ALERT_DURATION = 10000; // 10 seconds

// Device Info
String deviceName = "ESP32-Security-Module";
String deviceIP = "";

void setup() {
  Serial.begin(115200);
  
  // Initialize hardware
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Security System");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup web server routes
  setupWebServer();
  
  // Start the server
  server.begin();
  Serial.println("ESP32 Security Alert System Ready");
  Serial.println("IP address: " + deviceIP);
  
  // Display ready status
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
  lcd.setCursor(0, 1);
  lcd.print(deviceIP);
  
  // Brief startup signal
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  server.handleClient();
  
  // Handle active alerts
  if (alertActive) {
    handleActiveAlert();
  }
  
  // Check IR sensor if enabled
  if (irSensorEnabled && digitalRead(IR_SENSOR_PIN) == HIGH) {
    Serial.println("Motion detected by IR sensor");
    // Could trigger a motion alert here
  }
  
  delay(100);
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    lcd.setCursor(0, 1);
    lcd.print("Connecting WiFi.");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  deviceIP = WiFi.localIP().toString();
  Serial.println("IP address: " + deviceIP);
}

void setupWebServer() {
  // Handle alert endpoint
  server.on("/alert", HTTP_POST, handleAlert);
  
  // Handle status endpoint
  server.on("/status", HTTP_GET, handleStatus);
  
  // Handle config endpoint
  server.on("/config", HTTP_POST, handleConfig);
  
  // Handle CORS preflight
  server.on("/alert", HTTP_OPTIONS, handleCORS);
  server.on("/status", HTTP_OPTIONS, handleCORS);
  server.on("/config", HTTP_OPTIONS, handleCORS);
  
  // Handle not found
  server.onNotFound(handleNotFound);
}

void handleAlert() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (server.hasArg("plain")) {
    String payload = server.arg("plain");
    Serial.println("Received alert: " + payload);
    
    // Parse JSON
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    String alertType = doc["type"] | "unknown";
    String severity = doc["severity"] | "medium";
    String message = doc["message"] | "Security alert";
    
    // Trigger alert
    triggerAlert(alertType, message, severity);
    
    // Send response
    server.send(200, "application/json", "{\"status\":\"success\",\"message\":\"Alert received\"}");
  } else {
    server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"No payload\"}");
  }
}

void handleStatus() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  DynamicJsonDocument doc(512);
  doc["device_name"] = deviceName;
  doc["ip_address"] = deviceIP;
  doc["status"] = "online";
  doc["uptime"] = millis();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["wifi_signal"] = WiFi.RSSI();
  doc["buzzer_enabled"] = buzzerEnabled;
  doc["lcd_enabled"] = lcdEnabled;
  doc["ir_sensor_enabled"] = irSensorEnabled;
  doc["alert_active"] = alertActive;
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleConfig() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  if (server.hasArg("plain")) {
    String payload = server.arg("plain");
    DynamicJsonDocument doc(512);
    deserializeJson(doc, payload);
    
    if (doc.containsKey("buzzer_enabled")) {
      buzzerEnabled = doc["buzzer_enabled"];
    }
    if (doc.containsKey("lcd_enabled")) {
      lcdEnabled = doc["lcd_enabled"];
    }
    if (doc.containsKey("ir_sensor_enabled")) {
      irSensorEnabled = doc["ir_sensor_enabled"];
    }
    
    server.send(200, "application/json", "{\"status\":\"success\",\"message\":\"Configuration updated\"}");
  } else {
    server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"No payload\"}");
  }
}

void handleCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200);
}

void handleNotFound() {
  server.send(404, "text/plain", "Not Found");
}

void triggerAlert(String alertType, String message, String severity) {
  Serial.println("ALERT TRIGGERED: " + alertType);
  Serial.println("Message: " + message);
  Serial.println("Severity: " + severity);
  
  alertActive = true;
  alertStartTime = millis();
  
  // Display on LCD if enabled
  if (lcdEnabled) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SECURITY ALERT!");
    lcd.setCursor(0, 1);
    if (alertType.length() > 16) {
      lcd.print(alertType.substring(0, 16));
    } else {
      lcd.print(alertType);
    }
  }
  
  // Flash LED
  digitalWrite(LED_PIN, HIGH);
  
  // Sound buzzer if enabled
  if (buzzerEnabled) {
    for (int i = 0; i < 5; i++) {
      digitalWrite(BUZZER_PIN, HIGH);
      delay(200);
      digitalWrite(BUZZER_PIN, LOW);
      delay(200);
    }
  }
}

void handleActiveAlert() {
  // Check if alert duration has passed
  if (millis() - alertStartTime > ALERT_DURATION) {
    alertActive = false;
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    
    if (lcdEnabled) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("System Ready");
      lcd.setCursor(0, 1);
      lcd.print(deviceIP);
    }
    
    Serial.println("Alert cleared");
  } else {
    // Continue flashing LED during alert
    static unsigned long lastFlash = 0;
    if (millis() - lastFlash > 500) {
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      lastFlash = millis();
    }
  }
}
```

Connection Instructions:

**Wiring Diagram:**
- LCD (I2C): SDA → GPIO 21, SCL → GPIO 22, VCC → 3.3V, GND → GND
- Buzzer: Positive → GPIO 2, Negative → GND  
- IR Sensor: VCC → 3.3V, GND → GND, OUT → GPIO 4
- LED: Anode → GPIO 5, Cathode → GND (with 220Ω resistor)

**Setup Steps:**
1. Install required libraries: WiFi, WebServer, ArduinoJson, LiquidCrystal_I2C
2. Update WiFi credentials in the code
3. Upload code to ESP32
4. Note the IP address displayed on LCD
5. Update ESP32 IP in the web dashboard
