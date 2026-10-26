// [SP1-BE-01 & SP2-BE-01] Phụ trách: Nguyễn Hữu Chính
// Khung Express local; MQTT, CSDL, Socket.io và API nghiệp vụ chưa triển khai.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', require('./routes/api'));

app.listen(PORT, HOST, () => {
    console.log(`Smart Fall-Guard scaffold running at http://${HOST}:${PORT}`);
});
