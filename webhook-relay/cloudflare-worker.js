/**
 * GitHub Sponsors Webhook Handler + License Generator
 * 
 * Deploy this to Cloudflare Workers (free tier)
 * This receives GitHub Sponsors webhooks and triggers GitHub Actions to create an issue
 * with the license key for the sponsor.
 * 
 * Setup:
 * 1. Go to dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste this code
 * 3. Add environment variables:
 *    - WEBHOOK_SECRET: Your GitHub webhook secret
 *    - LICENSE_SECRET: Secret for generating license keys
 *    - GITHUB_TOKEN: GitHub PAT with repo scope for triggering workflows
 * 4. Deploy and copy the worker URL
 * 5. Go to github.com/sponsors/blazeycc/dashboard → Webhooks → Add webhook URL
 */

export default {
  async fetch(request, env) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const payload = await request.json();
      
      // Handle GitHub Sponsors webhook
      const action = payload.action;
      const sponsorship = payload.sponsorship;
      
      if (!sponsorship) {
        return new Response('Not a sponsorship event', { status: 200 });
      }
      
      // Only process new sponsorships
      if (action !== 'created') {
        console.log(`Skipping action: ${action}`);
        return new Response(`Skipping action: ${action}`, { status: 200 });
      }
      
      const sponsor = sponsorship.sponsor;
      const tier = sponsorship.tier;
      
      const sponsorLogin = sponsor.login;
      const sponsorEmail = sponsor.email || `${sponsorLogin}@users.noreply.github.com`;
      const tierName = tier.name;
      const amount = tier.monthly_price_in_dollars;
      
      // Generate license key
      const licenseKey = await generateLicenseKey(sponsorEmail, env.LICENSE_SECRET);
      
      console.log(`✅ New sponsor: ${sponsorLogin} (${tierName} - $${amount}/month)`);
      console.log(`🔑 License: ${licenseKey}`);
      
      // Trigger GitHub Actions to create issue with license key
      if (env.GITHUB_TOKEN) {
        await triggerGitHubWorkflow(sponsorLogin, sponsorEmail, licenseKey, tierName, amount, env);
      }
      
      return new Response(JSON.stringify({
        success: true,
        sponsor: sponsorLogin,
        licenseKey: licenseKey,
        tier: tierName,
        delivery: 'GitHub Issue'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};

async function generateLicenseKey(email, secret) {
  const cleanEmail = email.toLowerCase().trim();
  const secretKey = secret || 'blazeycc-pro-2026-change-this-secret';
  
  // Use Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(cleanEmail);
  
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const part1 = hashHex.slice(0, 4).toUpperCase();
  const part2 = hashHex.slice(4, 8).toUpperCase();
  const part3 = hashHex.slice(8, 12).toUpperCase();
  const part4 = hashHex.slice(12, 16).toUpperCase();
  
  return `${part1}-${part2}-${part3}-${part4}`;
}

async function triggerGitHubWorkflow(sponsorLogin, sponsorEmail, licenseKey, tierName, amount, env) {
  const response = await fetch('https://api.github.com/repos/blazeycc/Blazeycc/dispatches', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Blazeycc-Webhook'
    },
    body: JSON.stringify({
      event_type: 'sponsor_created',
      client_payload: {
        sponsor_login: sponsorLogin,
        sponsor_email: sponsorEmail,
        license_key: licenseKey,
        tier_name: tierName,
        amount: amount
      }
    })
  });
  
  if (response.ok || response.status === 204) {
    console.log(`✅ Triggered GitHub workflow for ${sponsorLogin}`);
  } else {
    const error = await response.text();
    console.error('GitHub API error:', response.status, error);
  }
}
