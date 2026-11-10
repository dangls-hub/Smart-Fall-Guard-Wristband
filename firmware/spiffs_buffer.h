// [SP3-HW-01] Phụ trách: Phạm Việt Tiến
// Header lưu trữ ngoại tuyến vào LittleFS trên ESP8266 (tên file/API SPIFFS cũ được giữ) (/offline_events.json) khi mất kết nối Wi-Fi
#ifndef SPIFFS_BUFFER_H
#define SPIFFS_BUFFER_H

void initSPIFFSBuffer();
void saveEventToOfflineBuffer(const char* jsonPayload);
void syncOfflineEventsIfConnected();

#endif
