-- Add selected_model to settings table
alter table public.settings 
add column if not exists selected_model text default 'google/gemini-3-flash-preview';
