-- Create prompt_templates table
create table if not exists public.prompt_templates (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  content text not null
);

-- Enable RLS
alter table public.prompt_templates enable row level security;

-- Create policy
create policy "Enable all access for all users" on public.prompt_templates
  for all using (true) with check (true);
