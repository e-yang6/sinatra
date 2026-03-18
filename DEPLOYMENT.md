# Deployment Guide - Render & Vercel

## 🚀 Quick Start: Deploy to Render + Vercel

This guide covers deploying:
- **Backend (Python FastAPI)** → Render (Recommended - Simpler!)
- **Frontend (React)** → Vercel

**Why Render?** Render is much simpler than Google Cloud Run - no Docker setup needed, deploys directly from GitHub, and has a free tier!

---

## 📋 Prerequisites

1. **Render Account** (free tier works) - Sign up at [render.com](https://render.com)
2. **Vercel Account** (free tier works) - Sign up at [vercel.com](https://vercel.com)
3. **GitHub Repository** with your code pushed to GitHub

---

## 🔧 Part 1: Deploy Backend to Render (Recommended - Easiest Option)

### Step 1: Push Code to GitHub

Make sure your code is pushed to GitHub:
```powershell
git add .
git commit -m "Prepare for Render deployment"
git push origin master
```

### Step 2: Create Render Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository
5. Render will auto-detect it's a Python app

### Step 3: Configure Render Service

**Settings:**
- **Name:** `sinatra-backend`
- **Region:** Choose closest to you (e.g., `Oregon (US West)`)
- **Branch:** `master` (or your main branch)
- **Root Directory:** `backend` (important!)
- **Runtime:** `Python 3`
- **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt && pip install basic-pitch==0.4.0 --no-deps`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`


**Plan:**
- **Free:** Starter (512MB RAM) - Good for testing
- **Paid:** Standard (1GB+ RAM) - Better for production

### Step 4: Deploy

Click **"Create Web Service"** - Render will:
1. Clone your repo
2. Install dependencies
3. Build your app
4. Deploy it

**First deployment takes 5-10 minutes.**

### Step 5: Get Your Backend URL

After deployment completes, you'll see a URL like:
```
https://sinatra-backend.onrender.com
```

**Save this URL** - you'll need it for Vercel configuration.

### Step 6: Update CORS (Important!)

Update `backend/main.py` to allow your Vercel domain. After you deploy the frontend, update this:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",  # Your Vercel domain (add after frontend deploy)
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then push the change - Render will auto-redeploy.

---

## 🎨 Part 2: Deploy Frontend to Vercel

### Step 1: Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the repository containing your Sinatra project

### Step 2: Configure Build Settings

Vercel should auto-detect these settings, but verify:

- **Framework Preset:** Vite
- **Root Directory:** `./` (root of repo)
- **Build Command:** `cd sinatra && npm install && npm run build`
- **Output Directory:** `sinatra/dist`
- **Install Command:** `cd sinatra && npm install`

### Step 3: Set Environment Variables

In Vercel project settings → Environment Variables, add:

**Frontend Variables (VITE_ prefix):**
```
VITE_BACKEND_URL=https://sinatra-backend-xxxxx-uc.a.run.app
```

**Serverless Function Variables (No VITE_ prefix):**
```
GEMINI_API_KEY=AIzaSyByG6RVY1UXoE_COH5sIDddW1iEMFTzT1g
GEMINI_MODEL=gemini-2.5-flash
```

**Important:**
- Set these for **Production**, **Preview**, and **Development** environments
- `VITE_BACKEND_URL` should match your Cloud Run URL from Part 1, Step 6

### Step 4: Deploy

1. Click "Deploy"
2. Vercel will build and deploy automatically
3. Wait for deployment to complete (2-5 minutes)

### Step 5: Get Your Frontend URL

After deployment, you'll get a URL like:
```
https://sinatra-xxxxx.vercel.app
```

---

## ✅ Part 3: Final Configuration

### Update Backend CORS with Vercel URL

1. Update `backend/main.py` to include your Vercel domain
2. Push the change to GitHub
3. Render will auto-redeploy

```python
allow_origins=[
    "https://sinatra-xxxxx.vercel.app",  # Your actual Vercel URL
    "http://localhost:3000",
]
```

### Test Your Deployment

1. **Frontend:** Visit `https://sinatra-xxxxx.vercel.app`
2. **Backend Health:** Visit `https://sinatra-backend.onrender.com/health`
3. **Test Features:**
   - ✅ Chat with AI assistant
   - ✅ Upload audio files
   - ✅ Generate chord progressions
   - ✅ Voice transcription (browser-based)

---

## 💰 Cost Estimation

### Render (Backend)
- **Free Tier:** 512MB RAM, spins down after 15 min of inactivity (wakes on request)
- **Paid Tier:** $7/month for Standard (1GB RAM, always on)
- **Estimated Cost:** $0/month for testing, $7/month for production

### Vercel (Frontend)
- **Free Tier:** Unlimited deployments, 100GB bandwidth/month
- **After Free Tier:** $20/month for Pro (if needed)
- **Estimated Cost:** $0/month for most projects

**Total Estimated Cost:** $0/month (free tier) or $7/month (always-on backend)

---

## 🔄 Continuous Deployment

### Automatic Deploys

- **Vercel:** Automatically deploys on every push to `main` branch
- **Render:** Automatically deploys on every push to `master`/`main` branch (enabled by default)

**No additional setup needed!** Both platforms watch your GitHub repo.

---

## 🆘 Troubleshooting

### Backend Issues

**Error: "Build failed"**
- Check Render build logs in the dashboard
- Verify `requirements.txt` includes all dependencies
- Check that `Root Directory` is set to `backend` in Render settings

**Error: "Service unavailable" (Free tier)**
- Free tier services spin down after 15 min of inactivity
- First request after spin-down takes 30-60 seconds (cold start)
- Consider upgrading to paid tier for always-on service

**Error: "CORS blocked"**
- Update `backend/main.py` CORS origins to include your Vercel domain
- Push changes - Render will auto-redeploy

**Error: "Module not found"**
- Check `requirements.txt` includes all dependencies
- Verify build command includes: `pip install basic-pitch==0.4.0 --no-deps`

### Frontend Issues

**Error: "Failed to fetch"**
- Verify `VITE_BACKEND_URL` is set correctly in Vercel
- Check backend is accessible: `curl https://your-backend-url/health`
- Check browser console for specific errors

**Error: "Chat unavailable"**
- Verify `GEMINI_API_KEY` is set in Vercel (without VITE_ prefix)
- Check serverless function logs in Vercel dashboard

**Error: "404 on /api/chat"**
- Verify `api/chat.ts` exists in repository root
- Check Vercel build logs
- Ensure file is committed to git

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Render Python Guide](https://render.com/docs/deploy-a-python-app)

---

# Deployment Guide - Security & Architecture Fixes

## 🔍 What Was Broken

### Critical Security Issues Found:
1. **No secret keys exposed in frontend** ✅ (Good - no immediate security risk)
2. **Hardcoded API base URL** ❌ - `API_BASE` was hardcoded to `localhost:8000`, causing all production API calls to fail
3. **Missing environment variable handling** ❌ - No environment-aware API routing

### Architecture Issues:
- Chat endpoint uses `GEMINI_API_KEY` (secret) - should be serverless
- Voice transcription uses the browser Web Speech API - no backend secret required
- All other endpoints are safe (no secrets, just processing)

---

## ✅ What Was Fixed

### 1. Created Vercel Serverless Functions

**Files Created:**
- `api/chat.ts` - Handles chat requests using Gemini API
- `api/chat/clear.ts` - Clears chat history

**Why Serverless:**
- Keeps `GEMINI_API_KEY` secret (never exposed to frontend)
- Better scalability and cost efficiency
- Automatic deployment with Vercel

### 2. Updated Frontend API Client

**File Modified:** `sinatra/api.ts`

**Changes:**
- Environment-aware `API_BASE` detection
- Development: Uses `localhost:8000` or `VITE_BACKEND_URL`
- Production: Uses `VITE_BACKEND_URL` (must be set in Vercel)
- Chat endpoints route to serverless functions in production, backend in development

### 3. Updated Vercel Configuration

**File Modified:** `vercel.json`

**Changes:**
- Added function timeout configuration
- Proper routing for `/api/*` endpoints
- SPA fallback for React Router

---

## 📁 Folder Structure

```
sinatra/
├── api/                    # Vercel serverless functions
│   ├── chat.ts            # Gemini chat endpoint
│   └── chat/
│       └── clear.ts       # Clear chat history
├── sinatra/               # Frontend React app
│   ├── api.ts            # API client (updated)
│   └── ...
└── vercel.json            # Vercel deployment config
```

---

## 🔐 Environment Variables Required

### Vercel Environment Variables (Set in Vercel Dashboard)

#### Frontend Variables (VITE_* prefix):
```
VITE_BACKEND_URL=https://sinatra-backend.onrender.com  # Your Render backend URL
```

#### Serverless Function Variables (No prefix):
```
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash  # Optional, has default
```

### Backend Environment Variables (Set in your backend hosting - Railway/Render/etc.)

```
GEMINI_API_KEY=AIza...           # Only if backend handles chat in local/dev mode
GEMINI_MODEL=gemini-2.0-flash    # Optional
```

**Note:** In production, `GEMINI_API_KEY` is needed in your server environment. Voice input runs in the browser.

---

## 🚨 What Could Silently Fail in Production

### 1. Missing `VITE_BACKEND_URL`
**Symptom:** All audio processing (upload-vocal, render, etc.) fails with network errors
**Fix:** Set `VITE_BACKEND_URL` in Vercel environment variables to your backend URL

### 2. Missing `GEMINI_API_KEY` in Vercel
**Symptom:** Chat returns "Chat is unavailable: GEMINI_API_KEY environment variable is not set"
**Fix:** Add `GEMINI_API_KEY` (without VITE_ prefix) in Vercel environment variables

### 3. Backend Not Deployed
**Symptom:** Audio uploads, MIDI rendering, chord generation all fail
**Fix:** Deploy Python backend to Render (see Part 1) and set `VITE_BACKEND_URL` to your Render URL

### 4. CORS Issues
**Symptom:** API calls fail with CORS errors in browser console
**Fix:** Ensure backend CORS middleware allows your Vercel domain:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-app.vercel.app", "http://localhost:3000"],
    ...
)
```

### 5. Serverless Function Timeout
**Symptom:** Chat requests timeout after 10 seconds
**Fix:** Already configured in `vercel.json` with 30s timeout, but check Vercel plan limits

### 6. Cold Start Delays
**Symptom:** First chat request is slow (5-10 seconds)
**Fix:** Normal for serverless - consider Vercel Pro plan for better performance

---

## 🧪 Testing Checklist

### Local Development:
- [ ] Backend running on `localhost:8000`
- [ ] Frontend running on `localhost:3000`
- [ ] Chat works (calls backend `/chat`)
- [ ] Voice transcription works in a supported browser (Chrome/Edge)
- [ ] Audio uploads work
- [ ] MIDI rendering works

### Production:
- [ ] `VITE_BACKEND_URL` set in Vercel
- [ ] `GEMINI_API_KEY` set in Vercel (no VITE_ prefix)
- [ ] Backend deployed and accessible
- [ ] Chat works (calls `/api/chat` serverless function)
- [ ] Voice transcription works (calls backend)
- [ ] All other endpoints work (call backend)

---

## 🔄 Migration Path

### Step 1: Deploy Backend to Render
Follow Part 1 above to deploy to Render
- Get the backend URL (e.g., `https://sinatra-backend.onrender.com`)

### Step 2: Update Vercel Environment Variables
Add to Vercel project settings:
```
VITE_BACKEND_URL=https://sinatra-backend.onrender.com
GEMINI_API_KEY=AIza...
```

### Step 3: Deploy Frontend
Push to GitHub (or your connected repo) - Vercel will auto-deploy

### Step 4: Verify
- Test chat functionality
- Test voice transcription
- Test audio uploads
- Check browser console for errors

---

## 📝 Code Changes Summary

### Files Modified:
1. `sinatra/api.ts` - Environment-aware API routing
2. `sinatra/package.json` - Added `@vercel/node` types
3. `vercel.json` - Added serverless function configuration

### Files Created:
1. `api/chat.ts` - Serverless chat endpoint
2. `api/chat/clear.ts` - Serverless clear history endpoint

### Files Deleted:
- None (voice input runs in-browser via Web Speech API)

---

## 🎯 Architecture Decision: Why Voice Input Runs In The Browser

**Web Speech API is built into supported browsers**. Therefore:
- ✅ Chat → Vercel serverless or backend (uses Gemini API)
- ✅ Voice input → Browser (no backend speech service needed)
- ✅ All other endpoints → Python backend (no secrets, just processing)

This is the correct architecture for your stack.

---

## ⚠️ Important Notes

1. **Never commit `.env` files** - All secrets must be in Vercel environment variables
2. **Backend must be deployed separately** - Vercel only hosts the frontend and serverless functions
3. **CORS must be configured** - Backend must allow requests from your Vercel domain
4. **Environment variables are case-sensitive** - `GEMINI_API_KEY` not `gemini_api_key`
5. **VITE_ prefix required** - Frontend can only access variables starting with `VITE_`
6. **Serverless functions use `process.env`** - No `VITE_` prefix needed for serverless functions

---

## 🆘 Troubleshooting

### Chat returns "API key not set"
- Check `GEMINI_API_KEY` is set in Vercel or backend env (not in frontend env vars)
- Redeploy after adding environment variables

### All API calls fail with network errors
- Check `VITE_BACKEND_URL` is set correctly
- Verify backend is deployed and accessible
- Check CORS configuration on backend

### 404 on `/api/chat`
- Verify `api/chat.ts` exists in repository root
- Check Vercel build logs for errors
- Ensure file is committed to git

### Chat works locally but not in production
- Local uses backend, production uses serverless
- Check serverless function logs in Vercel dashboard
- Verify environment variables are set for production (not just preview)
