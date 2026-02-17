-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.projects enable row level security;

create policy "Users can view their own projects"
on public.projects for select
using (auth.uid() = user_id);

create policy "Users can insert their own projects"
on public.projects for insert
with check (auth.uid() = user_id);

create policy "Users can update their own projects"
on public.projects for update
using (auth.uid() = user_id);

create policy "Users can delete their own projects"
on public.projects for delete
using (auth.uid() = user_id);

-- Storage bucket for project assets
insert into storage.buckets (id, name, public) 
values ('projects', 'projects', true)
on conflict (id) do nothing;

-- Storage policies (assumes path structure: user_id/project_id/filename)
create policy "Users can upload their own project assets"
on storage.objects for insert
with check (
  bucket_id = 'projects' and
  auth.uid() = (storage.foldername(name))[1]::uuid
);

create policy "Users can view their own project assets"
on storage.objects for select
using (
  bucket_id = 'projects' and
  auth.uid() = (storage.foldername(name))[1]::uuid
);

create policy "Users can update their own project assets"
on storage.objects for update
using (
  bucket_id = 'projects' and
  auth.uid() = (storage.foldername(name))[1]::uuid
);

create policy "Users can delete their own project assets"
on storage.objects for delete
using (
  bucket_id = 'projects' and
  auth.uid() = (storage.foldername(name))[1]::uuid
);
