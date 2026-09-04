# Render deployment

This repository uses a Render Blueprint to deploy three resources from the
same GitHub repository:

- `raleifna-tutoringapp`: Next.js frontend
- `raleifna-tutoringapp-api`: Express and Socket.IO backend
- `tutoringapp-db`: managed PostgreSQL database

## Before deploying

1. Run `corepack pnpm test` locally.
2. Push the intended commit to the `main` branch.
3. Sign in to Render with the GitHub account that can access the private
   `raleifna/tutoringapp` repository.

## Create the Blueprint

1. In Render, select **New > Blueprint**.
2. Connect the `raleifna/tutoringapp` repository.
3. Render detects `render.yaml`. Review the three resources before applying.
4. Apply the Blueprint and wait for the database, API, and frontend deploys.

Database migrations run with `prisma migrate deploy` before the API starts.
Unlike `prisma db push --accept-data-loss`, this does not accept destructive
schema changes automatically.

## Verify the deployment

Check these URLs after Render finishes:

- Frontend: `https://raleifna-tutoringapp.onrender.com`
- API health: `https://raleifna-tutoringapp-api.onrender.com/health`
- Versioned API health: `https://raleifna-tutoringapp-api.onrender.com/api/v1/health`

Then verify registration, login, tutor search, booking creation, booking
conflict handling, and real-time chat. Seed data is intentionally not loaded
automatically into the hosted database.

## Enable integrations later

### Gemini

Add `GEMINI_API_KEY` to the API service and change `AI_REPLY_MODE` from `mock`
to `live`, then redeploy the API.

### Stripe

Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to the frontend service and add
`STRIPE_SECRET_KEY` to the API service. Configure the Stripe webhook endpoint
as:

`https://raleifna-tutoringapp-api.onrender.com/api/v1/payments/stripe/webhook`

Store the resulting signing secret in `STRIPE_WEBHOOK_SECRET`, then redeploy.

### Email verification

The first deployment sets `EMAIL_VERIFICATION_REQUIRED=false` so registration
can be tested without an SMTP provider. Configure SMTP variables before
turning verification on.

## Free-tier limitation

The current upload implementation writes avatars and verification files to the
API container filesystem. Render's free filesystem is ephemeral, so uploaded
files can disappear after a restart or redeploy. Before treating the service as
production, move uploads to object storage or attach a paid persistent disk.

Render's free PostgreSQL offering is suitable only for a temporary portfolio
demo and currently expires after 30 days. Select a paid database or another
managed PostgreSQL provider for durable production data.
