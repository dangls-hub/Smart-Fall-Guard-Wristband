// [SP2-INF-02] Phụ trách: Trần Đình Nam. Runs inside the backend process.
const STATUS_TOPIC = /^fallguard\/v1\/devices\/([a-zA-Z0-9_-]{1,64})\/status$/;
const POLL_MS = 5000;
const STALE_SECONDS = 15;
const MAX_PENDING_WRITES = 100;

// The baseline schema stores last_seen as a timestamp without time zone.
// Both queries interpret it as UTC. Preserve receipt time across pool delays.
const RECORD_HEARTBEAT = `
    INSERT INTO devices (device_id, status, last_seen)
    SELECT $1, 'ONLINE', $2::timestamptz AT TIME ZONE 'UTC'
    WHERE $2::timestamptz > statement_timestamp() - make_interval(secs => $3)
    ON CONFLICT (device_id) DO UPDATE
    SET status = EXCLUDED.status, last_seen = EXCLUDED.last_seen
    WHERE devices.last_seen IS NULL OR devices.last_seen <= EXCLUDED.last_seen
`;

const EXPIRE_HEARTBEATS = `
    UPDATE devices
    SET status = 'OFFLINE'
    WHERE status = 'ONLINE'
      AND (last_seen IS NULL
        OR last_seen <= (statement_timestamp() AT TIME ZONE 'UTC') - make_interval(secs => $1))
    RETURNING device_id
`;

function createHeartbeat({ db, logger = console }) {
    const pendingWrites = new Map();
    let timer;
    let sweep;
    let stopped = false;

    async function record(deviceId, pending) {
        while (pending.receivedAt) {
            const receivedAt = pending.receivedAt;
            pending.receivedAt = undefined;
            try {
                await db.query(RECORD_HEARTBEAT, [deviceId, receivedAt, STALE_SECONDS]);
            } catch {
                logger.error('[Heartbeat] Cannot record device activity; next heartbeat can retry');
            }
        }
        pendingWrites.delete(deviceId);
    }

    function onMessage(topic, data, packet) {
        if (stopped || packet?.retain || packet?.dup || data?.status !== 'ONLINE') return;
        const deviceId = STATUS_TOPIC.exec(topic)?.[1];
        if (!deviceId || deviceId === 'fallguard_backend' || data.device_id !== deviceId) return;
        const receivedAt = new Date();
        const existing = pendingWrites.get(deviceId);
        if (existing) {
            existing.receivedAt = receivedAt;
            return;
        }
        if (pendingWrites.size >= MAX_PENDING_WRITES) return;
        const pending = { receivedAt };
        pendingWrites.set(deviceId, pending);
        pending.write = record(deviceId, pending);
    }

    function poll() {
        if (sweep) return;
        sweep = db.query(EXPIRE_HEARTBEATS, [STALE_SECONDS]).then(({ rows }) => {
            if (rows.length) logger.info('[Heartbeat] Devices transitioned to OFFLINE', rows.map(row => row.device_id));
        }).catch(() => {
            logger.error('[Heartbeat] Cannot expire device activity; next sweep will retry');
        }).finally(() => { sweep = undefined; });
    }

    function start() {
        if (stopped || timer) return;
        poll();
        timer = setInterval(poll, POLL_MS);
    }

    function stop() {
        stopped = true;
        clearInterval(timer);
        return Promise.all([sweep, ...Array.from(pendingWrites.values(), pending => pending.write)]);
    }

    return { onMessage, start, stop };
}

module.exports = { createHeartbeat };
