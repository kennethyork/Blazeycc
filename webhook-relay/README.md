# Stripe → License Automation

This webhook relay automatically delivers license keys to Stripe subscribers.

## How It Works

```text
Customer subscribes → Stripe webhook → Cloudflare Worker → License API + Email
                                              ↓
                               Customer receives license via email
```

## Setup Steps

### 1. Create Stripe Account & Products

1. Go to [stripe.com/dashboard](https://dashboard.stripe.com)
2. Create Products:
   - **Blazeycc Pro** ($5/month recurring)
   - **Blazeycc Pro+** ($7/month recurring)
3. Copy the Price IDs (price_xxx)

### 2. Deploy the Cloudflare Worker

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) (free account)
2. Click **Workers & Pages** → **Create Worker**
3. Paste the code from `cloudflare-worker.js`
4. Click **Settings** → **Variables** → Add secrets:
   - `STRIPE_WEBHOOK_SECRET`: Webhook signing secret from Stripe (whsec_xxx)
   - `LICENSE_SECRET`: Your license key HMAC secret
   - `LICENSE_API_URL`: URL of your license API worker (optional)
   - `ADMIN_KEY`: Admin key for license API (optional)
   - `SENDGRID_API_KEY`: For sending license emails (optional)
5. Deploy and copy your worker URL

### 3. Configure Stripe Webhook

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter your Cloudflare Worker URL
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.paid`
5. Click **Add endpoint**
6. Copy the **Signing secret** (whsec_xxx) and add to worker env vars

### 4. Configure License API (Optional)

Add Stripe secrets to your license API worker:
```bash
cd workers/license-api
wrangler secret put STRIPE_SECRET_KEY      # sk_live_xxx or sk_test_xxx
wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_xxx
wrangler secret put STRIPE_PRICE_PRO       # price_xxx for $5/mo
wrangler secret put STRIPE_PRICE_PRO_PLUS  # price_xxx for $7/mo
```

### 5. Test the Setup

1. Use Stripe's test mode (sk_test_xxx keys)
2. Create a test checkout session
3. Verify webhook is received and license email is sent

## API Endpoints

The license API now supports:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stripe/checkout` | POST | Create Stripe checkout session |
| `/stripe/portal` | POST | Get customer billing portal URL |
| `/stripe/webhook` | POST | Handle Stripe webhooks |
| `/validate` | POST | Validate license key |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `LICENSE_SECRET` | Yes | HMAC secret for license keys |
| `LICENSE_API_URL` | No | URL of license API for syncing |
| `ADMIN_KEY` | No | Admin key for license API |
| `SENDGRID_API_KEY` | No | For sending license emails |
| `FROM_EMAIL` | No | Sender email (default: noreply@blazey.cc) |

## Manual Delivery

To manually deliver a license key:

```bash
gh workflow run sponsor-license.yml \
  -f sponsor_login=username \
  -f sponsor_email=user@example.com
```

## Environment Variables Reference

| Variable         | Required | Description                        |
| ---------------- | -------- | ---------------------------------- |
| `LICENSE_SECRET` | Yes      | Secret for HMAC license generation |
| `GITHUB_TOKEN`   | Yes      | GitHub PAT for triggering workflows|
| `WEBHOOK_SECRET` | Optional | Secret for webhook verification    |
