-- Create leads table
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Contact Info
  email text,
  first_name text,
  last_name text,
  company_name text,
  website_url text,
  linkedin_url text,
  
  -- Processing Status
  status text default 'pending', -- pending, processing, completed, failed, exported
  
  -- AI Content
  website_summary text,
  icebreaker text,
  
  -- Metadata
  error_message text,
  campaign_id text
);

-- Enable Row Level Security (RLS)
alter table public.leads enable row level security;

-- Create policy to allow all operations for now (since we are using anon key for simple app)
-- Drop existing policy if it exists to avoid errors on re-run
drop policy if exists "Enable all access for all users" on public.leads;

create policy "Enable all access for all users" on public.leads
  for all using (true) with check (true);
