// [SP1-BE-01 & SP2-BE-01] Phụ trách: Nguyễn Hữu Chính
// Express + MQTT transport; CSDL, Socket.io và API nghiệp vụ chưa triển khai.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { createMqttService } = require('./services/mqttService');

function startServer({ env = process.env, logger = console, shutdownTimeoutMs = 5000 } = {}) {
    const app = express();
    const PORT = env.PORT || 5000;
    const HOST = env.HOST || '127.0.0.1';
    app.use(cors({ origin: env.CORS_ORIGIN || 'http://localhost:5173' }));
    app.use(express.json());
    app.use('/api', require('./routes/api'));

    const mqttService = createMqttService({ env, logger });
    mqttService.start();
    let server;
    try {
        server = app.listen(PORT, HOST, () => {
            logger.info(`Smart Fall-Guard backend running at http://${HOST}:${server.address().port}`);
        });
    } catch (error) {
        void mqttService.stop().catch(() => {});
        throw error;
    }
    const sockets = new Set();
    server.on('connection', socket => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
    });

    let shutdownPromise;
    function shutdown() {
        if (shutdownPromise) return shutdownPromise;
        logger.info('[App] Shutting down HTTP and MQTT');
        shutdownPromise = (async () => {
            let timer;
            try {
                await Promise.race([
                    Promise.all([
                        new Promise((resolve, reject) => server.close(error => {
                            if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
                            else resolve();
                        })),
                        mqttService.stop(),
                    ]),
                    new Promise((_, reject) => {
                        timer = setTimeout(() => {
                            for (const socket of sockets) socket.destroy();
                            reject(new Error('Shutdown deadline exceeded'));
                        }, shutdownTimeoutMs);
                    }),
                ]);
                logger.info('[App] HTTP and MQTT stopped');
            } finally {
                clearTimeout(timer);
                process.removeListener('SIGINT', onSignal);
                process.removeListener('SIGTERM', onSignal);
            }
        })();
        return shutdownPromise;
    }
    function onSignal() {
        void shutdown().catch(() => {
            logger.error('[App] Shutdown failed or timed out; forcing exit');
            process.exit(1);
        });
    }
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
    server.on('error', () => {
        logger.error('[HTTP] Could not listen; check HOST/PORT and port availability');
        process.exitCode = 1;
        onSignal();
    });
    return { app, server, mqttService, shutdown };
}

if (require.main === module) {
    try {
        startServer();
    } catch (error) {
        console.error(error.message.startsWith('[MQTT]') ? error.message : '[App] Startup failed');
        process.exitCode = 1;
    }
}

module.exports = { startServer };
