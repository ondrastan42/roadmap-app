-- Spusťte v Supabase → SQL Editor
alter table public.items
  add column if not exists roadmap_horizon text
  check (roadmap_horizon is null or roadmap_horizon in ('now', 'next', 'later'));
