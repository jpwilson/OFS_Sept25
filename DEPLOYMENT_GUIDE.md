# Deployment Guide - Our Family Socials MVP

This guide walks you through deploying Our Family Socials to production using Supabase (PostgreSQL + Auth) and Vercel (hosting).

## 📋 Prerequisites

- GitHub account with code pushed to repository
- Supabase account (free tier is fine for MVP)
- Vercel account (free tier is fine for MVP)

## 🚀 Deployment Steps

### Step 1: Set Up Supabase Database (15 minutes)

#### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" (sign up if needed)
3. Create a new project:
   - **Name**: `our-family-socials` (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
4. Wait 2-3 minutes for project to initialize

#### 1.2 Run Database Migration
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `backend/migrations/supabase_init.sql`
4. Paste into SQL Editor
5. Click **Run** (bottom right)
6. You should see: ✅ "Database schema created successfully!"

#### 1.3 Seed Test Data
1. In SQL Editor, click **New Query** again
2. Copy the contents of `backend/migrations/supabase_seed.sql`
3. Paste into SQL Editor
4. Click **Run**
5. You should see: ✅ "Seed data inserted successfully!"

#### 1.4 Get Database Connection String
1. In Supabase dashboard, go to **Settings** > **Database**
2. Scroll to **Connection string** section
3. Select **URI** tab
4. Copy the connection string (looks like: `postgresql://postgres:[PASSWORD]@...`)
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. Save this for later (you'll need it for Vercel)

#### 1.5 Get Supabase API Keys
1. Go to **Settings** > **API**
2. Copy these values (save for later):
   - **Project URL**: `https://[your-project-ref].supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
   - **service_role key**: Long string starting with `eyJ...` (keep this secret!)

---

### Step 2: Test Locally with Supabase (Optional but Recommended)

Before deploying to production, test that your app works with Supabase.

#### 2.1 Install PostgreSQL Driver
```bash
cd backend
pip install -r requirements.txt
# This installs psycopg2-binary which is needed for PostgreSQL
```

#### 2.2 Create Local .env File
```bash
cp .env.example .env
```

Edit `.env` and update:
```bash
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
SECRET_KEY="generate-a-new-secret-key-here"  # Run: openssl rand -hex 32
```

#### 2.3 Test Backend Locally
```bash
# Make sure you're in the backend directory
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` to see the API documentation.

Try logging in with test accounts:
- Email: `sarah@example.com` / Password: `password123`
- Email: `tom@example.com` / Password: `password123`
- Email: `emma@example.com` / Password: `password123`

If this works, you're ready to deploy! 🎉

---

### Step 3: Deploy Backend to Vercel (10 minutes)

#### 3.1 Create vercel.json Configuration
This file should already exist in your `backend/` directory. If not, create it:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "app/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app/main.py"
    }
  ]
}
```

#### 3.2 Create requirements.txt for Vercel
Make sure `backend/requirements.txt` has all dependencies (should already be done).

#### 3.3 Deploy Backend
1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** > **Project**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
5. **Environment Variables** - Add these:
   ```
   DATABASE_URL = postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   SECRET_KEY = [generate with: openssl rand -hex 32]
   UPLOAD_DIR = /tmp/uploads
   ```
6. Click **Deploy**
7. Wait 2-3 minutes for deployment
8. Copy your backend URL (e.g., `https://your-backend.vercel.app`)

#### 3.4 Test Backend Deployment
Visit your backend URL + `/docs` to see the API documentation:
```
https://your-backend.vercel.app/docs
```

---

### Step 4: Deploy Frontend to Vercel (10 minutes)

#### 4.1 Update Frontend API URL
Edit `frontend/src/services/api.js`:

```javascript
// Change this line:
const API_BASE_URL = 'http://localhost:8000/api/v1';

// To your production backend URL:
const API_BASE_URL = 'https://your-backend.vercel.app/api/v1';
```

Or better yet, use environment variables:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
```

#### 4.2 Create .env for Frontend (Optional)
Create `frontend/.env.production`:
```bash
VITE_API_BASE_URL=https://your-backend.vercel.app/api/v1
```

#### 4.3 Deploy Frontend
1. In Vercel, click **Add New** > **Project** again
2. Select your repository (or import again)
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables** (if using .env approach):
   ```
   VITE_API_BASE_URL = https://your-backend.vercel.app/api/v1
   ```
5. Click **Deploy**
6. Wait 2-3 minutes for deployment
7. Copy your frontend URL (e.g., `https://your-app.vercel.app`)

---

### Step 5: Configure CORS (Important!)

Your backend needs to allow requests from your frontend domain.

#### 5.1 Update Backend CORS Settings
Edit `backend/app/main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

# Add your production frontend URL
origins = [
    "http://localhost:5173",  # Local development
    "https://your-app.vercel.app",  # Production frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 5.2 Redeploy Backend
1. Commit and push changes to GitHub:
   ```bash
   git add .
   git commit -m "Update CORS for production"
   git push
   ```
2. Vercel will automatically redeploy both frontend and backend

---

### Step 6: Test Production Deployment

1. Visit your frontend URL: `https://your-app.vercel.app`
2. Try logging in with test account:
   - Email: `sarah@example.com`
   - Password: `password123`
3. Test key features:
   - View feed of events
   - View map with location markers
   - View timeline
   - Create a new event (as free user, max 5 events)
   - Like/comment on events
   - Follow other users

---

## 🔒 Next Steps: Add Google OAuth (Phase 2)

Once your basic deployment is working, you can add Google OAuth via Supabase:

1. **Enable Google Provider in Supabase**:
   - Go to **Authentication** > **Providers**
   - Enable **Google**
   - Add OAuth credentials from Google Cloud Console

2. **Update Frontend to Use Supabase Auth**:
   - Install Supabase client: `npm install @supabase/supabase-js`
   - Replace custom auth with Supabase auth

3. **Update Backend to Verify Supabase Tokens**:
   - Backend validates JWT tokens from Supabase
   - Extract user info from Supabase token

---

## 📊 Production Checklist

Before announcing your MVP to users:

- [ ] Database migrated to Supabase successfully
- [ ] Backend deployed to Vercel and accessible
- [ ] Frontend deployed to Vercel and accessible
- [ ] CORS configured correctly
- [ ] Test login works with demo accounts
- [ ] Event creation works (5-event limit for free users)
- [ ] File uploads work (images)
- [ ] Map displays locations correctly
- [ ] Comments and likes work
- [ ] Follow system works
- [ ] Privacy Policy page accessible (`/privacy`)
- [ ] Terms of Service page accessible (`/terms`)
- [ ] Contact form accessible (`/contact`)
- [ ] Update SECRET_KEY to production value (secure!)
- [ ] Custom domain configured (optional)

---

## 🐛 Troubleshooting

### Backend won't connect to Supabase
- Check DATABASE_URL format: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`
- Verify password has no special characters that need escaping
- Check Supabase project is not paused (free tier pauses after inactivity)

### Frontend can't reach backend
- Check CORS settings in `backend/app/main.py`
- Verify API_BASE_URL in frontend points to production backend
- Check browser console for CORS errors

### File uploads not working
- Vercel has read-only filesystem except `/tmp`
- Update UPLOAD_DIR to `/tmp/uploads` in production
- Consider using Supabase Storage for persistent file storage

### "Event limit reached" error
- This is expected for free tier users (5 events max)
- Test with premium user account (tom@example.com)
- To upgrade a user: Update `subscription_tier` to 'premium' in Supabase

---

## 💰 Cost Breakdown (Free Tier)

- **Supabase Free**: 500MB database, 2GB file storage, 50k monthly active users
- **Vercel Free**: 100GB bandwidth/month, unlimited deployments
- **Total Monthly Cost**: $0 (until you exceed free tier limits)

---

## 🚀 Future Enhancements

1. **Google OAuth** - Add social login via Supabase Auth
2. **Custom Domain** - Configure custom domain in Vercel (e.g., `ourfamilysocials.com`)
3. **Image Storage** - Move uploads to Supabase Storage or AWS S3
4. **Email Notifications** - Add Supabase email triggers
5. **Analytics** - Add Vercel Analytics or Google Analytics
6. **Payment Processing** - Integrate Stripe for Premium/Family subscriptions

---

## 📞 Support

If you encounter issues during deployment:
1. Check Vercel deployment logs
2. Check Supabase logs (Dashboard > Database > Logs)
3. Test API endpoints directly using `/docs` route
4. Contact support via `/contact` form on your site

---

**Ready to launch? Let's get your first 1000 users! 🎉**
