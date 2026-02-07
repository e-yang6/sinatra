# Supabase Authentication Setup

This guide will help you set up Supabase authentication for the Sinatra app.

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - **Name**: Your project name (e.g., "Sinatra")
   - **Database Password**: Choose a strong password
   - **Region**: Choose the closest region to you
5. Click "Create new project" and wait for it to initialize

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find two important values:
   - **Project URL**: Copy this value
   - **anon/public key**: Copy this value (this is safe to use in the frontend)

## Step 3: Configure Environment Variables

Create a `.env` file in the `sinatra` directory (if it doesn't exist) and add:

```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace `your-project-url-here` and `your-anon-key-here` with the values from Step 2.

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Enable Email Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it should be enabled by default)
3. Optionally configure email templates in **Authentication** → **Email Templates**

## Step 5: Test the Authentication

1. Start your development server: `npm run dev`
2. Click the "Sign In" button in the top right of the header
3. Try creating a new account or signing in with an existing one

## Features

The authentication system includes:

- ✅ **Sign Up**: Create new accounts with email/password
- ✅ **Sign In**: Login with existing accounts
- ✅ **Sign Out**: Logout from current session
- ✅ **Password Reset**: Reset forgotten passwords via email
- ✅ **Session Persistence**: Users stay logged in across page refreshes
- ✅ **User Profile**: Shows logged-in user's email in the header

## Security Notes

- The `anon` key is safe to use in the frontend - it's designed for client-side use
- Supabase handles password hashing and security automatically
- Sessions are stored securely in the browser
- All authentication is handled server-side by Supabase

## Troubleshooting

**"Supabase URL or Anon Key not found" warning:**
- Make sure your `.env` file is in the `sinatra` directory
- Make sure the variable names start with `VITE_`
- Restart your dev server after adding/changing `.env` variables

**Authentication not working:**
- Check that Email provider is enabled in Supabase dashboard
- Verify your API keys are correct in `.env`
- Check the browser console for error messages

**Email confirmation not working:**
- Check your Supabase email settings
- For development, you can disable email confirmation in **Authentication** → **Settings** → **Email Auth** → **Enable email confirmations** (toggle off)
