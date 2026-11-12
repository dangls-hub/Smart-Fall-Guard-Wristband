// [SP1-HW-02] Phụ trách: Phạm Việt Tiến
// Kiểm tra kết nối Wi-Fi trên ESP32 và in địa chỉ IP ra Serial Monitor (115200 baud)
#include <ESP8266WiFi.h>

// Thay thong tin mang Wi-Fi 2.4 GHz cua ban vao day
const char* ssid = "TEN_WIFI_2.4GHz_CUA_BAN";
const char* password = "MAT_KHAU_WIFI_CUA_BAN";

#define STATUS_LED_PIN D7  // GPIO13 - LED bao trang thai ket noi

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  Serial.println("\n==========================================");
  Serial.println("SMART FALL-GUARD - ESP8266 WI-FI TEST");
  Serial.println("==========================================");

  // Cau hinh che do Station (ket noi vao Router/Hotspot)
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  Serial.print("Dang ket noi toi Wi-Fi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int retryCount = 0;
  while (WiFi.status() != WL_CONNECTED) {
    // Nhay LED D7 trong luc cho ket noi
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    delay(500);
    Serial.print(".");
    retryCount++;

    if (retryCount >= 40) { // Qua 20 giay chua ket noi duoc
      Serial.println("\n[LOI] Ket noi that bai! Kiem tra lai SSID/Password hoac dam bao Wi-Fi la bang tan 2.4 GHz.");
      retryCount = 0;
    }
  }

  // Ket noi thanh cong: bat sang LED D7
  digitalWrite(STATUS_LED_PIN, HIGH);

  Serial.println("\n\n[THANH CONG] Da ket noi Wi-Fi!");
  Serial.print("Dia chi IP cuc bo : ");
  Serial.println(WiFi.localIP());
  Serial.print("Gateway IP         : ");
  Serial.println(WiFi.gatewayIP());
  Serial.print("Dia chi MAC        : ");
  Serial.println(WiFi.macAddress());
  Serial.print("Cuong do tin hieu  : ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
}

void loop() {
  // Giam sat trang thai giu ket noi moi 5 giay
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[OK] Wi-Fi van ket noi | IP: ");
    Serial.print(WiFi.localIP());
    Serial.print(" | RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("[CANH BAO] Mat ket noi Wi-Fi! Dang thu ket noi lai...");
    digitalWrite(STATUS_LED_PIN, LOW);
    WiFi.reconnect();
  }

  delay(5000);
}