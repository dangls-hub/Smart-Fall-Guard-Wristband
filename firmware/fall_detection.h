// [SP2-HW-02] Phụ trách: Trần Đình Nam
// Header máy trạng thái hữu hạn (FSM) 4 giai đoạn nhận diện té ngã & cảnh báo tại chỗ 15s
#ifndef FALL_DETECTION_H
#define FALL_DETECTION_H

enum FallState {
    IDLE,
    FREE_FALL,
    IMPACT,
    INACTIVITY,
    LOCAL_ALARM,
    CONFIRMED_FALL
};

#endif
