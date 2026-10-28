// [SP1-BE-01] Phụ trách: Nguyễn Hữu Chính
// Kết nối MQTT Broker, subscribe topic fallguard/v1/devices/+/+ và điều phối dữ liệu
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const mqtt = require('mqtt');

const REPO_ROOT = path.resolve(__dirname, '../..');
const DEVICE_TOPIC = 'fallguard/v1/devices/+/+';

function readConfig(env) {
    for (const key of ['MQTT_HOST', 'MQTT_PORT', 'MQTT_PROTOCOL', 'MQTT_USERNAME', 'MQTT_PASSWORD']) {
        if (typeof env[key] !== 'string' || !env[key].trim()) {
            throw new Error(`[MQTT] Missing required configuration: ${key}`);
        }
    }
    const host = env.MQTT_HOST.trim();
    if (!net.isIP(host) && !/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(host)) {
        throw new Error('[MQTT] MQTT_HOST must be a hostname or IP, without URL or credentials');
    }
    const protocol = env.MQTT_PROTOCOL.trim();
    if (!['mqtt', 'mqtts'].includes(protocol)) {
        throw new Error('[MQTT] MQTT_PROTOCOL must be mqtt or mqtts');
    }
    const port = Number(env.MQTT_PORT);
    if (!/^\d+$/.test(env.MQTT_PORT) || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('[MQTT] MQTT_PORT must be an integer from 1 to 65535');
    }
    const options = {
        host, port, protocol,
        username: env.MQTT_USERNAME,
        password: env.MQTT_PASSWORD,
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 5000,
        // Subscribe explicitly on connect; avoid MQTT.js also restoring subscriptions.
        resubscribe: false,
    };
    if (protocol === 'mqtts') {
        if (!env.MQTT_CA_PATH?.trim()) throw new Error('[MQTT] MQTT_CA_PATH is required for mqtts');
        try {
            options.ca = fs.readFileSync(path.resolve(REPO_ROOT, env.MQTT_CA_PATH));
        } catch {
            throw new Error('[MQTT] Cannot read MQTT_CA_PATH (relative paths use repository root)');
        }
        options.rejectUnauthorized = true;
    }
    return options;
}

// Library error messages may contain credentials; log only known diagnostic codes.
function errorCode(error) {
    const safeCodes = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
        'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH', 'ERR_TLS_CERT_ALTNAME_INVALID',
        'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'];
    if (safeCodes.includes(error?.code)) return error.code;
    if ([1, 2, 3, 4, 5].includes(error?.code)) return `CONNACK_${error.code}`;
    return 'details omitted';
}

function createMqttService({ env = process.env, connect = mqtt.connect, logger = console,
    stopTimeoutMs = 2000 } = {}) {
    let client;
    let stopping = false;
    let stopPromise;

    function start() {
        if (stopping) throw new Error('[MQTT] Service has stopped; create a new service to restart');
        if (client) return client;
        const options = readConfig(env);
        logger.info(`[MQTT] Connecting (${options.protocol}, port ${options.port})`);
        try {
            client = connect(options);
        } catch {
            throw new Error('[MQTT] Could not initialize client; check MQTT configuration');
        }
        client.on('connect', () => {
            if (stopping) return;
            logger.info('[MQTT] Connected');
            // Existing ACL restricts delivery to data suffixes; never widen it here.
            client.subscribe(DEVICE_TOPIC, { qos: 1 }, (error, granted) => {
                if (stopping) return;
                const grant = granted?.find(item => item.topic === DEVICE_TOPIC);
                if (error || !grant || ![0, 1].includes(grant.qos)) {
                    logger.error(`[MQTT] Subscribe failed for ${DEVICE_TOPIC}; check broker ACL (${errorCode(error)})`);
                    return;
                }
                logger.info(`[MQTT] Subscribed ${DEVICE_TOPIC} (QoS ${grant.qos})`);
            });
        });
        client.on('message', (topic, payload) => {
            if (stopping) return;
            let data;
            try {
                data = JSON.parse(payload.toString('utf8'));
            } catch {
                logger.warn(`[MQTT] Invalid JSON on ${topic}; message ignored`);
                return;
            }
            logger.info(`[MQTT] Message ${topic}`, data);
        });
        client.on('reconnect', () => logger.info('[MQTT] Reconnecting'));
        client.on('offline', () => logger.warn('[MQTT] Offline; HTTP remains available'));
        client.on('close', () => logger.info(stopping ? '[MQTT] Connection closed' : '[MQTT] Connection closed; retry pending'));
        client.on('error', error => logger.error(`[MQTT] Connection error (${errorCode(error)}); HTTP remains available`));
        return client;
    }

    function stop() {
        if (stopPromise) return stopPromise;
        stopping = true;
        if (!client) return (stopPromise = Promise.resolve());
        stopPromise = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                client.stream?.destroy();
                reject(new Error('[MQTT] Client shutdown timed out'));
            }, stopTimeoutMs);
            // No outbound business messages in this consumer: do not wait for protocol ACKs.
            try {
                client.end(true, {}, () => {
                    clearTimeout(timer);
                    logger.info('[MQTT] Client stopped');
                    resolve();
                });
            } catch {
                clearTimeout(timer);
                client.stream?.destroy();
                reject(new Error('[MQTT] Client shutdown failed'));
            }
        });
        return stopPromise;
    }
    return { start, stop };
}

module.exports = { createMqttService, readConfig, DEVICE_TOPIC };
