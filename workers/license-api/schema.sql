-- Allowed emails table for Pro licenses
CREATE TABLE IF NOT EXISTS allowed_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_email ON allowed_emails(email);

-- Revoked licenses - block specific keys
CREATE TABLE IF NOT EXISTS revoked_licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT UNIQUE NOT NULL,
    email TEXT,
    reason TEXT,
    revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revoked_key ON revoked_licenses(license_key);

-- Usage tracking - count videos per user
CREATE TABLE IF NOT EXISTS usage_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    license_key TEXT,
    action TEXT NOT NULL,  -- 'video_created', 'export', etc.
    metadata TEXT,         -- JSON for extra data (duration, resolution, etc.)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_email ON usage_tracking(email);
CREATE INDEX IF NOT EXISTS idx_usage_action ON usage_tracking(action);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_tracking(created_at);

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER DEFAULT 100,  -- 100 = free
    max_uses INTEGER,                       -- NULL = unlimited
    current_uses INTEGER DEFAULT 0,
    valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_until DATETIME,                   -- NULL = no expiry
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes(code);

-- Promo code redemptions
CREATE TABLE IF NOT EXISTS promo_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promo_code_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id),
    UNIQUE(promo_code_id, email)  -- One redemption per email per code
);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,  -- 'download', 'error', 'license_check', 'app_start', etc.
    email TEXT,
    license_key TEXT,
    platform TEXT,             -- 'linux', 'windows', 'mac'
    app_version TEXT,
    metadata TEXT,             -- JSON for extra data
    ip_country TEXT,           -- From CF headers if available
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_email ON analytics(email);

-- Recording history synced from app
CREATE TABLE IF NOT EXISTS recording_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    filename TEXT NOT NULL,
    url TEXT,
    duration INTEGER,         -- Duration in seconds
    format TEXT,              -- mp4, webm, gif
    resolution TEXT,          -- e.g. "1920x1080"
    file_size INTEGER,        -- In bytes
    platform TEXT,            -- Social media platform preset
    local_path TEXT,          -- Path on user's machine
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_history_email ON recording_history(email);
CREATE INDEX IF NOT EXISTS idx_history_date ON recording_history(recorded_at);

-- Cloud storage files (R2)
CREATE TABLE IF NOT EXISTS cloud_storage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    r2_key TEXT UNIQUE NOT NULL,  -- Path in R2 bucket
    filename TEXT NOT NULL,        -- Original filename
    file_size INTEGER NOT NULL,    -- In bytes
    content_type TEXT,             -- MIME type
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_storage_email ON cloud_storage(email);
CREATE INDEX IF NOT EXISTS idx_storage_key ON cloud_storage(r2_key);
