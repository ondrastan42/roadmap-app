-- Spusťte v Supabase → SQL Editor
-- Pozor: sloupec musí být přesně "Zadavatel" (velké Z), jinak app neuloží
alter table public.items
  add column if not exists "Zadavatel" text;
