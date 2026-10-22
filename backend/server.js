// [SP1-BE-01 & SP2-BE-01] Phụ trách: Nguyễn Hữu Chính
// Khởi tạo Express Server (Port 5000), tích hợp MQTT Service và Socket.io Gateway
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use('/api', require('./routes/api'));

app.listen(PORT, () => {
    console.log(`Smart Fall-Guard Backend running on port ${PORT}`);
});
