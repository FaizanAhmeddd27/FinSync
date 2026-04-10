# FinSync Deployment Guide (Render + Vercel)

This guide deploys:
- Backend API (`backend`) to Render
- Frontend app (`frontend`) to Vercel

## 1. Prerequisites

1. GitHub repo pushed with this project.
2. Active accounts on Render and Vercel.
3. Production credentials ready for:
   - Supabase
   - Upstash Redis
   - Twilio
   - SMTP Email
   - Groq
   - Fixer
   - OAuth providers (Google, GitHub)

## 2. Files Added for Deployment

1. `render.yaml` (repo root): Render backend blueprint.
2. `frontend/vercel.json`: SPA rewrite config for React Router.

## 3. Deploy Backend on Render

### Option A (recommended): Use `render.yaml` Blueprint

1. Open Render dashboard.
2. Click **New** -> **Blueprint**.
3. Connect your GitHub repo.
4. Render auto-detects `render.yaml` and creates service `finsync-backend`.
5. In the created service, go to **Environment** and fill all variables marked `sync: false`.
6. Click **Manual Deploy** -> **Deploy latest commit**.

### Option B: Manual Web Service setup

Use these values:
- Root Directory: `backend`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`
- Runtime: Node

## 4. Backend Environment Variables (Render)

Set these in Render service Environment:

Required secrets:
- `CLIENT_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`
- `EMAIL_USER`
- `EMAIL_PASS`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `GROQ_API_KEY`
- `FIXER_API_KEY`
- `ENCRYPTION_KEY`

Defaults you can keep:
- `NODE_ENV=production`
- `PORT=10000`
- `JWT_EXPIRE=15m`
- `JWT_REFRESH_EXPIRE=7d`
- `JWT_COOKIE_EXPIRE=7`
- `EMAIL_HOST=smtp.gmail.com`
- `EMAIL_PORT=587`
- `GROQ_MODEL=llama-3.3-70b-versatile`
- `FIXER_BASE_URL=http://data.fixer.io/api`
- `MAX_LOGIN_ATTEMPTS=5`
- `LOCK_TIME=15`
- `OTP_EXPIRY=10`
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX_REQUESTS=100`

## 5. Verify Backend Deployment

1. Open your Render URL, for example:
   - `https://finsync-backend.onrender.com/api/health`
2. Confirm response contains:
   - `success: true`

Save this backend URL. You will use it in Vercel as:
- `VITE_API_URL=https://your-backend.onrender.com/api`

## 6. Deploy Frontend on Vercel

1. Open Vercel dashboard.
2. Click **Add New** -> **Project**.
3. Import the same GitHub repo.
4. In project settings set:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add Environment Variable:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api`
6. Deploy.

## 7. Connect Frontend and Backend Domains

After Vercel deploys, copy frontend domain, for example:
- `https://finsync.vercel.app`

Then update Render variable:
- `CLIENT_URL=https://finsync.vercel.app`

Redeploy Render service after changing `CLIENT_URL`.

## 8. OAuth Callback URLs (Google/GitHub)

Update provider settings to use Render backend URL:
- Google callback example:
  - `https://your-backend.onrender.com/api/auth/google/callback`
- GitHub callback example:
  - `https://your-backend.onrender.com/api/auth/github/callback`

Also ensure these exact values are in Render env vars:
- `GOOGLE_CALLBACK_URL`
- `GITHUB_CALLBACK_URL`

## 9. Post-Deployment Checklist

1. Frontend loads from Vercel without white screen.
2. Login/Register calls reach Render API.
3. `/api/health` works.
4. CORS works (`CLIENT_URL` exactly matches Vercel domain).
5. OAuth login works with new callback URLs.
6. Redis, Supabase, email, SMS features work.

## 10. Important Notes

1. Render free plan may sleep after inactivity; first request can be slow.
2. If frontend and backend are on different domains, cookie/session behavior depends on browser policy.
3. Your frontend already reads API from `VITE_API_URL` in `frontend/src/lib/api.js`, so always set this in Vercel.
4. Every time backend domain changes, update:
   - Vercel `VITE_API_URL`
   - OAuth callback URLs

## 11. Quick Commands (Local Validation)

Backend:
1. `cd backend`
2. `npm install`
3. `npm run build`
4. `npm start`

Frontend:
1. `cd frontend`
2. `npm install`
3. `npm run build`
4. `npm run preview`

If these pass locally, deployment usually succeeds.