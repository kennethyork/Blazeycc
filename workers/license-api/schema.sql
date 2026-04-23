-- Allowed emails table for Pro licenses
CREATE TABLE IF NOT EXISTS allowed_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    tier TEXT DEFAULT 'pro',  -- 'pro' ($5/mo) or 'pro+' ($7/mo)
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Migration: Add tier column if it doesn't exist
-- ALTER TABLE allowed_emails ADD COLUMN tier TEXT DEFAULT 'pro';

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

-- License activations - track device activations per license (for team seats)
CREATE TABLE IF NOT EXISTS license_activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    license_key TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT,            -- e.g. "Kenneth's MacBook Pro"
    platform TEXT,               -- 'windows', 'mac', 'linux'
    app_version TEXT,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(license_key, device_id)
);

CREATE INDEX IF NOT EXISTS idx_activations_license ON license_activations(license_key);
CREATE INDEX IF NOT EXISTS idx_activations_email ON license_activations(email);

-- Stripe subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    tier TEXT NOT NULL DEFAULT 'pro',  -- 'pro' or 'pro+'
    status TEXT NOT NULL DEFAULT 'active',  -- 'active', 'canceled', 'past_due', 'trialing'
    current_period_start DATETIME,
    current_period_end DATETIME,
    cancel_at_period_end INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Cloud storage files (R2)
CREATE TABLE IF NOT EXISTS cloud_storage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    r2_key TEXT UNIQUE NOT NULL,  -- Path in R2 bucket
    filename TEXT NOT NULL,        -- Original filename
    file_size INTEGER NOT NULL,    -- In bytes
    content_type TEXT,             -- MIME type
    thumbnail_key TEXT,            -- R2 key for custom thumbnail (Pro+)
    share_token TEXT UNIQUE,       -- Shareable link token
    share_expires_at DATETIME,     -- When share link expires
    allow_download INTEGER DEFAULT 1,  -- Whether viewers can download (Pro+)
    password_hash TEXT,            -- Password protection hash (Pro Max)
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_storage_email ON cloud_storage(email);
CREATE INDEX IF NOT EXISTS idx_storage_key ON cloud_storage(r2_key);
CREATE INDEX IF NOT EXISTS idx_storage_share_token ON cloud_storage(share_token);

-- Migration: Add new columns (run manually if table exists)
-- ALTER TABLE cloud_storage ADD COLUMN thumbnail_key TEXT;
-- ALTER TABLE cloud_storage ADD COLUMN allow_download INTEGER DEFAULT 1;
-- ALTER TABLE cloud_storage ADD COLUMN password_hash TEXT;
