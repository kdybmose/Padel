alter table public.players
  add column if not exists total_balls_won integer not null default 0,
  add column if not exists total_balls_against integer not null default 0,
  add column if not exists total_matches integer not null default 0,
  add column if not exists total_wins integer not null default 0;

update public.players
set total_balls_won = coalesce(total_balls_won, 0),
    total_balls_against = coalesce(total_balls_against, 0),
    total_matches = coalesce(total_matches, 0),
    total_wins = coalesce(total_wins, 0);
