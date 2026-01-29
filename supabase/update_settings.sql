-- Add last_used_template_id to settings table
alter table public.settings 
add column if not exists last_used_template_id uuid references public.prompt_templates(id) on delete set null;
