// [SP1-BE-02, SP2-BE-02 & SP3-BE-02] Phụ trách: Nguyễn Hữu Chính
// Controller quản lý trạng thái vòng tay, dữ liệu telemetry và gửi lệnh Downlink qua MQTT
function getDevices(req, res) {
    res.status(501).json({
        error: {
            code: 'NOT_IMPLEMENTED',
            message: 'API danh sách thiết bị chưa được triển khai.',
        },
    });
}

module.exports = { getDevices };
