// [SP1-HW-02] Phụ trách: Phạm Việt Tiến
// Quét bus I2C (SDA: GPIO 21, SCL: GPIO 22) xác thực địa chỉ 0x68 của cảm biến MPU6050
#include <Wire.h>

// Dinh nghia chan theo so do Smart Fall-Guard (Wemos D1 Mini - ESP8266)
#define I2C_SDA_PIN D2      // GPIO4
#define I2C_SCL_PIN D1      // GPIO5
#define CANCEL_BTN_PIN D6   // GPIO12 (INPUT_PULLUP)
#define STATUS_LED_PIN D7   // GPIO13 (qua tro 330 ohm)
#define BUZZER_PIN D5       // GPIO14 (qua tro 220 ohm toi coi thu dong)

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(CANCEL_BTN_PIN, INPUT_PULLUP);
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(STATUS_LED_PIN, LOW);
  noTone(BUZZER_PIN);

  // Khoi tao bus I2C tren D2 (SDA) va D1 (SCL)
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  Serial.println("\n==========================================");
  Serial.println("SMART FALL-GUARD - ESP8266 I2C & IO TEST");
  Serial.println("SDA: D2 (GPIO4) | SCL: D1 (GPIO5)");
  Serial.println("==========================================");

  // Test nhanh coi thu dong (2 kHz trong 150 ms) va LED
  digitalWrite(STATUS_LED_PIN, HIGH);
  tone(BUZZER_PIN, 2000, 150);
  delay(200);
  digitalWrite(STATUS_LED_PIN, LOW);
}

void loop() {
  byte error, address;
  int nDevices = 0;
  bool mpuFound = false;

  Serial.println("\nDang quet bus I2C...");

  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.print(" -> Tim thay thiet bi I2C tai dia chi 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);

      if (address == 0x68) {
        Serial.print("  [MPU6050 - AD0=GND]");
        mpuFound = true;
      } else if (address == 0x69) {
        Serial.print("  [MPU6050 - AD0=VCC]");
      }
      Serial.println();
      nDevices++;
    } else if (error == 4) {
      Serial.print(" -> Loi khong xac dinh tai dia chi 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }

  if (nDevices == 0) {
    Serial.println("KHONG tim thay thiet bi I2C nao! Kiem tra lai day SDA/SCL va nguon 3V3.");
    digitalWrite(STATUS_LED_PIN, LOW);
  } else {
    Serial.print("Tong so thiet bi tim thay: ");
    Serial.println(nDevices);
    if (mpuFound) {
      // Nhay LED bao hieu MPU6050 hoat dong tot
      digitalWrite(STATUS_LED_PIN, HIGH);
      delay(200);
      digitalWrite(STATUS_LED_PIN, LOW);
    }
  }

  // Kiem tra trang thai nut nhan huy tai chan D6
  if (digitalRead(CANCEL_BTN_PIN) == LOW) {
    Serial.println("[TEST IO] Nut nhan D6 (CANCEL) dang duoc bam!");
    tone(BUZZER_PIN, 2500, 100);
  }

  delay(3000); // Quet lai sau moi 3 giay
}   