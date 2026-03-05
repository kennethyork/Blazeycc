// Cloudflare Worker: Verify GitHub Sponsor and generate license key
// Deploy: npx wrangler deploy

export default {
    async fetch(request, env) {
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        // Admin endpoints
        if (url.pathname === '/admin/add') {
            return handleAdminAdd(request, env, corsHeaders);
        }
        if (url.pathname === '/admin/remove') {
            return handleAdminRemove(request, env, corsHeaders);
        }
        if (url.pathname === '/admin/list') {
            return handleAdminList(request, env, corsHeaders);
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        try {
            const { email } = await request.json();
            
            if (!email) {
                return new Response(JSON.stringify({ error: 'Email required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Check D1 database first for allowed emails
            const isAllowedInDB = await checkAllowedEmail(email, env.DB);
            
            // Then check GitHub sponsors
            const isSponsor = isAllowedInDB || await verifySponsor(email, env.GITHUB_TOKEN, env.GITHUB_USERNAME);
            
            if (!isSponsor) {
                return new Response(JSON.stringify({ 
                    error: 'Not a sponsor',
                    message: 'This email is not associated with an active GitHub Sponsor. Please sponsor first at github.com/sponsors/theKennethy'
                }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Generate license key
            const licenseKey = await generateLicenseKey(email, env.LICENSE_SECRET);
            
            return new Response(JSON.stringify({ 
                success: true,
                email: email,
                licenseKey: licenseKey
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Error:', error);
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};

// Check if email is in the allowed_emails table
async function checkAllowedEmail(email, db) {
    const normalizedEmail = email.toLowerCase().trim();
    const result = await db.prepare(
        'SELECT email FROM allowed_emails WHERE email = ?'
    ).bind(normalizedEmail).first();
    return result !== null;
}

// Admin: Add email to allowed list
async function handleAdminAdd(request, env, corsHeaders) {
    if (!verifyAdminKey(request, env)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        const { email, note } = await request.json();
        if (!email) {
            return new Response(JSON.stringify({ error: 'Email required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        await env.DB.prepare(
            'INSERT OR REPLACE INTO allowed_emails (email, note) VALUES (?, ?)'
        ).bind(normalizedEmail, note || null).run();

        return new Response(JSON.stringify({ success: true, email: normalizedEmail }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Admin: Remove email from allowed list
async function handleAdminRemove(request, env, corsHeaders) {
    if (!verifyAdminKey(request, env)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        const { email } = await request.json();
        if (!email) {
            return new Response(JSON.stringify({ error: 'Email required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        await env.DB.prepare(
            'DELETE FROM allowed_emails WHERE email = ?'
        ).bind(normalizedEmail).run();

        return new Response(JSON.stringify({ success: true, removed: normalizedEmail }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Admin: List all allowed emails
async function handleAdminList(request, env, corsHeaders) {
    if (!verifyAdminKey(request, env)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        const result = await env.DB.prepare(
            'SELECT email, note, created_at FROM allowed_emails ORDER BY created_at DESC'
        ).all();

        return new Response(JSON.stringify({ success: true, emails: result.results }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Verify admin key from header
function verifyAdminKey(request, env) {
    const adminKey = request.headers.get('X-Admin-Key');
    return adminKey && adminKey === env.ADMIN_KEY;
}

async function verifySponsor(email, githubToken, githubUsername) {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Query GitHub GraphQL API for sponsors
    const query = `
        query {
            user(login: "${githubUsername}") {
                sponsorshipsAsMaintainer(first: 100, activeOnly: true) {
                    nodes {
                        sponsorEntity {
                            ... on User {
                                email
                                login
                            }
                            ... on Organization {
                                email
                                login
                            }
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
        // Fallback: allow if GitHub API fails (be generous)
        return false;
    }

    const data = await response.json();
    const sponsors = data?.data?.user?.sponsorshipsAsMaintainer?.nodes || [];
    
    // Check if email matches any sponsor
    return sponsors.some(s => {
        const sponsorEmail = s.sponsorEntity?.email?.toLowerCase().trim();
        return sponsorEmail === normalizedEmail;
    });
}

async function generateLicenseKey(email, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(email.toLowerCase().trim());
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const shortHash = hashHex.substring(0, 32).toUpperCase();
    
    return shortHash.match(/.{1,8}/g).join('-');
}
