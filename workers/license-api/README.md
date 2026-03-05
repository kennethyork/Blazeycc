# Blazeycc License API Worker

Cloudflare Worker that verifies GitHub Sponsors and generates license keys.

## How It Works

1. User enters email on `blazey.cc/license`
2. Worker queries GitHub API for active sponsors
3. If email matches a sponsor, generates and returns license key
4. If not a sponsor, returns error

## Deployment

### 1. Install Wrangler

```bash
npm install -g wrangler
wrangler login
```

### 2. Create GitHub Personal Access Token

1. Go to <https://github.com/settings/tokens>
2. Generate new token (classic)
3. Select scopes: `read:user`, `read:org`
4. Copy the token

### 3. Set Secrets

```bash
cd workers/license-api

# Set the license secret (same as in your app)
wrangler secret put LICENSE_SECRET
# Paste your 32-byte hex secret

# Set GitHub token
wrangler secret put GITHUB_TOKEN
# Paste your GitHub PAT
```

### 4. Deploy

```bash
wrangler deploy
```

### 5. Update License Page

Edit `docs/license.html` and set the `WORKER_URL`:

```javascript
const WORKER_URL = 'https://blazeycc-license.kennethhy-me.workers.dev';
```

Then push to GitHub:

```bash
git add -A && git commit -m "Enable secure license verification" && git push
```

## Testing

```bash
curl -X POST https://blazeycc-license.kennethhy-me.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"email": "sponsor@example.com"}'
```

## Notes

- The worker is free on Cloudflare's free tier (100k requests/day)
- Secrets are stored securely in Cloudflare, not in code
- If GitHub API fails, the request fails (no fallback to prevent abuse)
