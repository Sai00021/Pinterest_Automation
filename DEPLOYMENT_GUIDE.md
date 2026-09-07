# Step-by-Step Deployment & Operations Guide

Now that your repository is on GitHub, follow this guide to connect and activate your automated pipeline on **Cloudflare Workers**.

---

## 📋 Prerequisites Checklist
1. A **Cloudflare Account** (free tier works).
2. **Node.js** & **npm** installed locally.
3. Access to your:
   - **Pinterest Developer App** credentials (Access Token, Client ID, Client Secret).
   - **Amazon Associates PA-API** credentials (Access Key, Secret Key, Associate Tag).
   - **AI API Key** (Anthropic `sk-ant-...` or OpenAI `sk-...`).

---

## Step 1: Create the Cloudflare D1 Database

1. Open your terminal in the project directory:
   ```bash
   cd C:\Documents\Pinterest-Automation
   ```
2. Log in to Cloudflare using Wrangler:
   ```bash
   npx wrangler login
   ```
3. Create a new D1 database named `pinterest_db`:
   ```bash
   npx wrangler d1 create pinterest_db
   ```
4. Copy the output `database_id` from the terminal.
5. Open `wrangler.jsonc` and replace `REPLACE_WITH_YOUR_D1_ID` with the new database ID:
   ```jsonc
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "pinterest_db",
       "database_id": "your-actual-d1-database-uuid-here",
       "migrations_dir": "migrations"
     }
   ]
   ```
6. Commit and push this change to GitHub:
   ```bash
   git add wrangler.jsonc
   git commit -m "Configure D1 Database ID"
   git push origin main
   ```

---

## Step 2: Apply Database Migrations to Remote D1

Run the migration command to create all necessary tables on Cloudflare:
```bash
npm run db:migrate:remote
```
*Expected Output: Confirms applying `0001_initial_schema.sql` and `0002_amazon_affiliate_schema.sql`.*

---

## Step 3: Create the R2 Storage Bucket (Optional / Recommended)

If you plan to store processed Pin images:
```bash
npx wrangler r2 bucket create pinterest-automation-images
```

---

## Step 4: Connect Cloudflare Workers Builds (GitHub Integration)

1. Open the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Compute (Workers) > Workers & Pages > Create application**.
3. Choose the **Workers** tab and click **Connect to Git**.
4. Select your GitHub repository (`Pinterest-Automation`).
5. Set the build configuration:
   - **Production branch**: `main`
   - **Build command**: `npm run typecheck` (or leave empty)
   - **Deploy command**: `npx wrangler deploy`
6. Click **Save and Deploy**. Cloudflare will automatically build and deploy the Worker on every future push to `main`.

---

## Step 5: Add Sensitive Secrets to Cloudflare

In the Cloudflare Dashboard:
1. Go to your Worker: **pinterest-automation > Settings > Variables and Secrets**.
2. Click **Add** under **Secrets** for each of the following:

| Secret Name | Description | Example |
| :--- | :--- | :--- |
| `PINTEREST_ACCESS_TOKEN` | Pinterest API v5 Access Token | `pina_...` |
| `PINTEREST_CLIENT_ID` | Pinterest App Client ID | `1234567890` |
| `PINTEREST_CLIENT_SECRET` | Pinterest App Client Secret | `...` |
| `AMAZON_ASSOCIATE_TAG` | Amazon Tracking ID | `yourtag-20` |
| `AMAZON_ACCESS_KEY` | Amazon PA-API Access Key | `AKIA...` |
| `AMAZON_SECRET_KEY` | Amazon PA-API Secret Key | `...` |
| `AI_API_KEY` | Anthropic or OpenAI API Key | `sk-ant-...` |
| `ADMIN_API_KEY` | Custom secure password for manual triggers | `random-secure-string` |

---

## Step 6: Test & Verify Health

Once deployed, Cloudflare provides a public URL (e.g., `https://pinterest-automation.<subdomain>.workers.dev`).

1. **Health Check**:
   Open in your browser:
   ```text
   https://pinterest-automation.<subdomain>.workers.dev/health
   ```
   *Expected Response:*
   ```json
   {
     "status": "UP",
     "worker": "pinterest-automation",
     "dry_run": true
   }
   ```

2. **Trigger Product Discovery & Pin Generation Manually**:
   Using `curl` or Postman:
   ```bash
   curl -X POST https://pinterest-automation.<subdomain>.workers.dev/ingest \
     -H "X-Admin-Token: your-chosen-admin-api-key"
   ```

3. **Check Recent Activity & Reports**:
   ```text
   https://pinterest-automation.<subdomain>.workers.dev/report
   ```

---

## Step 7: Transition from Dry-Run to Live Publishing

By default, `DRY_RUN` is set to `"true"` to ensure everything works without making unintended live posts.

When you are ready to publish real pins:
1. Open `wrangler.jsonc`.
2. Change `"DRY_RUN": "true"` to `"DRY_RUN": "false"`.
3. Set your desired `"POSTS_PER_DAY"` and `"TIMEZONE"`.
4. Commit and push:
   ```bash
   git commit -am "Switch to live publishing"
   git push origin main
   ```
Cloudflare Workers Builds will automatically deploy the change, and the Cron Trigger (`0 * * * *`) will begin publishing live Pins on your schedule.
