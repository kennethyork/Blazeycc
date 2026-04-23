/**
 * Stripe Webhook Handler + License Generator
 * 
 * Deploy this to Cloudflare Workers (free tier)
 * This receives Stripe webhooks and syncs subscription data.
 * 
 * Setup:
 * 1. Go to dash.cloudflare.com → Workers & Pages → Create Worker
 * 2. Paste this code
 * 3. Add environment variables:
 *    - STRIPE_WEBHOOK_SECRET: Your Stripe webhook signing secret (whsec_xxx)
 *    - LICENSE_SECRET: Secret for generating license keys
 *    - LICENSE_API_URL: URL of your license API worker (optional)
 *    - ADMIN_KEY: Admin key for license API (optional)
 *    - SENDGRID_API_KEY: For sending license emails (optional)
 * 4. Deploy and copy the worker URL
 * 5. Go to Stripe Dashboard → Developers → Webhooks → Add endpoint URL
 *    Events to listen:
 *    - checkout.session.completed
 *    - customer.subscription.updated
 *    - customer.subscription.deleted
 *    - invoice.payment_failed
 *    - invoice.paid
 */

export default {
  async fetch(request, env) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = request.headers.get('Stripe-Signature');
    const body = await request.text();

    try {
      // Verify webhook signature
      if (env.STRIPE_WEBHOOK_SECRET) {
        const isValid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
        if (!isValid) {
          console.error('Invalid Stripe webhook signature');
          return new Response('Invalid signature', { status: 401 });
        }
      }

      const event = JSON.parse(body);
      console.log(`Stripe event: ${event.type}`);

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          await handleCheckoutComplete(session, env);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          console.log(`📋 Subscription ${subscription.id}: ${subscription.status}`);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          console.log(`❌ Subscription canceled: ${subscription.id}`);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          console.log(`⚠️ Payment failed: ${invoice.id}`);
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object;
          console.log(`💰 Invoice paid: ${invoice.id}`);
          break;
        }

        default:
          console.log(`Unhandled event: ${event.type}`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Webhook error:', error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};

async function handleCheckoutComplete(session, env) {
  const email = session.customer_email?.toLowerCase().trim();
  const customerId = session.customer;
  const tier = session.metadata?.tier || (session.amount_total >= 700 ? 'pro+' : 'pro');

  if (!email) {
    console.error('No email in checkout session');
    return;
  }

  const licenseKey = await generateLicenseKey(email, env.LICENSE_SECRET);
  console.log(`✅ New subscriber: ${email} → ${tier}`);
  console.log(`🔑 License: ${licenseKey}`);

  // Add to license API allowed emails
  if (env.LICENSE_API_URL && env.ADMIN_KEY) {
    await fetch(`${env.LICENSE_API_URL}/admin/emails/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': env.ADMIN_KEY
      },
      body: JSON.stringify({ email, tier, note: `Stripe: ${customerId}` })
    });
  }

  // Send welcome email
  if (env.SENDGRID_API_KEY) {
    await sendLicenseEmail(email, licenseKey, tier, env);
  }
}

async function generateLicenseKey(email, secret) {
  const cleanEmail = email.toLowerCase().trim();
  const secretKey = secret || 'default-secret-change-me';
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(cleanEmail);
  
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const shortHash = hashHex.substring(0, 32).toUpperCase();
  return shortHash.match(/.{1,8}/g).join('-');
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

  // Check timestamp (5 min tolerance)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  return signatures.some(s => s === expectedSig);
}

async function sendLicenseEmail(email, licenseKey, tier, env) {
  const tierName = tier === 'pro+' ? 'Pro+' : 'Pro';
  
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: env.FROM_EMAIL || 'noreply@blazey.cc', name: 'Blazeycc' },
      subject: `Your Blazeycc ${tierName} License 🔥`,
      content: [{
        type: 'text/html',
        value: `
          <h1>Welcome to Blazeycc ${tierName}!</h1>
          <p>Thank you for subscribing. Here's your license key:</p>
          <p style="font-family: monospace; font-size: 18px; background: #f0f0f0; padding: 15px; border-radius: 8px;">
            <strong>${licenseKey}</strong>
          </p>
          <h3>How to activate:</h3>
          <ol>
            <li>Open Blazeycc</li>
            <li>Go to Settings → License</li>
            <li>Enter your email and click "Activate"</li>
          </ol>
          <p>Enjoy recording! 🎬</p>
        `
      }]
    })
  });
}
