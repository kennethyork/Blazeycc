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
            // PUBLIC ENDPOINTS
            // =====================
            
            // Get license key (sponsors, allowed emails, or promo codes)
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
    
    // Check if allowed in DB
    const isAllowedInDB = await env.DB.prepare(
        'SELECT email FROM allowed_emails WHERE email = ?'
    ).bind(normalizedEmail).first();
    
    // Check GitHub sponsors
    const isSponsor = isAllowedInDB || await verifySponsor(normalizedEmail, env.GITHUB_TOKEN, env.GITHUB_USERNAME);
    
    if (!isSponsor) {
        return jsonResponse({ 
            error: 'Not a sponsor',
            message: 'This email is not associated with an active GitHub Sponsor. Please sponsor first at github.com/sponsors/theKennethy'
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
    
    // Log analytics
    await logAnalytics(env.DB, 'license_generated', normalizedEmail, licenseKey, request);
    
    return jsonResponse({ success: true, email: normalizedEmail, licenseKey }, 200, corsHeaders);
}

async function handleValidateLicense(request, env, corsHeaders) {
    const { email, licenseKey } = await request.json();
    
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
    
    await logAnalytics(env.DB, valid ? 'license_check_valid' : 'license_check_invalid', normalizedEmail, licenseKey, request);
    
    return jsonResponse({ valid }, 200, corsHeaders);
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
    await env.DB.batch([
        env.DB.prepare('INSERT OR REPLACE INTO allowed_emails (email, note) VALUES (?, ?)').bind(normalizedEmail, `Promo: ${normalizedCode}`),
        env.DB.prepare('INSERT INTO promo_redemptions (promo_code_id, email) VALUES (?, ?)').bind(promo.id, normalizedEmail),
        env.DB.prepare('UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?').bind(promo.id)
    ]);
    
    const licenseKey = await generateLicenseKey(normalizedEmail, env.LICENSE_SECRET);
    
    await logAnalytics(env.DB, 'promo_redeemed', normalizedEmail, licenseKey, request, { code: normalizedCode });
    
    return jsonResponse({ 
        success: true, 
        email: normalizedEmail, 
        licenseKey,
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
    
    const { email, note } = await request.json();
    if (!email) return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
    
    const normalizedEmail = email.toLowerCase().trim();
    await env.DB.prepare(
        'INSERT OR REPLACE INTO allowed_emails (email, note) VALUES (?, ?)'
    ).bind(normalizedEmail, note || null).run();
    
    return jsonResponse({ success: true, email: normalizedEmail }, 200, corsHeaders);
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
        'SELECT email, note, created_at FROM allowed_emails ORDER BY created_at DESC'
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
// UTILITY FUNCTIONS
// =====================

async function verifySponsor(email, githubToken, githubUsername) {
    const query = `
        query {
            user(login: "${githubUsername}") {
                sponsorshipsAsMaintainer(first: 100, activeOnly: true) {
                    nodes {
                        sponsorEntity {
                            ... on User { email login }
                            ... on Organization { email login }
                        }
                    }
                }
            }
        }
    `;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Blazeycc-License-Verifier'
        },
        body: JSON.stringify({ query })
    });

    if (!response.ok) {
        console.error('GitHub API error:', response.status);
        return false;
    }

    const data = await response.json();
    const sponsors = data?.data?.user?.sponsorshipsAsMaintainer?.nodes || [];
    
    return sponsors.some(s => {
        const sponsorEmail = s.sponsorEntity?.email?.toLowerCase().trim();
        return sponsorEmail === email;
    });
}

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
