# Automated Sponsor License Key System

This guide explains how to automatically deliver Pro license keys to GitHub Sponsors.

## Overview

When someone sponsors the blazeycc organization on GitHub:

1. A webhook triggers the Cloudflare Worker
2. The worker generates a unique license key
3. A GitHub Actions workflow creates an issue that @mentions the sponsor
4. The sponsor receives a GitHub notification with their license key

**No email required!** License keys are delivered directly via GitHub.

## How It Works

```text
GitHub Sponsor → Webhook → Cloudflare Worker → GitHub Actions → Issue Created
                                                                     ↓
                                              Sponsor gets @mentioned & notified
```

## Setup Steps

### 1. Add GitHub Secrets

Go to your repo → Settings → Secrets → Actions:

- `LICENSE_SECRET`: Your license key secret (same as in generate-key.js)

### 2. Create a GitHub Personal Access Token

1. Go to github.com → Settings → Developer settings → Personal access tokens
2. Create a fine-grained token with:
   - Repository access: `blazeycc/Blazeycc`
   - Permissions: Issues (Read and Write), Contents (Read)
3. Copy the token

### 3. Deploy Cloudflare Worker

1. Go to dash.cloudflare.com → Workers & Pages → Create Worker
2. Paste the code from `webhook-relay/cloudflare-worker.js`
3. Add environment variables:
   - `WEBHOOK_SECRET`: Your GitHub webhook secret
   - `LICENSE_SECRET`: Secret for generating license keys
   - `GITHUB_TOKEN`: The PAT from step 2
4. Deploy and copy the worker URL

### 4. Configure GitHub Sponsors Webhook

1. Go to github.com/sponsors/blazeycc/dashboard
2. Click "Webhooks" tab
3. Add webhook URL: Your Cloudflare Worker URL
4. Select events: "Sponsorship created"

## License Key Format

Keys are generated as: `XXXX-XXXX-XXXX-XXXX`

Example: `BXYZ-1234-ABCD-5678`

## What Sponsors See

When someone becomes a sponsor, they'll receive a GitHub notification and see an issue with their license key, activation instructions, and a list of their Pro features.

## Manual Delivery

To manually generate and deliver a license key:

```bash
# Trigger the workflow manually
gh workflow run sponsor-license.yml \
  -f sponsor_login=username \
  -f sponsor_email=user@example.com
```

Or use the script:

```bash
node scripts/send-sponsor-license.js user@example.com username
```

## Testing

1. Use GitHub's webhook test feature in Sponsors dashboard
2. Or manually trigger the workflow from GitHub Actions tab

## Security Notes

- Keep `LICENSE_SECRET` secure and never commit it
- Use environment variables in production
- The GitHub PAT should have minimal permissions (just Issues)
- Rotate secrets periodically
