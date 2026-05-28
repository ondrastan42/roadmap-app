-- Spusťte v Supabase → SQL Editor
create table if not exists public.board_notes (
  id int primary key default 1 check (id = 1),
  content text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.board_notes (id, content)
values (1, '')
on conflict (id) do nothing;
