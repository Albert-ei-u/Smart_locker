// Team 5 - RFID Smart Locker
// Step 2: the right fob opens the locker, a wrong fob is refused.
//
// Wiring (RC522 -> ESP8266):
//   SDA  -> D8      SCK  -> D5
//   MOSI -> D7      MISO -> D6
//   RST  -> D3      GND  -> G
//   3.3V -> 3V3 (NEVER 5V)
//
// Wiring (Servo -> ESP8266):
//   Brown/black   -> G
//   Red           -> Vin
//   Orange/yellow -> D1

#include <SPI.h>
#include <MFRC522.h>
#include <Servo.h>

#define SS_PIN    D8
#define RST_PIN   D3
#define SERVO_PIN D1

// ---- Settings you can change ----
const String LOCKER_1_KEY = "03 1A B0 01";  // the fob that owns Locker 1
const int LOCKED_ANGLE   = 0;    // servo position when locked
const int OPEN_ANGLE     = 90;   // servo position when open
const int OPEN_SECONDS   = 5;    // how long the locker stays open
// ---------------------------------

MFRC522 reader(SS_PIN, RST_PIN);
Servo lock;

void setup() {
  Serial.begin(115200);
  delay(500);
  SPI.begin();
  reader.PCD_Init();

  lock.attach(SERVO_PIN, 500, 2400);
  lock.write(LOCKED_ANGLE);

  Serial.println();
  Serial.println("=== Team 5 Smart Locker ===");
  Serial.println("Locker 1 is LOCKED. Tap a fob...");
  Serial.println("Or type: open, lock, or a number 0-180");
}

void loop() {
  checkTypedCommand();   // lets you control the servo from the Serial Monitor

  if (!reader.PICC_IsNewCardPresent()) return;
  if (!reader.PICC_ReadCardSerial()) return;

  String id = readId();
  Serial.print("Fob tapped: ");
  Serial.println(id);

  if (id == LOCKER_1_KEY) {
    Serial.println("ACCESS GRANTED -> opening Locker 1");
    lock.write(OPEN_ANGLE);
    delay(OPEN_SECONDS * 1000);
    lock.write(LOCKED_ANGLE);
    Serial.println("Locker 1 locked again.");
  } else {
    Serial.println("ACCESS DENIED -> this fob does not own Locker 1");
  }

  Serial.println("Tap a fob...");
  reader.PICC_HaltA();
  delay(1000);
}

// Manual servo control from the Serial Monitor:
//   open  -> moves to OPEN_ANGLE
//   lock  -> moves to LOCKED_ANGLE
//   a number from 0 to 180 -> moves to that exact angle (to find the best angles)
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
