# Padel Mexicano (GitHub Pages + Supabase)

Mobilvenlig webapp til Mexicano-format med 4 spillere:

- Supabase Auth (email/password)
- Roller (`admin` / `user`)
- Invitationer via SMTP (Supabase Auth invite)
- Single-bane Mexicano (alle møder alle)
- Double-bane Mexicano (3 runder for 4 spillere)
- Samlet historik og spillerstatistik på tværs af turneringer
- Aktiv turnering + historik gemmes i Supabase-database (`public.app_state`)

## Funktionalitet i Mexicano-flowet

- Vælg bane-type: `single` eller `double`.
- Vælg antal bolde pr. runde (fx 24).
- Ved resultatindtastning udfyldes modstanderens score automatisk (fx 14 => 10).
- Vinder findes på flest samlede bolde vundet, når alle runder er spillet.
- Historik viser turneringsvindere og samlet leaderboard med sortering.

## 1) Konfigurer frontend

Fil: `supabase.config.js`

```js
window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_KEY";
window.PADEL_ADMIN_PIN = "SÆT_EN_HEMMELIG_KODE";
```

`PADEL_ADMIN_PIN` bruges til at låse redigering op i UI, så kun administratoren kan ændre turneringer/resultater.

## 2) Kør SQL migration i Supabase

Kør SQL fra (i rækkefølge):

- `supabase/migrations/20260313_init.sql`
- `supabase/migrations/20260313_players_and_active_tournaments.sql`
- `supabase/migrations/20260313_backfill_profiles.sql`
- `supabase/migrations/20260316_public_app_state.sql`

`20260313_backfill_profiles.sql` er vigtig, hvis der allerede var brugere i `auth.users` før migrationerne blev kørt. Den opretter manglende rækker i `public.profiles`.

## 3) Deploy edge function til invitationer

Function-fil:

- `supabase/functions/invite-user/index.ts`

Deploy:

```bash
supabase functions deploy invite-user
```

## 4) Auth + SMTP setup i Supabase

I Supabase Dashboard:

- **Authentication → Providers**: Aktivér Email/password.
- **Authentication → URL configuration**: Sæt Site URL til din GitHub Pages URL.
- **Authentication → SMTP settings**: Konfigurer SMTP til invite mails.

## 5) Opret første admin (ingen hardcodede credentials i appen)

1. Opret bruger i Supabase Authentication.
2. Kør SQL:

```sql
update public.profiles
set role = 'admin'
where email = 'din-admin@email.dk';
```

## Lokal kørsel

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```
