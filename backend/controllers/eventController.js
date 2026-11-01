// [SP1-BE-02 & SP2-BE-02] Phụ trách: Nguyễn Hữu Chính
// Controller truy xuất nhật ký té ngã và đánh dấu đã xử lý an toàn (resolve)
function getEvents(req, res) {
    res.status(501).json({
        error: {
            code: 'NOT_IMPLEMENTED',
            message: 'API lịch sử sự kiện chưa được triển khai.',
        },
    });
}

module.exports = { getEvents };
