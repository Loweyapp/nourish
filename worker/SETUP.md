# Cloudflare Worker Setup — Background Fitbit Sync

These are one-time steps to do in the Cloudflare dashboard. Takes about 5 minutes.

## Step 1 — Create a KV Namespace

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **KV**
2. Click **Create a namespace**
3. Name it `nourish-store` (or anything you like)
4. Copy the **Namespace ID** shown after creation

## Step 2 — Update the Worker code

1. Go to **Workers & Pages** → find your Worker (`rapid-star-52f2`)
2. Click **Edit code**
3. Delete all the existing code
4. Paste the entire contents of `worker/index.js` from this repo
5. Click **Save and deploy**

## Step 3 — Bind the KV namespace to the Worker

1. In your Worker, go to **Settings** → **Variables** → **KV Namespace Bindings**
2. Click **Add binding**
3. Variable name: `STORE` (must be exactly this)
4. KV namespace: select `nourish-store` (the one you just created)
5. Click **Save**

## Step 4 — Add the cron trigger

1. In your Worker, go to **Settings** → **Triggers** → **Cron Triggers**
2. Click **Add cron trigger**
3. Cron expression: `0 * * * *` (runs at the top of every hour)
4. Click **Add trigger**

## That's it

Once deployed, the Worker will:
- Sync your Fitbit data every hour in the background, even when Nourish isn't open
- Next time you open Nourish, it will instantly show the latest data from the Worker instead of waiting for a fresh fetch
- Your refresh token is stored securely in KV and automatically renewed each hour

The app automatically registers your token with the Worker the next time you open Nourish (no action needed from you).
