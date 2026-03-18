# Quick Deployment Reference - Render + Vercel

## 🚀 Deployment Steps

### Backend (Render)
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repo
4. Set Root Directory: `backend`
5. Set Build Command: `pip install -r requirements.txt && pip install basic-pitch==0.4.0 --no-deps`
6. Set Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables (see below)
8. Deploy!

### Frontend (Vercel)
- Push to GitHub → Auto-deploys via Vercel
- Set environment variables in Vercel dashboard

---

## 🔑 Required Environment Variables

### Render (Backend)
Set in Render Dashboard → Environment:
```
GEMINI_API_KEY=AIzaSyByG6RVY1UXoE_COH5sIDddW1iEMFTzT1g
GEMINI_MODEL=gemini-2.5-flash
PYTHON_VERSION=3.12.0
```

### Vercel (Frontend)
Set in Vercel Dashboard → Settings → Environment Variables:
```
VITE_BACKEND_URL=https://sinatra-backend.onrender.com
GEMINI_API_KEY=AIzaSyByG6RVY1UXoE_COH5sIDddW1iEMFTzT1g
GEMINI_MODEL=gemini-2.5-flash
```

---

## 📍 URLs After Deployment

- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://sinatra-backend.onrender.com`
- **Backend Health Check:** `https://sinatra-backend.onrender.com/health`

---

## 🔧 Common Tasks

### Check Backend Logs
- Go to Render Dashboard → Your Service → Logs tab

### Update Backend Environment Variables
- Go to Render Dashboard → Your Service → Environment tab
- Add/Edit variables → Save Changes (auto-redeploys)

### Redeploy Backend
- Push changes to GitHub → Render auto-deploys
- Or manually trigger: Render Dashboard → Manual Deploy

---

## ✅ Quick Health Check

1. **Backend:** `curl https://your-backend-url/health`
2. **Frontend:** Visit your Vercel URL
3. **Test Chat:** Try asking the AI assistant a question
4. **Test Upload:** Upload an audio file

---

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
