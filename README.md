# Padel Mexicano (GitHub Pages + Supabase)

Mobilvenlig webapp til Mexicano-turneringer, hvor data gemmes i Supabase.

## Funktioner

- Login-side ved første åbning (Supabase Auth) med login, registrering og glemt adgangskode
- Nye brugere kan sende en spilleranmodning, som admin godkender i spillerdatabasen
- Kristian Dybmose (dybmose@hotmail.com) er eneste admin
- Spillerdatabase
- Single-bane og double-bane Mexicano
- Klassisk eller rangliste-turnering
- Spillerdatabase gemmes i Supabase-tabellen `public.players`
- Aktiv turnering gemmes i `public.active_tournaments`, og afsluttede turneringer gemmes i `public.tournaments`
- Rangliste læses fra spillerstatistik i databasen og overlever derfor refresh/gen-login
- `public.app_state` bruges kun til fælles hjælpe-data som spilleranmodninger

## Konfiguration

Fil: `supabase.config.js`

```js
window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_KEY";
```

Bemærk:

- Redigering af turneringer/spillere gives kun til admin-brugeren `dybmose@hotmail.com`.
- Nye login-brugere kan oprette konto selv og sender derefter en spilleranmodning til admin, som kan godkende eller afvise den i spillerdatabasen.
- Bekræftelses- og invitationsmails sendes tilbage til den aktuelle app-URL. Den URL skal også være tilladt under Supabase Auth -> URL Configuration.

## Supabase migrationer

Kør SQL-filerne i denne rækkefølge:

1. `supabase/migrations/20260313_init.sql`
2. `supabase/migrations/20260313_players_and_active_tournaments.sql`
3. `supabase/migrations/20260313_backfill_profiles.sql`
4. `supabase/migrations/20260316_public_app_state.sql`
5. `supabase/migrations/20260317_invite_admin_and_player_sync.sql`
6. `supabase/migrations/20260321_player_stats_and_history.sql`

## Lokal kørsel

Appen er en statisk frontend, så lokal kørsel betyder bare, at du starter en lille webserver til HTML/CSS/JS-filerne. Supabase er stadig databasen i skyen.

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Åbn derefter `http://localhost:8080` i browseren.
