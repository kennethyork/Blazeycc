// Cloudflare Worker: License API with D1 Database
// Features: License verification, revocation, usage tracking, promo codes, analytics
// Deploy: npx wrangler deploy

export default {
    async fetch(request, env) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key, X-License-Key',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            // =====================
            // ADMIN DASHBOARD
            // =====================
            
            // Serve admin dashboard UI
            if (path === '/admin' || path === '/admin/') {
                return handleAdminDashboard(request, env, corsHeaders);
            }
            
            // =====================
            // STRIPE ENDPOINTS
            // =====================
            
            // Stripe webhook handler
            if (path === '/stripe/webhook' && request.method === 'POST') {
                return handleStripeWebhook(request, env, corsHeaders);
            }
            
            // Create Stripe checkout session
            if (path === '/stripe/checkout' && request.method === 'POST') {
                return handleStripeCheckout(request, env, corsHeaders);
            }
            
            // Get Stripe customer portal URL
            if (path === '/stripe/portal' && request.method === 'POST') {
                return handleStripePortal(request, env, corsHeaders);
            }
            
            // =====================
            // PUBLIC ENDPOINTS
            // =====================
            
            // Get license key (subscribers, allowed emails, or promo codes)
            if (path === '/' && request.method === 'POST') {
                return handleGetLicense(request, env, corsHeaders);
            }
            
            // Validate license key (called by app)
            if (path === '/validate' && request.method === 'POST') {
                return handleValidateLicense(request, env, corsHeaders);
            }
            
            // Redeem promo code
            if (path === '/redeem' && request.method === 'POST') {
                return handleRedeemPromo(request, env, corsHeaders);
            }
            
            // Track usage/analytics (called by app)
            if (path === '/track' && request.method === 'POST') {
                return handleTrack(request, env, corsHeaders);
            }
            
            // Device activations (for team seats)
            if (path === '/activations' && request.method === 'GET') {
                return handleGetActivations(request, env, corsHeaders);
            }
            if (path === '/activations/deactivate' && request.method === 'POST') {
                return handleDeactivateDevice(request, env, corsHeaders);
            }
            
            // Recording history (synced from app)
            if (path === '/history' && request.method === 'POST') {
                return handleHistoryAdd(request, env, corsHeaders);
            }
            if (path === '/history' && request.method === 'GET') {
                return handleHistoryGet(request, env, corsHeaders);
            }
            if (path === '/history/delete' && request.method === 'POST') {
                return handleHistoryDelete(request, env, corsHeaders);
            }
            if (path === '/history/clear' && request.method === 'POST') {
                return handleHistoryClear(request, env, corsHeaders);
            }

            // =====================
            // CLOUD STORAGE ENDPOINTS (R2)
            // =====================
            
            // Upload video to cloud
            if (path === '/storage/upload' && request.method === 'POST') {
                return handleStorageUpload(request, env, corsHeaders);
            }
            // List user's cloud videos
            if (path === '/storage/list' && request.method === 'GET') {
                return handleStorageList(request, env, corsHeaders);
            }
            // Download video from cloud
            if (path === '/storage/download' && request.method === 'GET') {
                return handleStorageDownload(request, env, corsHeaders);
            }
            // Delete video from cloud
            if (path === '/storage/delete' && request.method === 'POST') {
                return handleStorageDelete(request, env, corsHeaders);
            }
            // Get storage usage
            if (path === '/storage/usage' && request.method === 'GET') {
                return handleStorageUsage(request, env, corsHeaders);
            }
            
            // Generate share link for video
            if (path === '/storage/share' && request.method === 'POST') {
                return handleStorageShare(request, env, corsHeaders);
            }
            // Revoke share link
            if (path === '/storage/unshare' && request.method === 'POST') {
                return handleStorageUnshare(request, env, corsHeaders);
            }
            // Upload custom thumbnail (Pro+)
            if (path === '/storage/thumbnail' && request.method === 'POST') {
                return handleThumbnailUpload(request, env, corsHeaders);
            }
            // Get embed code for shared video
            if (path === '/storage/embed' && request.method === 'GET') {
                return handleGetEmbedCode(request, env, corsHeaders);
            }
            // Get video analytics (Pro Max)
            if (path === '/storage/analytics' && request.method === 'GET') {
                return handleVideoAnalytics(request, env, corsHeaders);
            }
            // Public embed player page
            if (path.startsWith('/embed/') && request.method === 'GET') {
                const shareToken = path.replace('/embed/', '');
                return handleEmbedPlayer(shareToken, request, env, corsHeaders);
            }
            // Public access to shared video (no auth required)
            if (path.startsWith('/share/') && request.method === 'GET') {
                const shareToken = path.replace('/share/', '');
                return handlePublicShare(shareToken, request, env, corsHeaders);
            }
            // Stream/preview video (for cloud preview)
            if (path === '/storage/preview' && request.method === 'GET') {
                return handleStoragePreview(request, env, corsHeaders);
            }

            // =====================
            // ADMIN ENDPOINTS
            // =====================
            
            // Allowed emails
            if (path === '/admin/emails/add') return handleAdminEmailAdd(request, env, corsHeaders);
            if (path === '/admin/emails/remove') return handleAdminEmailRemove(request, env, corsHeaders);
            if (path === '/admin/emails/list') return handleAdminEmailList(request, env, corsHeaders);
            
            // Revoked licenses
            if (path === '/admin/revoke') return handleAdminRevoke(request, env, corsHeaders);
            if (path === '/admin/unrevoke') return handleAdminUnrevoke(request, env, corsHeaders);
            if (path === '/admin/revoked/list') return handleAdminRevokedList(request, env, corsHeaders);
            
            // Promo codes
            if (path === '/admin/promo/create') return handleAdminPromoCreate(request, env, corsHeaders);
            if (path === '/admin/promo/delete') return handleAdminPromoDelete(request, env, corsHeaders);
            if (path === '/admin/promo/list') return handleAdminPromoList(request, env, corsHeaders);
            
            // Analytics
            if (path === '/admin/analytics') return handleAdminAnalytics(request, env, corsHeaders);
            if (path === '/admin/usage') return handleAdminUsage(request, env, corsHeaders);
            if (path === '/admin/stats') return handleAdminStats(request, env, corsHeaders);

            return jsonResponse({ error: 'Not found' }, 404, corsHeaders);

        } catch (error) {
            console.error('Error:', error);
            return jsonResponse({ error: 'Internal server error', details: error.message }, 500, corsHeaders);
        }
    }
};

// =====================
// HELPER FUNCTIONS
// =====================

