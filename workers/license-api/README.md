# Blazeycc License API Worker

Cloudflare Worker that manages Stripe subscriptions and generates license keys.

## Features

- Stripe subscription management
- License key generation and validation
- Cloud history sync
- R2 cloud storage (5GB for Pro+ users)
- Admin dashboard
- Promo codes

## Endpoints

### Public

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Get license key for email |
| `/validate` | POST | Validate license key |
| `/redeem` | POST | Redeem promo code |
| `/track` | POST | Track usage analytics |
| `/history` | GET/POST | Sync recording history |

### Stripe

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stripe/checkout` | POST | Create checkout session |
| `/stripe/portal` | POST | Get billing portal URL |
| `/stripe/webhook` | POST | Handle Stripe webhooks |

### Cloud Storage (Pro+)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/storage/upload` | POST | Upload video to cloud |
| `/storage/list` | GET | List user's videos |
| `/storage/download` | GET | Download video |
| `/storage/delete` | POST | Delete video |
| `/storage/share` | POST | Create share link |
| `/share/:token` | GET | Access shared video |

### Admin

| Endpoint | Description |
|----------|-------------|
| `/admin` | Dashboard UI |
| `/admin/emails/*` | Manage allowed emails |
| `/admin/revoke` | Revoke licenses |
| `/admin/promo/*` | Manage promo codes |
| `/admin/stats` | View statistics |

## Deployment

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Create D1 Database

```bash
cd workers/license-api
wrangler d1 create blazeycc-licenses
# Copy the database_id to wrangler.toml
wrangler d1 execute blazeycc-licenses --file=schema.sql
```

### 3. Create R2 Bucket (for cloud storage)

```bash
wrangler r2 bucket create blazeycc-recordings
```

### 4. Set Secrets

```bash
# License generation secret
wrangler secret put LICENSE_SECRET

# Admin dashboard key
wrangler secret put ADMIN_KEY

# Stripe secrets
wrangler secret put STRIPE_SECRET_KEY      # sk_live_xxx or sk_test_xxx
wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_xxx
wrangler secret put STRIPE_PRICE_PRO       # price_xxx for $5/mo
wrangler secret put STRIPE_PRICE_PRO_PLUS  # price_xxx for $7/mo
```

### 5. Deploy

```bash
wrangler deploy
```

## Stripe Setup

1. Create products in [Stripe Dashboard](https://dashboard.stripe.com/products):
   - **Blazeycc Pro** — $5/month recurring
   - **Blazeycc Pro+** — $7/month recurring

2. Configure webhook at [Stripe Webhooks](https://dashboard.stripe.com/webhooks):
   - Endpoint URL: `https://your-worker.workers.dev/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

3. Add the webhook signing secret (whsec_xxx) as `STRIPE_WEBHOOK_SECRET`

## Testing

```bash
# Create checkout session
curl -X POST https://your-worker.workers.dev/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "tier": "pro"}'

# Validate license
curl -X POST https://your-worker.workers.dev/validate \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "licenseKey": "XXXX-XXXX-XXXX-XXXX"}'
```

## Notes

- Free on Cloudflare's free tier (100k requests/day)
- D1 database and R2 storage included in free tier
- Secrets are stored securely in Cloudflare
