// Team 5 - RFID Smart Locker
// Step 3: Wi-Fi version. Every tap is checked by the server and shown on the dashboard.
//
// Wiring is the same as before:
//   RC522: SDA->D8  SCK->D5  MOSI->D7  MISO->D6  RST->D3  GND->G  3.3V->3V3 (NEVER 5V)
//   Servo: Brown/black->G  Red->Vin  Orange/yellow->D1

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Servo.h>

#define SS_PIN    D8
#define RST_PIN   D3
#define SERVO_PIN D1

// ---- Settings you MUST change ----
const char* WIFI_NAME     = "connected";
const char* WIFI_PASSWORD = "Albert@here###";
const char* SERVER = "http://192.168.137.1:5001";  // laptop hotspot IP + local Flask port
const char* DEVICE_KEY    = "team5@rca.robotics";                 // same as DEVICE_KEY in the server's .env
// ---- Settings you can change ----
const String BACKUP_KEY   = "03 1A B0 01";  // still opens Locker 1 if the server is unreachable
const int LOCKED_ANGLE    = 0;
const int OPEN_ANGLE      = 90;
const int OPEN_SECONDS    = 5;
const int MY_LOCKER       = 1;              // which locker this board controls
// ----------------------------------

MFRC522 reader(SS_PIN, RST_PIN);
Servo lock;
unsigned long lastPoll = 0;

void setup() {
  Serial.begin(115200);
  delay(500);
  SPI.begin();
  reader.PCD_Init();
  lock.attach(SERVO_PIN, 500, 2400);
  lock.write(LOCKED_ANGLE);

  Serial.println();
  Serial.println("=== Team 5 Smart Locker (Wi-Fi) ===");
  connectWifi();
  Serial.println("Tap a fob... (or type: open, lock, or a number 0-180)");
}

void loop() {
  checkTypedCommand();

  // Every 2 seconds, ask the server if someone pressed "Open now" on the dashboard
  if (millis() - lastPoll > 2000) {
    lastPoll = millis();
    checkDashboardOpen();
  }

  if (!reader.PICC_IsNewCardPresent()) return;
  if (!reader.PICC_ReadCardSerial()) return;

  String id = readId();
  Serial.print("Fob tapped: ");
  Serial.println(id);

  int answer = askServer(id);   // 1 = open, 0 = deny, -1 = server not reachable

  if (answer == 1) {
    Serial.println("SERVER: ACCESS GRANTED");
    openLocker();
  } else if (answer == 0) {
    Serial.println("SERVER: ACCESS DENIED");
  } else if (id == BACKUP_KEY) {
    Serial.println("Server not reachable -> backup key accepted");
    openLocker();
  } else {
    Serial.println("Server not reachable -> ACCESS DENIED");
  }

  Serial.println("Tap a fob...");
  reader.PICC_HaltA();
  delay(1000);
}

void openLocker() {
  lock.write(OPEN_ANGLE);
  delay(OPEN_SECONDS * 1000);
  lock.write(LOCKED_ANGLE);
  Serial.println("Locker locked again.");
  reportLocked();
}

// Tells the dashboard the door is closed and locked again.
void reportLocked() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClient client;
  HTTPClient http;
  http.begin(client, String(SERVER) + "/api/door");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(2000);
  http.POST("{\"locker\":" + String(MY_LOCKER) + ",\"state\":\"locked\"}");
  http.end();
}

void connectWifi() {
  Serial.print("Connecting to Wi-Fi ");
  Serial.print(WIFI_NAME);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_NAME, WIFI_PASSWORD);
  for (int i = 0; i < 30 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected. Board IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi FAILED. Check the name/password. Backup key still works.");
  }
}

// Sends the tag to the server. Returns 1 (open), 0 (deny) or -1 (no answer).
int askServer(String id) {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (WiFi.status() != WL_CONNECTED) return -1;

  WiFiClient client;
  HTTPClient http;
  http.begin(client, String(SERVER) + "/api/scan");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(4000);

  int code = http.POST("{\"tag\":\"" + id + "\"}");
  String body = http.getString();
  http.end();

  Serial.print("Server replied ");
  Serial.print(code);
  Serial.print(": ");
  Serial.println(body);

  if (code == 401) Serial.println("-> DEVICE_KEY does not match the server's .env");
  if (code != 200) return -1;
  body.replace(" ", "");
  if (body.indexOf("\"action\":\"open\"") >= 0 && body.indexOf("\"locker\":" + String(MY_LOCKER)) >= 0) return 1;
  return 0;
}

// "Open now" button on the dashboard
void checkDashboardOpen() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClient client;
  HTTPClient http;
  http.begin(client, String(SERVER) + "/api/poll");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(2000);
  int code = http.GET();
  String body = (code == 200) ? http.getString() : "";
  http.end();

  body.replace(" ", "");
  if (body.indexOf("\"open\":true") >= 0 && body.indexOf("\"locker\":" + String(MY_LOCKER)) >= 0) {
    Serial.println("DASHBOARD: Open now pressed");
    openLocker();
  }
}

// Manual servo control from the Serial Monitor: open, lock, or 0-180
void checkTypedCommand() {
  if (!Serial.available()) return;
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  cmd.toLowerCase();
  if (cmd.length() == 0) return;

  if (cmd == "open") {
    lock.write(OPEN_ANGLE);
    Serial.println("Servo -> OPEN");
  } else if (cmd == "lock") {
    lock.write(LOCKED_ANGLE);
    Serial.println("Servo -> LOCKED");
  } else if (isDigit(cmd.charAt(0))) {
    int angle = constrain(cmd.toInt(), 0, 180);
    lock.write(angle);
    Serial.print("Servo -> ");
    Serial.print(angle);
    Serial.println(" degrees");
  } else {
    Serial.println("Commands: open, lock, or a number 0-180");
  }
}

// Turns the fob's ID into text like "03 1A B0 01"
String readId() {
  String id = "";
  for (byte i = 0; i < reader.uid.size; i++) {
    if (reader.uid.uidByte[i] < 0x10) id += "0";
    id += String(reader.uid.uidByte[i], HEX);
    if (i < reader.uid.size - 1) id += " ";
  }
  id.toUpperCase();
  return id;
}
