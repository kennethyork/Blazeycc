# GitHub Sponsors → License Automation

This webhook relay automatically delivers license keys to GitHub Sponsors via GitHub Issues.

## How It Works

```text
Sponsor on GitHub → GitHub webhook → Cloudflare Worker → GitHub Actions → Issue with license key
                                                                               ↓
                                                        Sponsor gets @mentioned & notified
```

**No email required!** Sponsors receive their license key directly on GitHub.

## Setup Steps

### 1. Create a GitHub Personal Access Token

1. Go to github.com → Settings → Developer settings → Personal access tokens
2. Create a fine-grained token with:
   - Repository access: `blazeycc/Blazeycc`
   - Permissions: Issues (Read and Write), Contents (Read)
3. Copy the token

### 2. Deploy the Cloudflare Worker

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) (free account)
2. Click **Workers & Pages** → **Create Worker**
3. Paste the code from `cloudflare-worker.js`
4. Click **Settings** → **Variables** → Add:
   - `LICENSE_SECRET`: Your license key secret (same as generate-key.js)
   - `GITHUB_TOKEN`: The PAT from step 1
5. Deploy and copy your worker URL (e.g., `https://your-worker.workers.dev`)

### 3. Configure GitHub Sponsors Webhook

1. Go to [github.com/sponsors/blazeycc/dashboard](https://github.com/sponsors/blazeycc/dashboard)
2. Click **Webhooks** tab
3. Click **Add webhook**
4. Enter your Cloudflare Worker URL
5. Create a webhook secret and add it as `WEBHOOK_SECRET` env var in your worker
6. Select event: **Sponsorship** → **created**
7. Save

### 4. Create Sponsor Tiers

1. Go to [github.com/sponsors/blazeycc/dashboard](https://github.com/sponsors/blazeycc/dashboard)
2. Create tier(s):
   - **Blazeycc Pro** ($7/month): Include features and note that license key will be delivered via GitHub notification

### 5. Test the Setup

1. Use GitHub's webhook test feature in the dashboard
2. Or sponsor yourself with a test tier
3. Check that an issue was created with the license key

## What Sponsors See

When someone becomes a sponsor, they receive a GitHub notification and see an issue with their license key, activation instructions, and a list of Pro features.

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
