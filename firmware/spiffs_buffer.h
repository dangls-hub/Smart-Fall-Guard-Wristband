// [SP3-HW-01] Phụ trách: Trần Đình Nam
// Header lưu trữ ngoại tuyến vào bộ nhớ Flash SPIFFS (/offline_events.json) khi mất kết nối Wi-Fi
#ifndef SPIFFS_BUFFER_H
#define SPIFFS_BUFFER_H

void initSPIFFSBuffer();
void saveEventToOfflineBuffer(const char* jsonPayload);
void syncOfflineEventsIfConnected();

#endif
