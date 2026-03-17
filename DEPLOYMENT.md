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
VITE_BACKEND_URL=https://your-backend.railway.app  # Your Python backend URL
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
**Fix:** Deploy Python backend to Railway, Render, or Fly.io and set `VITE_BACKEND_URL`

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

### Step 1: Deploy Backend
Deploy your Python FastAPI backend to Railway, Render, or Fly.io
- Get the backend URL (e.g., `https://sinatra-backend.railway.app`)

### Step 2: Update Vercel Environment Variables
Add to Vercel project settings:
```
VITE_BACKEND_URL=https://sinatra-backend.railway.app
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
