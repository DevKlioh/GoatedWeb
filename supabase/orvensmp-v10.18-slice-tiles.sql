-- OrvenSMP V10.18 — allow Orven Slice + Orven Tiles leaderboard scores.
do $$
declare c record;
begin
 for c in select conname from pg_constraint
  where conrelid='public.game_scores'::regclass and contype='c'
    and pg_get_constraintdef(oid) ilike '%game%'
 loop execute format('alter table public.game_scores drop constraint %I',c.conname); end loop;
end $$;
alter table public.game_scores add constraint game_scores_game_check
check (game in ('merge','block','memory','math','typing','dodge','slice','tiles'));
