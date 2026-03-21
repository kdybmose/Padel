# Padel Mexicano (GitHub Pages + Supabase)

Mobilvenlig webapp til Mexicano-turneringer, hvor data gemmes i Supabase.

## Funktioner

- Login-side ved første åbning (Supabase Auth) med login, registrering og glemt adgangskode
- Kun admin kan oprette spillere og invitere brugere via spillerdatabasen
- Kristian Dybmose (dybmose@hotmail.com) er eneste admin
- Spillerdatabase
- Single-bane og double-bane Mexicano
- Klassisk eller rangliste-turnering
- Aktiv turnering + historik gemmes i Supabase (`public.app_state`)
- Browseren bruges ikke som lokal backup for spillerdata eller aktiv turnering

## Konfiguration

Fil: `supabase.config.js`

```js
window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_KEY";
```

Bemærk:

- Redigering af turneringer/spillere gives kun til admin-brugeren `dybmose@hotmail.com`.
- Nye login-brugere kan oprette konto selv, men spillerprofiler i databasen oprettes kun af admin.
- Bekræftelses- og invitationsmails sendes tilbage til den aktuelle app-URL. Den URL skal også være tilladt under Supabase Auth -> URL Configuration.

## Supabase migrationer

Kør SQL-filerne i denne rækkefølge:

1. `supabase/migrations/20260313_init.sql`
2. `supabase/migrations/20260313_players_and_active_tournaments.sql`
3. `supabase/migrations/20260313_backfill_profiles.sql`
4. `supabase/migrations/20260316_public_app_state.sql`
5. `supabase/migrations/20260317_invite_admin_and_player_sync.sql`

## Lokal kørsel

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```
