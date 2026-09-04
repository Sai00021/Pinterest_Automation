# Amazon Affiliate → Pinterest Automation System (Cloudflare Workers)

A production-ready system designed to automate product discovery from Amazon Associates, generate AI-optimized Pin content, and publish Pins compliant with Pinterest and Amazon policies.

## 🏗️ Architecture
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (Persistent SQL)
- **Object Storage**: Cloudflare R2 (Pin Images)
- **Scheduler**: Cloudflare Cron Triggers (Timezone-Aware)
- **CI/CD**: GitHub → Cloudflare Workers Builds

## ⚙️ Configuration & Secrets

Set these in the Cloudflare Dashboard:
- `PINTEREST_ACCESS_TOKEN`
- `PINTEREST_CLIENT_ID`
- `PINTEREST_CLIENT_SECRET`
- `AMAZON_ASSOCIATE_TAG`
- `AMAZON_ACCESS_KEY`
- `AMAZON_SECRET_KEY`
- `AI_API_KEY` (Anthropic or OpenAI)
- `ADMIN_API_KEY` (For manual trigger endpoints)

Configure non-secrets in `wrangler.jsonc`.

## 🚀 Setup & Deployment
1. Apply migrations locally or remotely:
   ```bash
   npm run db:migrate:local
   npm run db:migrate:remote
   ```
2. Run automated tests:
   ```bash
   npm run test:run
   ```
3. Deploy to Cloudflare Workers:
   ```bash
   npm run deploy
   ```

## 🛡️ Compliance & Safety
- **Affiliate Disclosure**: Built-in adherence to Amazon Associates policies.
- **Idempotency**: Strict hashing via Web Crypto to prevent duplicate Pins.
- **Dry-Run Mode**: Test end-to-end flows safely before posting live.