function jsonResponse(data, status = 200, corsHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

function verifyAdminKey(request, env) {
    const adminKey = request.headers.get('X-Admin-Key');
    return adminKey && adminKey === env.ADMIN_KEY;
}

function requireAdmin(request, env, corsHeaders) {
    if (!verifyAdminKey(request, env)) {
        return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }
    return null;
}

async function generateLicenseKey(email, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(email.toLowerCase().trim());
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const shortHash = hashHex.substring(0, 32).toUpperCase();
    
    return shortHash.match(/.{1,8}/g).join('-');
}

// =====================
// PUBLIC HANDLERS
// =====================

async function handleGetLicense(request, env, corsHeaders) {
    const { email } = await request.json();
    
    if (!email) {
        return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if allowed in DB (with tier)
    const allowedEntry = await env.DB.prepare(
        'SELECT email, tier FROM allowed_emails WHERE email = ?'
    ).bind(normalizedEmail).first();
    
    // Check Stripe subscriptions
    const subscription = await env.DB.prepare(
        "SELECT tier, status FROM subscriptions WHERE email = ? AND status IN ('active', 'trialing')"
    ).bind(normalizedEmail).first();
    
    const hasAccess = allowedEntry || subscription;
    
    if (!hasAccess) {
        return jsonResponse({ 
            error: 'No active subscription',
            message: 'This email is not associated with an active subscription. Please subscribe at blazeycc.com'
        }, 403, corsHeaders);
    }
    
    const licenseKey = await generateLicenseKey(normalizedEmail, env.LICENSE_SECRET);
    
    // Check if license is revoked
    const revoked = await env.DB.prepare(
        'SELECT reason FROM revoked_licenses WHERE license_key = ?'
    ).bind(licenseKey).first();
    
    if (revoked) {
        return jsonResponse({ 
            error: 'License revoked',
            reason: revoked.reason
        }, 403, corsHeaders);
    }
    
    // Get tier from subscription or allowed_emails
    const tier = subscription?.tier || allowedEntry?.tier || 'pro';
    
    // Log analytics
    await logAnalytics(env.DB, 'license_generated', normalizedEmail, licenseKey, request);
    
    return jsonResponse({ success: true, email: normalizedEmail, licenseKey, tier }, 200, corsHeaders);
}

async function handleValidateLicense(request, env, corsHeaders) {
    const { email, licenseKey, deviceId, deviceName, platform, appVersion } = await request.json();
    
    if (!email || !licenseKey) {
        return jsonResponse({ error: 'Email and licenseKey required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if revoked
    const revoked = await env.DB.prepare(
        'SELECT reason FROM revoked_licenses WHERE license_key = ?'
    ).bind(licenseKey).first();
    
    if (revoked) {
        await logAnalytics(env.DB, 'license_check_revoked', normalizedEmail, licenseKey, request);
        return jsonResponse({ valid: false, error: 'License revoked', reason: revoked.reason }, 200, corsHeaders);
    }
    
    // Verify key matches email
    const expectedKey = await generateLicenseKey(normalizedEmail, env.LICENSE_SECRET);
    const valid = licenseKey === expectedKey;
    
    // Get tier from subscriptions or allowed_emails
    let tier = 'pro';  // Default tier
    if (valid) {
        const subscription = await env.DB.prepare(
            "SELECT tier FROM subscriptions WHERE email = ? AND status IN ('active', 'trialing')"
        ).bind(normalizedEmail).first();
        if (subscription) {
            tier = subscription.tier;
        } else {
            const allowedEntry = await env.DB.prepare(
                'SELECT tier FROM allowed_emails WHERE email = ?'
            ).bind(normalizedEmail).first();
            tier = allowedEntry?.tier || 'pro';
        }
        
        // Seat limits per tier
        const seatLimits = {
            'pro': 1,
            'pro+': 1,
            'pro_plus': 1,
            'pro_max': 3,
            'pro-max': 3
        };
        const maxSeats = seatLimits[tier] || 1;
        
        // Track device activation if deviceId provided
        if (deviceId) {
            // Check existing activations
            const existingActivation = await env.DB.prepare(
                'SELECT id FROM license_activations WHERE license_key = ? AND device_id = ?'
            ).bind(licenseKey, deviceId).first();
            
            if (existingActivation) {
                // Update last seen
                await env.DB.prepare(
                    'UPDATE license_activations SET last_seen_at = CURRENT_TIMESTAMP, app_version = ? WHERE id = ?'
                ).bind(appVersion || null, existingActivation.id).run();
            } else {
                // Check seat count
                const activationCount = await env.DB.prepare(
                    'SELECT COUNT(*) as count FROM license_activations WHERE license_key = ?'
                ).bind(licenseKey).first();
                
                if (activationCount.count >= maxSeats) {
                    await logAnalytics(env.DB, 'license_seat_limit_reached', normalizedEmail, licenseKey, request);
                    return jsonResponse({ 
                        valid: false, 
                        error: 'Seat limit reached', 
                        message: `This license allows ${maxSeats} device(s). Please deactivate another device or upgrade to Pro Max for more seats.`,
                        currentSeats: activationCount.count,
                        maxSeats
                    }, 200, corsHeaders);
                }
                
                // Register new activation
                await env.DB.prepare(`
                    INSERT INTO license_activations (email, license_key, device_id, device_name, platform, app_version)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).bind(normalizedEmail, licenseKey, deviceId, deviceName || null, platform || null, appVersion || null).run();
                
                await logAnalytics(env.DB, 'device_activated', normalizedEmail, licenseKey, request);
            }
        }
    }
    
    await logAnalytics(env.DB, valid ? 'license_check_valid' : 'license_check_invalid', normalizedEmail, licenseKey, request);
    
    return jsonResponse({ valid, tier }, 200, corsHeaders);
}

async function handleRedeemPromo(request, env, corsHeaders) {
    const { email, code } = await request.json();
    
    if (!email || !code) {
        return jsonResponse({ error: 'Email and code required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.toUpperCase().trim();
    
    // Find promo code
    const promo = await env.DB.prepare(`
        SELECT id, discount_percent, max_uses, current_uses, valid_until 
        FROM promo_codes WHERE code = ?
    `).bind(normalizedCode).first();
    
    if (!promo) {
        return jsonResponse({ error: 'Invalid promo code' }, 404, corsHeaders);
    }
    
    // Check expiry
    if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        return jsonResponse({ error: 'Promo code expired' }, 400, corsHeaders);
    }
    
    // Check max uses
    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        return jsonResponse({ error: 'Promo code fully redeemed' }, 400, corsHeaders);
    }
    
    // Check if already redeemed by this email
    const alreadyRedeemed = await env.DB.prepare(
        'SELECT id FROM promo_redemptions WHERE promo_code_id = ? AND email = ?'
    ).bind(promo.id, normalizedEmail).first();
    
    if (alreadyRedeemed) {
        return jsonResponse({ error: 'You have already redeemed this code' }, 400, corsHeaders);
    }
    
    // Redeem: add to allowed emails and record redemption
    // Promo codes default to 'pro' tier (can be updated later via admin)
    await env.DB.batch([
        env.DB.prepare('INSERT OR REPLACE INTO allowed_emails (email, tier, note) VALUES (?, ?, ?)').bind(normalizedEmail, 'pro', `Promo: ${normalizedCode}`),
        env.DB.prepare('INSERT INTO promo_redemptions (promo_code_id, email) VALUES (?, ?)').bind(promo.id, normalizedEmail),
        env.DB.prepare('UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?').bind(promo.id)
    ]);
    
    const licenseKey = await generateLicenseKey(normalizedEmail, env.LICENSE_SECRET);
    
    await logAnalytics(env.DB, 'promo_redeemed', normalizedEmail, licenseKey, request, { code: normalizedCode });
    
    return jsonResponse({ 
        success: true, 
        email: normalizedEmail, 
        licenseKey,
        tier: 'pro',
        discount: promo.discount_percent
    }, 200, corsHeaders);
}

async function handleTrack(request, env, corsHeaders) {
    const { email, licenseKey, action, metadata } = await request.json();
    
    if (!action) {
        return jsonResponse({ error: 'Action required' }, 400, corsHeaders);
    }
    
    // Record usage
    await env.DB.prepare(`
        INSERT INTO usage_tracking (email, license_key, action, metadata)
        VALUES (?, ?, ?, ?)
    `).bind(
        email?.toLowerCase().trim() || null,
        licenseKey || null,
        action,
        metadata ? JSON.stringify(metadata) : null
    ).run();
    
    // Also log to analytics
    await logAnalytics(env.DB, action, email, licenseKey, request, metadata);
    
    return jsonResponse({ success: true }, 200, corsHeaders);
}

// =====================
// DEVICE ACTIVATION HANDLERS
// =====================

async function handleGetActivations(request, env, corsHeaders) {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const licenseKey = url.searchParams.get('licenseKey');
    
    if (!email || !licenseKey) {
        return jsonResponse({ error: 'Email and licenseKey required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Get tier for seat limit info
    let tier = 'pro';
    const subscription = await env.DB.prepare(
        "SELECT tier FROM subscriptions WHERE email = ? AND status IN ('active', 'trialing')"
    ).bind(normalizedEmail).first();
    if (subscription) {
        tier = subscription.tier;
    } else {
        const allowedEntry = await env.DB.prepare(
            'SELECT tier FROM allowed_emails WHERE email = ?'
        ).bind(normalizedEmail).first();
        tier = allowedEntry?.tier || 'pro';
    }
    
    const seatLimits = { 'pro': 1, 'pro+': 1, 'pro_plus': 1, 'pro_max': 3, 'pro-max': 3 };
    const maxSeats = seatLimits[tier] || 1;
    
    // Get all activations for this license
    const activations = await env.DB.prepare(`
        SELECT id, device_id, device_name, platform, app_version, last_seen_at, activated_at
        FROM license_activations
        WHERE license_key = ?
        ORDER BY last_seen_at DESC
    `).bind(licenseKey).all();
    
    return jsonResponse({
        activations: activations.results || [],
        currentSeats: activations.results?.length || 0,
        maxSeats,
        tier
    }, 200, corsHeaders);
}

async function handleDeactivateDevice(request, env, corsHeaders) {
    const { email, licenseKey, deviceId } = await request.json();
    
    if (!email || !licenseKey || !deviceId) {
        return jsonResponse({ error: 'Email, licenseKey, and deviceId required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Delete the activation
    const result = await env.DB.prepare(
        'DELETE FROM license_activations WHERE license_key = ? AND device_id = ?'
    ).bind(licenseKey, deviceId).run();
    
    await logAnalytics(env.DB, 'device_deactivated', normalizedEmail, licenseKey, request);
    
    return jsonResponse({ 
        success: true, 
        deactivated: result.meta?.changes > 0 
    }, 200, corsHeaders);
}

// =====================
// HISTORY HANDLERS
// =====================

async function handleHistoryAdd(request, env, corsHeaders) {
    const { email, licenseKey, record } = await request.json();
    
    if (!email || !record || !record.filename) {
        return jsonResponse({ error: 'Email and record with filename required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    await env.DB.prepare(`
        INSERT INTO recording_history 
        (email, filename, url, duration, format, resolution, file_size, platform, local_path, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        normalizedEmail,
        record.filename,
        record.url || null,
        record.duration || null,
        record.format || null,
        record.resolution || null,
        record.fileSize || null,
        record.platform || null,
        record.path || null,
        record.recordedAt ? new Date(record.recordedAt).toISOString() : new Date().toISOString()
    ).run();
    
    return jsonResponse({ success: true }, 200, corsHeaders);
}

async function handleHistoryGet(request, env, corsHeaders) {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const licenseKey = url.searchParams.get('licenseKey');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    if (!email) {
        return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    const result = await env.DB.prepare(`
        SELECT id, filename, url, duration, format, resolution, file_size, platform, local_path, recorded_at
        FROM recording_history 
        WHERE email = ? 
        ORDER BY recorded_at DESC 
        LIMIT ?
    `).bind(normalizedEmail, limit).all();
    
    return jsonResponse({ 
        success: true, 
        history: result.results.map(r => ({
            id: r.id,
            filename: r.filename,
            url: r.url,
            duration: r.duration,
            format: r.format,
            resolution: r.resolution,
            fileSize: r.file_size,
            platform: r.platform,
            path: r.local_path,
            recordedAt: r.recorded_at
        }))
    }, 200, corsHeaders);
}

async function handleHistoryDelete(request, env, corsHeaders) {
    const { email, licenseKey, id } = await request.json();
    
    if (!email || !id) {
        return jsonResponse({ error: 'Email and id required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    await env.DB.prepare(
        'DELETE FROM recording_history WHERE id = ? AND email = ?'
    ).bind(id, normalizedEmail).run();
    
    return jsonResponse({ success: true }, 200, corsHeaders);
}

async function handleHistoryClear(request, env, corsHeaders) {
    const { email, licenseKey } = await request.json();
    
    if (!email) {
        return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    await env.DB.prepare(
        'DELETE FROM recording_history WHERE email = ?'
    ).bind(normalizedEmail).run();
    
    return jsonResponse({ success: true }, 200, corsHeaders);
}

async function verifyLicenseKey(env, email, licenseKey) {
    if (!licenseKey) return false;
    
    // Check if license is revoked
    const revoked = await env.DB.prepare(
        'SELECT 1 FROM revoked_licenses WHERE license_key = ?'
    ).bind(licenseKey).first();
    
    if (revoked) return false;
    
    // Generate expected key and compare
    const expectedKey = await generateLicenseKey(email, env.LICENSE_SECRET);
    return licenseKey === expectedKey;
}

// =====================
// ADMIN HANDLERS
// =====================

async function handleAdminEmailAdd(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const { email, note, tier } = await request.json();
    if (!email) return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    
    const normalizedEmail = email.toLowerCase().trim();
    const licenseTier = tier || 'pro';  // Default to 'pro' if not specified
    await env.DB.prepare(
        'INSERT OR REPLACE INTO allowed_emails (email, tier, note) VALUES (?, ?, ?)'
    ).bind(normalizedEmail, licenseTier, note || null).run();
    
    return jsonResponse({ success: true, email: normalizedEmail, tier: licenseTier }, 200, corsHeaders);
}

async function handleAdminEmailRemove(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const { email } = await request.json();
    if (!email) return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    
    const normalizedEmail = email.toLowerCase().trim();
    await env.DB.prepare('DELETE FROM allowed_emails WHERE email = ?').bind(normalizedEmail).run();
    
    return jsonResponse({ success: true, removed: normalizedEmail }, 200, corsHeaders);
}

async function handleAdminEmailList(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const result = await env.DB.prepare(
        'SELECT email, tier, note, created_at FROM allowed_emails ORDER BY created_at DESC'
    ).all();
    
    return jsonResponse({ success: true, emails: result.results }, 200, corsHeaders);
}

async function handleAdminRevoke(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const { email, licenseKey, reason } = await request.json();
    
    let key = licenseKey;
    let emailUsed = email?.toLowerCase().trim();
    
    // If only email provided, generate the key
    if (!key && emailUsed) {
        key = await generateLicenseKey(emailUsed, env.LICENSE_SECRET);
    }
    
    if (!key) return jsonResponse({ error: 'Email or licenseKey required' }, 400, corsHeaders);
    
    await env.DB.prepare(
        'INSERT OR REPLACE INTO revoked_licenses (license_key, email, reason) VALUES (?, ?, ?)'
    ).bind(key, emailUsed || null, reason || 'Revoked by admin').run();
    
    return jsonResponse({ success: true, revoked: key }, 200, corsHeaders);
}

async function handleAdminUnrevoke(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const { email, licenseKey } = await request.json();
    
    let key = licenseKey;
    if (!key && email) {
        key = await generateLicenseKey(email.toLowerCase().trim(), env.LICENSE_SECRET);
    }
    
    if (!key) return jsonResponse({ error: 'Email or licenseKey required' }, 400, corsHeaders);
    
    await env.DB.prepare('DELETE FROM revoked_licenses WHERE license_key = ?').bind(key).run();
    
    return jsonResponse({ success: true, unrevoked: key }, 200, corsHeaders);
}

async function handleAdminRevokedList(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const result = await env.DB.prepare(
        'SELECT license_key, email, reason, revoked_at FROM revoked_licenses ORDER BY revoked_at DESC'
    ).all();
    
    return jsonResponse({ success: true, revoked: result.results }, 200, corsHeaders);
}

async function handleAdminPromoCreate(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const { code, discount_percent, max_uses, valid_until, note } = await request.json();
    
    if (!code) return jsonResponse({ error: 'Code required' }, 400, corsHeaders);
    
    const normalizedCode = code.toUpperCase().trim();
    
    await env.DB.prepare(`
        INSERT INTO promo_codes (code, discount_percent, max_uses, valid_until, note)
        VALUES (?, ?, ?, ?, ?)
    `).bind(
        normalizedCode,
        discount_percent ?? 100,
        max_uses || null,
        valid_until || null,
        note || null
    ).run();
    
    return jsonResponse({ success: true, code: normalizedCode }, 200, corsHeaders);
}

async function handleAdminPromoDelete(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const { code } = await request.json();
    if (!code) return jsonResponse({ error: 'Code required' }, 400, corsHeaders);
    
    await env.DB.prepare('DELETE FROM promo_codes WHERE code = ?').bind(code.toUpperCase().trim()).run();
    
    return jsonResponse({ success: true, deleted: code }, 200, corsHeaders);
}

async function handleAdminPromoList(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const result = await env.DB.prepare(`
        SELECT code, discount_percent, max_uses, current_uses, valid_from, valid_until, note, created_at
        FROM promo_codes ORDER BY created_at DESC
    `).all();
    
    return jsonResponse({ success: true, promos: result.results }, 200, corsHeaders);
}

async function handleAdminAnalytics(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    const eventType = url.searchParams.get('event');
    
    let query = `
        SELECT event_type, COUNT(*) as count, DATE(created_at) as date
        FROM analytics 
        WHERE created_at >= datetime('now', '-${days} days')
    `;
    if (eventType) query += ` AND event_type = '${eventType}'`;
    query += ' GROUP BY event_type, DATE(created_at) ORDER BY date DESC, count DESC';
    
    const result = await env.DB.prepare(query).all();
    
    return jsonResponse({ success: true, analytics: result.results }, 200, corsHeaders);
}

async function handleAdminUsage(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const days = parseInt(url.searchParams.get('days') || '30');
    
    let query, params;
    
    if (email) {
        // Usage for specific user
        query = `
            SELECT action, COUNT(*) as count, MAX(created_at) as last_used
            FROM usage_tracking 
            WHERE email = ? AND created_at >= datetime('now', '-${days} days')
            GROUP BY action ORDER BY count DESC
        `;
        params = [email.toLowerCase().trim()];
    } else {
        // Top users by usage
        query = `
            SELECT email, COUNT(*) as total_actions, 
                   SUM(CASE WHEN action = 'video_created' THEN 1 ELSE 0 END) as videos_created
            FROM usage_tracking 
            WHERE created_at >= datetime('now', '-${days} days') AND email IS NOT NULL
            GROUP BY email ORDER BY total_actions DESC LIMIT 50
        `;
        params = [];
    }
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    return jsonResponse({ success: true, usage: result.results }, 200, corsHeaders);
}

async function handleAdminStats(request, env, corsHeaders) {
    const authError = requireAdmin(request, env, corsHeaders);
    if (authError) return authError;
    
    const [emails, revoked, promos, analytics, usage] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as count FROM allowed_emails').first(),
        env.DB.prepare('SELECT COUNT(*) as count FROM revoked_licenses').first(),
        env.DB.prepare('SELECT COUNT(*) as count FROM promo_codes').first(),
        env.DB.prepare("SELECT COUNT(*) as count FROM analytics WHERE created_at >= datetime('now', '-7 days')").first(),
        env.DB.prepare("SELECT COUNT(*) as count FROM usage_tracking WHERE created_at >= datetime('now', '-7 days')").first()
    ]);
    
    return jsonResponse({
        success: true,
        stats: {
            allowed_emails: emails.count,
            revoked_licenses: revoked.count,
            active_promos: promos.count,
            analytics_7d: analytics.count,
            usage_7d: usage.count
        }
    }, 200, corsHeaders);
}

// =====================
// ADMIN DASHBOARD
// =====================

async function handleAdminDashboard(request, env, corsHeaders) {
    // Check admin key from query param or header
    const url = new URL(request.url);
    const adminKey = url.searchParams.get('key') || request.headers.get('X-Admin-Key');
    
    if (!adminKey || adminKey !== env.ADMIN_KEY) {
        return new Response('Unauthorized. Add ?key=YOUR_ADMIN_KEY', { 
            status: 401, 
            headers: { 'Content-Type': 'text/plain' } 
        });
    }
    
    // Fetch stats for the dashboard
    const [stats, recentAnalytics, topUsers, emails, promos] = await Promise.all([
        env.DB.prepare('SELECT COUNT(*) as total FROM allowed_emails').first(),
        env.DB.prepare(`
            SELECT event_type, COUNT(*) as count 
            FROM analytics 
            WHERE created_at >= datetime('now', '-7 days')
            GROUP BY event_type 
            ORDER BY count DESC 
            LIMIT 10
        `).all(),
        env.DB.prepare(`
            SELECT email, COUNT(*) as actions, MAX(created_at) as last_active
            FROM usage_tracking 
            WHERE created_at >= datetime('now', '-30 days') AND email IS NOT NULL
            GROUP BY email 
            ORDER BY actions DESC 
            LIMIT 15
        `).all(),
        env.DB.prepare('SELECT email, tier, note, created_at FROM allowed_emails ORDER BY created_at DESC LIMIT 20').all(),
        env.DB.prepare('SELECT code, current_uses, max_uses, valid_until FROM promo_codes ORDER BY created_at DESC LIMIT 10').all()
    ]);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blazeycc Admin Dashboard</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f23; color: #e0e0e0; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #a855f7; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        h1::before { content: '🔥'; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
        .card { background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #333; }
        .card h2 { color: #a855f7; margin-bottom: 15px; font-size: 1.1rem; }
        .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333; }
        .stat-row:last-child { border-bottom: none; }
        .stat-label { color: #888; }
        .stat-value { font-weight: bold; color: #10b981; }
        .stat-value.purple { color: #a855f7; }
        table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
        th { color: #a855f7; font-weight: 600; }
        td { color: #ccc; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
        .badge-pro { background: #a855f7; color: white; }
        .badge-pro-plus { background: #6366f1; color: white; }
        .refresh-btn { background: #a855f7; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-bottom: 20px; }
        .refresh-btn:hover { background: #9333ea; }
        .timestamp { color: #666; font-size: 0.8rem; }
        .api-section { margin-top: 30px; }
        .api-endpoint { background: #252540; padding: 12px; border-radius: 6px; margin: 8px 0; font-family: monospace; font-size: 0.85rem; }
        .method { color: #10b981; font-weight: bold; }
        input[type="text"], input[type="email"] { background: #252540; border: 1px solid #444; color: white; padding: 8px 12px; border-radius: 6px; margin-right: 10px; }
        button { background: #a855f7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
        button:hover { background: #9333ea; }
        .form-row { display: flex; align-items: center; gap: 10px; margin: 10px 0; flex-wrap: wrap; }
        .success { color: #10b981; }
        .error { color: #ef4444; }
        #result { margin-top: 10px; padding: 10px; background: #252540; border-radius: 6px; display: none; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Blazeycc Admin</h1>
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
        
        <div class="grid">
            <div class="card">
                <h2>📊 Overview (Last 7 Days)</h2>
                <div class="stat-row">
                    <span class="stat-label">Total Licensed Users</span>
                    <span class="stat-value purple">${stats?.total || 0}</span>
                </div>
                ${recentAnalytics.results?.map(r => `
                <div class="stat-row">
                    <span class="stat-label">${r.event_type.replace(/_/g, ' ')}</span>
                    <span class="stat-value">${r.count}</span>
                </div>
                `).join('') || '<div class="stat-row"><span class="stat-label">No events</span></div>'}
            </div>
            
            <div class="card">
                <h2>👥 Top Active Users (30 Days)</h2>
                <table>
                    <tr><th>Email</th><th>Actions</th><th>Last Active</th></tr>
                    ${topUsers.results?.map(u => `
                    <tr>
                        <td>${u.email}</td>
                        <td>${u.actions}</td>
                        <td class="timestamp">${new Date(u.last_active).toLocaleDateString()}</td>
                    </tr>
                    `).join('') || '<tr><td colspan="3">No data</td></tr>'}
                </table>
            </div>
            
            <div class="card">
                <h2>🎫 Recent Licenses</h2>
                <table>
                    <tr><th>Email</th><th>Tier</th><th>Added</th></tr>
                    ${emails.results?.map(e => `
                    <tr>
                        <td>${e.email}</td>
                        <td><span class="badge ${e.tier === 'pro+' ? 'badge-pro-plus' : 'badge-pro'}">${e.tier || 'pro'}</span></td>
                        <td class="timestamp">${new Date(e.created_at).toLocaleDateString()}</td>
                    </tr>
                    `).join('') || '<tr><td colspan="3">No licenses</td></tr>'}
                </table>
            </div>
            
            <div class="card">
                <h2>🎁 Promo Codes</h2>
                <table>
                    <tr><th>Code</th><th>Uses</th><th>Expires</th></tr>
                    ${promos.results?.map(p => `
                    <tr>
                        <td><code>${p.code}</code></td>
                        <td>${p.current_uses}${p.max_uses ? '/' + p.max_uses : ''}</td>
                        <td class="timestamp">${p.valid_until ? new Date(p.valid_until).toLocaleDateString() : 'Never'}</td>
                    </tr>
                    `).join('') || '<tr><td colspan="3">No promos</td></tr>'}
                </table>
            </div>
        </div>
        
        <div class="card api-section">
            <h2>⚡ Quick Actions</h2>
            
            <h3 style="margin: 15px 0 10px; color: #888;">Add License</h3>
            <div class="form-row">
                <input type="email" id="addEmail" placeholder="user@email.com">
                <select id="addTier" style="background: #252540; border: 1px solid #444; color: white; padding: 8px; border-radius: 6px;">
                    <option value="pro">Pro ($5)</option>
                    <option value="pro+">Pro+ ($7)</option>
                </select>
                <input type="text" id="addNote" placeholder="Note (optional)">
                <button onclick="addEmail()">Add Email</button>
            </div>
            
            <h3 style="margin: 15px 0 10px; color: #888;">Create Promo Code</h3>
            <div class="form-row">
                <input type="text" id="promoCode" placeholder="CODE123">
                <input type="number" id="promoMaxUses" placeholder="Max uses" style="width: 100px; background: #252540; border: 1px solid #444; color: white; padding: 8px; border-radius: 6px;">
                <button onclick="createPromo()">Create Promo</button>
            </div>
            
            <h3 style="margin: 15px 0 10px; color: #888;">Revoke License</h3>
            <div class="form-row">
                <input type="email" id="revokeEmail" placeholder="user@email.com">
                <input type="text" id="revokeReason" placeholder="Reason">
                <button onclick="revokeLicense()" style="background: #ef4444;">Revoke</button>
            </div>
            
            <div id="result"></div>
        </div>
        
        <div class="card api-section">
            <h2>🔌 API Endpoints</h2>
            <div class="api-endpoint"><span class="method">POST</span> /admin/emails/add - Add email to allowed list</div>
            <div class="api-endpoint"><span class="method">POST</span> /admin/emails/remove - Remove email</div>
            <div class="api-endpoint"><span class="method">GET</span> /admin/emails/list - List all emails</div>
            <div class="api-endpoint"><span class="method">POST</span> /admin/revoke - Revoke license</div>
            <div class="api-endpoint"><span class="method">POST</span> /admin/promo/create - Create promo code</div>
            <div class="api-endpoint"><span class="method">GET</span> /admin/analytics?days=7 - Get analytics</div>
            <div class="api-endpoint"><span class="method">GET</span> /admin/stats - Get overview stats</div>
        </div>
    </div>
    
    <script>
        const API_BASE = window.location.origin;
        const ADMIN_KEY = '${adminKey}';
        
        function showResult(message, isError = false) {
            const el = document.getElementById('result');
            el.style.display = 'block';
            el.className = isError ? 'error' : 'success';
            el.textContent = message;
        }
        
        async function apiCall(endpoint, body) {
            const res = await fetch(API_BASE + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
                body: JSON.stringify(body)
            });
            return res.json();
        }
        
        async function addEmail() {
            const email = document.getElementById('addEmail').value;
            const tier = document.getElementById('addTier').value;
            const note = document.getElementById('addNote').value;
            if (!email) return showResult('Email required', true);
            
            const result = await apiCall('/admin/emails/add', { email, tier, note });
            showResult(result.success ? 'Added: ' + email + ' (' + tier + ')' : result.error, !result.success);
            if (result.success) setTimeout(() => location.reload(), 1000);
        }
        
        async function createPromo() {
            const code = document.getElementById('promoCode').value;
            const max_uses = document.getElementById('promoMaxUses').value || null;
            if (!code) return showResult('Code required', true);
            
            const result = await apiCall('/admin/promo/create', { code, max_uses: max_uses ? parseInt(max_uses) : null });
            showResult(result.success ? 'Created: ' + code : result.error, !result.success);
            if (result.success) setTimeout(() => location.reload(), 1000);
        }
        
        async function revokeLicense() {
            const email = document.getElementById('revokeEmail').value;
            const reason = document.getElementById('revokeReason').value;
            if (!email) return showResult('Email required', true);
            
            const result = await apiCall('/admin/revoke', { email, reason });
            showResult(result.success ? 'Revoked: ' + email : result.error, !result.success);
        }
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}

// =====================
// STRIPE HANDLERS
// =====================

async function handleStripeWebhook(request, env, corsHeaders) {
    const signature = request.headers.get('Stripe-Signature');
    const body = await request.text();
    
    // Verify webhook signature
    if (env.STRIPE_WEBHOOK_SECRET) {
        const isValid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
        if (!isValid) {
            console.error('Invalid Stripe webhook signature');
            return jsonResponse({ error: 'Invalid signature' }, 401, corsHeaders);
        }
    }
    
    const event = JSON.parse(body);
    console.log(`Stripe event: ${event.type}`);
    
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const email = session.customer_email?.toLowerCase().trim();
                const customerId = session.customer;
                const subscriptionId = session.subscription;
                
                // Determine tier from metadata or price
                const tier = session.metadata?.tier || 'pro';
                
                if (email && subscriptionId) {
                    await env.DB.prepare(`
                        INSERT INTO subscriptions (email, stripe_customer_id, stripe_subscription_id, tier, status)
                        VALUES (?, ?, ?, ?, 'active')
                        ON CONFLICT(email) DO UPDATE SET
                            stripe_customer_id = excluded.stripe_customer_id,
                            stripe_subscription_id = excluded.stripe_subscription_id,
                            tier = excluded.tier,
                            status = 'active',
                            updated_at = CURRENT_TIMESTAMP
                    `).bind(email, customerId, subscriptionId, tier).run();
                    
                    const licenseKey = await generateLicenseKey(email, env.LICENSE_SECRET);
                    await logAnalytics(env.DB, 'subscription_created', email, licenseKey, request, { tier, via: 'stripe' });
                }
                break;
            }
            
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const subscriptionId = subscription.id;
                const status = subscription.status;
                const cancelAtPeriodEnd = subscription.cancel_at_period_end ? 1 : 0;
                
                // Map Stripe status to our status
                const mappedStatus = ['active', 'trialing'].includes(status) ? status : 
                                     status === 'past_due' ? 'past_due' : 'canceled';
                
                await env.DB.prepare(`
                    UPDATE subscriptions SET 
                        status = ?,
                        cancel_at_period_end = ?,
                        current_period_start = ?,
                        current_period_end = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE stripe_subscription_id = ?
                `).bind(
                    mappedStatus,
                    cancelAtPeriodEnd,
                    new Date(subscription.current_period_start * 1000).toISOString(),
                    new Date(subscription.current_period_end * 1000).toISOString(),
                    subscriptionId
                ).run();
                break;
            }
            
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await env.DB.prepare(`
                    UPDATE subscriptions SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
                    WHERE stripe_subscription_id = ?
                `).bind(subscription.id).run();
                break;
            }
            
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                await env.DB.prepare(`
                    UPDATE subscriptions SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
                    WHERE stripe_subscription_id = ?
                `).bind(invoice.subscription).run();
                break;
            }
        }
        
        return jsonResponse({ received: true }, 200, corsHeaders);
    } catch (error) {
        console.error('Stripe webhook error:', error);
        return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
}

async function handleStripeCheckout(request, env, corsHeaders) {
    if (!env.STRIPE_SECRET_KEY) {
        return jsonResponse({ error: 'Stripe not configured' }, 503, corsHeaders);
    }
    
    const { email, tier, successUrl, cancelUrl } = await request.json();
    
    if (!email) {
        return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    }
    
    // Price IDs - set these in your Cloudflare Worker environment variables
    const priceId = tier === 'pro+' ? env.STRIPE_PRICE_PRO_PLUS : env.STRIPE_PRICE_PRO;
    
    if (!priceId) {
        return jsonResponse({ error: 'Price not configured for tier: ' + tier }, 503, corsHeaders);
    }
    
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'mode': 'subscription',
            'customer_email': email.toLowerCase().trim(),
            'line_items[0][price]': priceId,
            'line_items[0][quantity]': '1',
            'success_url': successUrl || 'https://blazeycc.com/success',
            'cancel_url': cancelUrl || 'https://blazeycc.com/pricing',
            'metadata[tier]': tier || 'pro',
            'metadata[email]': email.toLowerCase().trim(),
        }),
    });
    
    const session = await response.json();
    
    if (session.error) {
        return jsonResponse({ error: session.error.message }, 400, corsHeaders);
    }
    
    return jsonResponse({ url: session.url, sessionId: session.id }, 200, corsHeaders);
}

async function handleStripePortal(request, env, corsHeaders) {
    if (!env.STRIPE_SECRET_KEY) {
        return jsonResponse({ error: 'Stripe not configured' }, 503, corsHeaders);
    }
    
    const { email, returnUrl } = await request.json();
    
    if (!email) {
        return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Get customer ID from DB
    const subscription = await env.DB.prepare(
        'SELECT stripe_customer_id FROM subscriptions WHERE email = ?'
    ).bind(normalizedEmail).first();
    
    if (!subscription?.stripe_customer_id) {
        return jsonResponse({ error: 'No subscription found for this email' }, 404, corsHeaders);
    }
    
    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'customer': subscription.stripe_customer_id,
            'return_url': returnUrl || 'https://blazeycc.com',
        }),
    });
    
    const session = await response.json();
    
    if (session.error) {
        return jsonResponse({ error: session.error.message }, 400, corsHeaders);
    }
    
    return jsonResponse({ url: session.url }, 200, corsHeaders);
}

async function verifyStripeSignature(payload, signature, secret) {
    if (!signature || !secret) return false;
    
    const parts = signature.split(',');
    let timestamp = '';
    let signatures = [];
    
    for (const part of parts) {
        const [key, value] = part.split('=');
        if (key === 't') timestamp = value;
        if (key === 'v1') signatures.push(value);
    }
    
    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return signatures.some(s => s === expectedSig);
}

// =====================
// UTILITY FUNCTIONS
// =====================

async function logAnalytics(db, eventType, email, licenseKey, request, metadata = null) {
    const cf = request.cf || {};
    
    await db.prepare(`
        INSERT INTO analytics (event_type, email, license_key, platform, app_version, metadata, ip_country)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
        eventType,
        email?.toLowerCase().trim() || null,
        licenseKey || null,
        metadata?.platform || null,
        metadata?.appVersion || null,
        metadata ? JSON.stringify(metadata) : null,
        cf.country || null
    ).run();
}

// =====================
// CLOUD STORAGE HANDLERS (R2)
// =====================

// Storage limits per tier in bytes
const STORAGE_LIMITS = {
    'pro': 2 * 1024 * 1024 * 1024,      // 2GB for Pro
    'pro+': 5 * 1024 * 1024 * 1024,     // 5GB for Pro+
    'pro_plus': 5 * 1024 * 1024 * 1024, // 5GB for Pro+
    'pro_max': 15 * 1024 * 1024 * 1024, // 15GB for Pro Max
    'pro-max': 15 * 1024 * 1024 * 1024  // 15GB for Pro Max
};

async function getStorageLimitForUser(env, email) {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check subscription first
    const subscription = await env.DB.prepare(
        "SELECT tier FROM subscriptions WHERE email = ? AND status IN ('active', 'trialing')"
    ).bind(normalizedEmail).first();
    
    let tier = 'pro';
    if (subscription) {
        tier = subscription.tier;
    } else {
        const allowedEntry = await env.DB.prepare(
            'SELECT tier FROM allowed_emails WHERE email = ?'
        ).bind(normalizedEmail).first();
        tier = allowedEntry?.tier || 'pro';
    }
    
    return STORAGE_LIMITS[tier] || 0;
}

function checkR2Available(env, corsHeaders) {
    if (!env.STORAGE) {
        return jsonResponse({ 
            error: 'Cloud storage not configured',
            message: 'Please enable R2 in Cloudflare Dashboard and create bucket "blazeycc-recordings"'
        }, 503, corsHeaders);
    }
    return null;
}

async function handleStorageUpload(request, env, corsHeaders) {
    const r2Check = checkR2Available(env, corsHeaders);
    if (r2Check) return r2Check;
    
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const licenseKey = url.searchParams.get('licenseKey');
    const filename = url.searchParams.get('filename');
    const contentType = request.headers.get('content-type') || 'video/mp4';
    
    if (!email || !filename) {
        return jsonResponse({ error: 'Email and filename required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Get tier-based storage limit
    const limitBytes = await getStorageLimitForUser(env, normalizedEmail);
    if (limitBytes === 0) {
        return jsonResponse({ 
            error: 'Cloud storage not available for your tier',
            message: 'Upgrade to Pro+ or Pro Max to access cloud storage'
        }, 403, corsHeaders);
    }
    
    // Check current storage usage
    const usage = await calculateStorageUsage(env, normalizedEmail);
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    
    if (usage + contentLength > limitBytes) {
        return jsonResponse({ 
            error: 'Storage limit exceeded',
            used: usage,
            limit: limitBytes,
            available: limitBytes - usage
        }, 413, corsHeaders);
    }
    
    // Generate unique key for R2
    const timestamp = Date.now();
    const r2Key = `${normalizedEmail}/${timestamp}-${filename}`;
    
    // Upload to R2
    await env.STORAGE.put(r2Key, request.body, {
        httpMetadata: { contentType },
        customMetadata: {
            email: normalizedEmail,
            filename,
            uploadedAt: new Date().toISOString(),
            size: contentLength.toString()
        }
    });
    
    // Record in database
    await env.DB.prepare(`
        INSERT INTO cloud_storage (email, r2_key, filename, file_size, content_type)
        VALUES (?, ?, ?, ?, ?)
    `).bind(normalizedEmail, r2Key, filename, contentLength, contentType).run();
    
    await logAnalytics(env.DB, 'storage_upload', normalizedEmail, licenseKey, request, { filename, size: contentLength });
    
    return jsonResponse({ 
        success: true, 
        key: r2Key,
        filename,
        size: contentLength,
        usedAfter: usage + contentLength,
        limit: limitBytes
    }, 200, corsHeaders);
}

async function handleStorageList(request, env, corsHeaders) {
    const r2Check = checkR2Available(env, corsHeaders);
    if (r2Check) return r2Check;
    
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const licenseKey = url.searchParams.get('licenseKey');
    
    if (!email) {
        return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Get list from database (including share info)
    const result = await env.DB.prepare(`
        SELECT id, r2_key, filename, file_size, content_type, uploaded_at, share_token, share_expires_at
        FROM cloud_storage 
        WHERE email = ? 
        ORDER BY uploaded_at DESC
    `).bind(normalizedEmail).all();
    
    const baseUrl = new URL(request.url).origin;
    const limitBytes = await getStorageLimitForUser(env, normalizedEmail);
    const usage = await calculateStorageUsage(env, normalizedEmail);
    
    return jsonResponse({ 
        success: true, 
        files: result.results.map(f => ({
            id: f.id,
            key: f.r2_key,
            filename: f.filename,
            size: f.file_size,
            contentType: f.content_type,
            uploadedAt: f.uploaded_at,
            shareToken: f.share_token || null,
            shareUrl: f.share_token ? `${baseUrl}/share/${f.share_token}` : null,
            shareExpiresAt: f.share_expires_at || null
        })),
        usage: {
            used: usage,
            limit: limitBytes,
            available: limitBytes - usage,
            percentUsed: Math.round((usage / limitBytes) * 100)
        }
    }, 200, corsHeaders);
}

async function handleStorageDownload(request, env, corsHeaders) {
    const r2Check = checkR2Available(env, corsHeaders);
    if (r2Check) return r2Check;
    
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const licenseKey = url.searchParams.get('licenseKey');
    const key = url.searchParams.get('key');
    
    if (!email || !key) {
        return jsonResponse({ error: 'Email and key required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Verify the key belongs to this user
    if (!key.startsWith(normalizedEmail + '/')) {
        return jsonResponse({ error: 'Access denied' }, 403, corsHeaders);
    }
    
    // Get from R2
    const object = await env.STORAGE.get(key);
    
    if (!object) {
        return jsonResponse({ error: 'File not found' }, 404, corsHeaders);
    }
    
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Length', object.size);
    headers.set('Content-Disposition', `attachment; filename="${object.customMetadata?.filename || 'download'}"`);
    
    return new Response(object.body, { headers });
}

async function handleStorageDelete(request, env, corsHeaders) {
    const r2Check = checkR2Available(env, corsHeaders);
    if (r2Check) return r2Check;
    
    const { email, licenseKey, key } = await request.json();
    
    if (!email || !key) {
        return jsonResponse({ error: 'Email and key required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Verify the key belongs to this user
    if (!key.startsWith(normalizedEmail + '/')) {
        return jsonResponse({ error: 'Access denied' }, 403, corsHeaders);
    }
    
    // Delete from R2
    await env.STORAGE.delete(key);
    
    // Delete from database
    await env.DB.prepare(
        'DELETE FROM cloud_storage WHERE r2_key = ? AND email = ?'
    ).bind(key, normalizedEmail).run();
    
    await logAnalytics(env.DB, 'storage_delete', normalizedEmail, licenseKey, request, { key });
    
    return jsonResponse({ success: true, deleted: key }, 200, corsHeaders);
}

async function handleStorageUsage(request, env, corsHeaders) {
    // Note: Usage check doesn't require R2, just DB
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const licenseKey = url.searchParams.get('licenseKey');
    
    if (!email) {
        return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    const usage = await calculateStorageUsage(env, normalizedEmail);
    const limitBytes = await getStorageLimitForUser(env, normalizedEmail);
    
    return jsonResponse({ 
        success: true,
        used: usage,
        limit: limitBytes,
        available: Math.max(0, limitBytes - usage),
        percentUsed: limitBytes > 0 ? Math.round((usage / limitBytes) * 100) : 0
    }, 200, corsHeaders);
}

async function calculateStorageUsage(env, email) {
    const result = await env.DB.prepare(
        'SELECT COALESCE(SUM(file_size), 0) as total FROM cloud_storage WHERE email = ?'
    ).bind(email).first();
    
    return result?.total || 0;
}

// =====================
// SHAREABLE LINKS HANDLERS
// =====================

async function handleStorageShare(request, env, corsHeaders) {
    const r2Check = checkR2Available(env, corsHeaders);
    if (r2Check) return r2Check;
    
    const { email, licenseKey, key, expiresIn } = await request.json();
    
    if (!email || !key) {
        return jsonResponse({ error: 'Email and key required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Verify the key belongs to this user
    if (!key.startsWith(normalizedEmail + '/')) {
        return jsonResponse({ error: 'Access denied' }, 403, corsHeaders);
    }
    
    // Check if file exists in database
    const file = await env.DB.prepare(
        'SELECT id, filename, share_token FROM cloud_storage WHERE r2_key = ? AND email = ?'
    ).bind(key, normalizedEmail).first();
    
    if (!file) {
        return jsonResponse({ error: 'File not found' }, 404, corsHeaders);
    }
    
    // If already has a share token, return it
    if (file.share_token) {
        const baseUrl = new URL(request.url).origin;
        return jsonResponse({
            success: true,
            shareToken: file.share_token,
            shareUrl: `${baseUrl}/share/${file.share_token}`,
            filename: file.filename,
            alreadyShared: true
        }, 200, corsHeaders);
    }
    
    // Generate a new share token
    const shareToken = generateShareToken();
    
    // Calculate expiry (default 7 days, max 30 days)
    const expiryDays = Math.min(expiresIn || 7, 30);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
    
    // Update database with share token
    await env.DB.prepare(
        'UPDATE cloud_storage SET share_token = ?, share_expires_at = ? WHERE id = ?'
    ).bind(shareToken, expiresAt, file.id).run();
    
    const baseUrl = new URL(request.url).origin;
    
    await logAnalytics(env.DB, 'storage_share_created', normalizedEmail, licenseKey, request, { key, shareToken });
    
    return jsonResponse({
        success: true,
        shareToken,
        shareUrl: `${baseUrl}/share/${shareToken}`,
        expiresAt,
        filename: file.filename
    }, 200, corsHeaders);
}

async function handleStorageUnshare(request, env, corsHeaders) {
    const { email, licenseKey, key } = await request.json();
    
    if (!email || !key) {
        return jsonResponse({ error: 'Email and key required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Verify the key belongs to this user
    if (!key.startsWith(normalizedEmail + '/')) {
        return jsonResponse({ error: 'Access denied' }, 403, corsHeaders);
    }
    
    // Remove share token from database
    await env.DB.prepare(
        'UPDATE cloud_storage SET share_token = NULL, share_expires_at = NULL WHERE r2_key = ? AND email = ?'
    ).bind(key, normalizedEmail).run();
    
    await logAnalytics(env.DB, 'storage_share_revoked', normalizedEmail, licenseKey, request, { key });
    
    return jsonResponse({ success: true, unshared: key }, 200, corsHeaders);
}

async function handlePublicShare(shareToken, request, env, corsHeaders) {
    const r2Check = checkR2Available(env, corsHeaders);
    if (r2Check) return r2Check;
    
    if (!shareToken || shareToken.length < 10) {
        return jsonResponse({ error: 'Invalid share link' }, 400, corsHeaders);
    }
    
    // Look up the file by share token
    const file = await env.DB.prepare(
        'SELECT r2_key, filename, content_type, share_expires_at, thumbnail_key, allow_download, email FROM cloud_storage WHERE share_token = ?'
    ).bind(shareToken).first();
    
    if (!file) {
        return jsonResponse({ error: 'Share link not found or expired' }, 404, corsHeaders);
    }
    
    // Check if share has expired
    if (file.share_expires_at && new Date(file.share_expires_at) < new Date()) {
        return jsonResponse({ error: 'Share link has expired' }, 410, corsHeaders);
    }
    
    const url = new URL(request.url);
    const requestType = url.searchParams.get('type');
    const download = url.searchParams.get('download') === '1';
    
    // Serve thumbnail if requested
    if (requestType === 'thumb' && file.thumbnail_key) {
        const thumbObject = await env.STORAGE.get(file.thumbnail_key);
        if (thumbObject) {
            const headers = new Headers(corsHeaders);
            headers.set('Content-Type', 'image/jpeg');
            headers.set('Cache-Control', 'public, max-age=86400');
            return new Response(thumbObject.body, { headers });
        }
    }
    
    // Get video from R2
    const object = await env.STORAGE.get(file.r2_key);
    
    if (!object) {
        return jsonResponse({ error: 'File not found' }, 404, corsHeaders);
    }
    
    // Log view for analytics (only once per unique request)
    await logAnalytics(env.DB, 'video_view', file.email, null, request, { 
        shareToken, 
        filename: file.filename,
        download: download ? 'true' : 'false'
    });
    
    // Check if download is allowed
    if (download && file.allow_download === 0) {
        return jsonResponse({ error: 'Download is disabled for this video' }, 403, corsHeaders);
    }
    
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', file.content_type || 'video/mp4');
    headers.set('Content-Length', object.size);
    headers.set('Accept-Ranges', 'bytes');
    
    if (download) {
        headers.set('Content-Disposition', `attachment; filename="${file.filename}"`);
    } else {
        headers.set('Content-Disposition', `inline; filename="${file.filename}"`);
    }
    
    // Handle range requests for video streaming
    const range = request.headers.get('Range');
    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : object.size - 1;
        const chunkSize = (end - start) + 1;
        
        headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
        headers.set('Content-Length', chunkSize);
        
        // Slice the body for partial content
        const body = await object.arrayBuffer();
        const slice = body.slice(start, end + 1);
        
        return new Response(slice, { status: 206, headers });
    }
    
    return new Response(object.body, { headers });
}

async function handleStoragePreview(request, env, corsHeaders) {
    const r2Check = checkR2Available(env, corsHeaders);
    if (r2Check) return r2Check;
    
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const licenseKey = url.searchParams.get('licenseKey');
    const key = url.searchParams.get('key');
    
    if (!email || !key) {
        return jsonResponse({ error: 'Email and key required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Verify the key belongs to this user
    if (!key.startsWith(normalizedEmail + '/')) {
        return jsonResponse({ error: 'Access denied' }, 403, corsHeaders);
    }
    
    // Get file info from database
    const file = await env.DB.prepare(
        'SELECT filename, content_type FROM cloud_storage WHERE r2_key = ? AND email = ?'
    ).bind(key, normalizedEmail).first();
    
    if (!file) {
        return jsonResponse({ error: 'File not found' }, 404, corsHeaders);
    }
    
    // Get from R2
    const object = await env.STORAGE.get(key);
    
    if (!object) {
        return jsonResponse({ error: 'File not found in storage' }, 404, corsHeaders);
    }
    
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', file.content_type || 'video/mp4');
    headers.set('Content-Length', object.size);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Disposition', `inline; filename="${file.filename}"`);
    
    // Handle range requests for video streaming/seeking
    const range = request.headers.get('Range');
    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : object.size - 1;
        const chunkSize = (end - start) + 1;
        
        headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
        headers.set('Content-Length', chunkSize);
        
        // Slice the body for partial content
        const body = await object.arrayBuffer();
        const slice = body.slice(start, end + 1);
        
        return new Response(slice, { status: 206, headers });
    }
    
    return new Response(object.body, { headers });
}

function generateShareToken() {
    // Generate a URL-safe random token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    const randomValues = new Uint8Array(16);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < 16; i++) {
        token += chars[randomValues[i] % chars.length];
    }
    return token;
}

// =====================
// PRO+ FEATURES
// =====================

// Upload custom thumbnail for a video
async function handleThumbnailUpload(request, env, corsHeaders) {
    const r2Check = checkR2Available(env, corsHeaders);
    if (r2Check) return r2Check;
    
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const licenseKey = url.searchParams.get('licenseKey');
    const videoKey = url.searchParams.get('videoKey');
    const contentType = request.headers.get('content-type') || 'image/jpeg';
    
    if (!email || !videoKey) {
        return jsonResponse({ error: 'Email and videoKey required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license and tier (Pro+ or higher)
    const tier = await getUserTier(env, normalizedEmail);
    if (!tier || tier === 'pro') {
        return jsonResponse({ error: 'Custom thumbnails require Pro+ or higher' }, 403, corsHeaders);
    }
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Verify the video belongs to this user
    const video = await env.DB.prepare(
        'SELECT id FROM cloud_storage WHERE r2_key = ? AND email = ?'
    ).bind(videoKey, normalizedEmail).first();
    
    if (!video) {
        return jsonResponse({ error: 'Video not found' }, 404, corsHeaders);
    }
    
    // Generate thumbnail key
    const thumbnailKey = `${videoKey}.thumb`;
    
    // Upload thumbnail to R2
    await env.STORAGE.put(thumbnailKey, request.body, {
        httpMetadata: { contentType },
        customMetadata: {
            email: normalizedEmail,
            videoKey,
            type: 'thumbnail'
        }
    });
    
    // Update database
    await env.DB.prepare(
        'UPDATE cloud_storage SET thumbnail_key = ? WHERE r2_key = ? AND email = ?'
    ).bind(thumbnailKey, videoKey, normalizedEmail).run();
    
    await logAnalytics(env.DB, 'thumbnail_upload', normalizedEmail, licenseKey, request, { videoKey });
    
    return jsonResponse({ success: true, thumbnailKey }, 200, corsHeaders);
}

// Get embed code for a shared video
async function handleGetEmbedCode(request, env, corsHeaders) {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const licenseKey = url.searchParams.get('licenseKey');
    const videoKey = url.searchParams.get('videoKey');
    
    if (!email || !videoKey) {
        return jsonResponse({ error: 'Email and videoKey required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license and tier (Pro Max only)
    const tier = await getUserTier(env, normalizedEmail);
    if (!tier || (tier !== 'pro_max' && tier !== 'pro-max')) {
        return jsonResponse({ error: 'Embed codes require Pro Max' }, 403, corsHeaders);
    }
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Get video share info
    const video = await env.DB.prepare(
        'SELECT share_token, filename FROM cloud_storage WHERE r2_key = ? AND email = ?'
    ).bind(videoKey, normalizedEmail).first();
    
    if (!video) {
        return jsonResponse({ error: 'Video not found' }, 404, corsHeaders);
    }
    
    if (!video.share_token) {
        return jsonResponse({ error: 'Video must be shared first' }, 400, corsHeaders);
    }
    
    const baseUrl = 'https://blazeycc-license.kennethhy-me.workers.dev';
    const embedUrl = `${baseUrl}/embed/${video.share_token}`;
    const directUrl = `${baseUrl}/share/${video.share_token}`;
    
    // Generate different embed code formats
    const iframe = `<iframe src="${embedUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;
    const videoTag = `<video src="${directUrl}" width="640" height="360" controls></video>`;
    const link = directUrl;
    
    return jsonResponse({ 
        embedUrl,
        directUrl,
        codes: {
            iframe,
            video: videoTag,
            link
        }
    }, 200, corsHeaders);
}

// Get analytics for a video (Pro Max)
async function handleVideoAnalytics(request, env, corsHeaders) {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const licenseKey = url.searchParams.get('licenseKey');
    const videoKey = url.searchParams.get('videoKey');
    
    if (!email || !videoKey) {
        return jsonResponse({ error: 'Email and videoKey required' }, 400, corsHeaders);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Verify license and tier (Pro Max only)
    const tier = await getUserTier(env, normalizedEmail);
    if (!tier || (tier !== 'pro_max' && tier !== 'pro-max')) {
        return jsonResponse({ error: 'Analytics require Pro Max' }, 403, corsHeaders);
    }
    
    // Verify license is valid
    const licenseValid = await verifyLicenseKey(env, normalizedEmail, licenseKey);
    if (!licenseValid) {
        return jsonResponse({ error: 'Invalid license' }, 401, corsHeaders);
    }
    
    // Get video info
    const video = await env.DB.prepare(
        'SELECT share_token FROM cloud_storage WHERE r2_key = ? AND email = ?'
    ).bind(videoKey, normalizedEmail).first();
    
    if (!video || !video.share_token) {
        return jsonResponse({ error: 'Video not found or not shared' }, 404, corsHeaders);
    }
    
    // Get view analytics
    const views = await env.DB.prepare(`
        SELECT 
            COUNT(*) as total_views,
            COUNT(DISTINCT COALESCE(metadata, ip_country)) as unique_viewers
        FROM analytics 
        WHERE event_type = 'video_view' 
        AND metadata LIKE ?
    `).bind(`%${video.share_token}%`).first();
    
    // Get views over time (last 30 days)
    const viewsOverTime = await env.DB.prepare(`
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as views
        FROM analytics 
        WHERE event_type = 'video_view' 
        AND metadata LIKE ?
        AND created_at >= datetime('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
    `).bind(`%${video.share_token}%`).all();
    
    // Get geographic distribution
    const geoData = await env.DB.prepare(`
        SELECT 
            ip_country as country,
            COUNT(*) as views
        FROM analytics 
        WHERE event_type = 'video_view' 
        AND metadata LIKE ?
        AND ip_country IS NOT NULL
        GROUP BY ip_country
        ORDER BY views DESC
        LIMIT 10
    `).bind(`%${video.share_token}%`).all();
    
    return jsonResponse({
        videoKey,
        totalViews: views?.total_views || 0,
        uniqueViewers: views?.unique_viewers || 0,
        viewsOverTime: viewsOverTime?.results || [],
        topCountries: geoData?.results || []
    }, 200, corsHeaders);
}

// Serve embeddable video player page
async function handleEmbedPlayer(shareToken, request, env, corsHeaders) {
    const r2Check = checkR2Available(env, corsHeaders);
    if (r2Check) return r2Check;
    
    if (!shareToken || shareToken.length < 10) {
        return new Response('Invalid embed link', { status: 400, headers: corsHeaders });
    }
    
    // Look up the file by share token
    const file = await env.DB.prepare(
        'SELECT r2_key, filename, content_type, share_expires_at, thumbnail_key, email FROM cloud_storage WHERE share_token = ?'
    ).bind(shareToken).first();
    
    if (!file) {
        return new Response('Video not found', { status: 404, headers: corsHeaders });
    }
    
    // Check if share has expired
    if (file.share_expires_at && new Date(file.share_expires_at) < new Date()) {
        return new Response('This video is no longer available', { status: 410, headers: corsHeaders });
    }
    
    const baseUrl = 'https://blazeycc-license.kennethhy-me.workers.dev';
    const videoUrl = `${baseUrl}/share/${shareToken}`;
    const thumbnailUrl = file.thumbnail_key ? `${baseUrl}/share/${shareToken}?type=thumb` : '';
    
    // Log view for analytics
    await logAnalytics(env.DB, 'video_view', file.email, null, request, { shareToken, filename: file.filename });
    
    // Return HTML embed player
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${file.filename} - Blazeycc</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        video { max-width: 100%; max-height: 100vh; }
        .branding { position: absolute; bottom: 10px; right: 10px; color: rgba(255,255,255,0.5); font-size: 12px; font-family: system-ui; }
        .branding a { color: rgba(255,255,255,0.7); text-decoration: none; }
    </style>
</head>
<body>
    <video controls autoplay ${thumbnailUrl ? `poster="${thumbnailUrl}"` : ''}>
        <source src="${videoUrl}" type="${file.content_type || 'video/mp4'}">
        Your browser does not support video playback.
    </video>
    <div class="branding">Powered by <a href="https://blazeycc.com" target="_blank">Blazeycc</a></div>
</body>
</html>`;
    
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    
    return new Response(html, { headers });
}

// Helper to get user tier
async function getUserTier(env, email) {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check subscriptions first
    const subscription = await env.DB.prepare(
        "SELECT tier FROM subscriptions WHERE email = ? AND status IN ('active', 'trialing')"
    ).bind(normalizedEmail).first();
    
    if (subscription) return subscription.tier;
    
    // Check allowed_emails
    const allowed = await env.DB.prepare(
        'SELECT tier FROM allowed_emails WHERE email = ?'
    ).bind(normalizedEmail).first();
    
    return allowed?.tier || null;
}
