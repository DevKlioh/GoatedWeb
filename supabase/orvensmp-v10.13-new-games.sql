-- OrvenSMP V10.13 — allow new endless games in game_scores.
-- The API is already updated. This block safely replaces a common game CHECK constraint if present.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid='public.game_scores'::regclass
      and contype='c'
      and pg_get_constraintdef(oid) ilike '%game%'
  loop
    execute format('alter table public.game_scores drop constraint %I',c.conname);
  end loop;
end $$;

alter table public.game_scores
  add constraint game_scores_game_check
  check (game in ('merge','block','memory','math','typing','dodge'));
