-- [SP1-INF-02 & SP3-INF-01] Phụ trách: Phạm Việt Tiến
-- Lược đồ CSDL: devices, telemetry_logs, fall_events (kèm cột is_synced), command_logs

CREATE TABLE IF NOT EXISTS devices (
    device_id VARCHAR(64) PRIMARY KEY,
    mac_address VARCHAR(32),
    battery_level INT DEFAULT 100,
    status VARCHAR(16) DEFAULT 'OFFLINE',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(64) REFERENCES devices(device_id),
    ax FLOAT,
    ay FLOAT,
    az FLOAT,
    svm FLOAT,
    pitch FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fall_events (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(64) REFERENCES devices(device_id),
    svm_peak FLOAT,
    pitch_angle FLOAT,
    is_resolved BOOLEAN DEFAULT FALSE,
    is_synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS command_logs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(64) REFERENCES devices(device_id),
    action VARCHAR(32),
    params JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
