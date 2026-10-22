// [SP2-HW-01] Phụ trách: Trần Đình Nam
// Header driver đọc MPU6050 ở tần số 50Hz (20ms), tính SVM và góc nghiêng Pitch
#ifndef MPU6050_DRIVER_H
#define MPU6050_DRIVER_H

struct MotionData {
    float ax, ay, az;
    float svm;
    float pitch;
};

void initMPU6050();
MotionData readMPU6050();

#endif
