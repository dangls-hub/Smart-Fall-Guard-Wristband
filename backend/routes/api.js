// [SP1-BE-02, SP2-BE-02, SP3-BE-02] Phụ trách: Nguyễn Hữu Chính
// Định nghĩa các REST API: GET /api/devices, GET /api/devices/:id/telemetry, GET /api/events, POST /api/events/:id/resolve, POST /api/devices/:id/command
const express = require('express');
const { getDevices } = require('../controllers/deviceController');
const { getEvents } = require('../controllers/eventController');
const router = express.Router();

router.get('/devices', getDevices);
router.get('/events', getEvents);

module.exports = router;
