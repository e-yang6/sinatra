# Supabase Projects Table Setup

To enable project storage in Supabase, you need to create a `projects` table in your Supabase database.

## Step 1: Create the Projects Table

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL to create the `projects` table:

```sql
-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own projects
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Step 2: Verify the Table

After running the SQL:

1. Go to **Table Editor** in your Supabase dashboard
2. You should see the `projects` table
3. The table should have RLS enabled (you'll see a shield icon)

## Fallback to localStorage

If the Supabase table doesn't exist or there's an error, the app will automatically fall back to using `localStorage` for project storage. Projects will be stored locally in the browser, but won't sync across devices.

## Optional: Add Project Data Storage

If you want to store project data (tracks, notes, etc.) in Supabase as well, you can extend the table:

```sql
-- Add a data column to store project state (JSON)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
```

Then update the `ProjectsPage` and `Editor` components to save/load project data.
