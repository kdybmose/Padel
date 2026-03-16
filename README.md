# Padel Mexicano (GitHub Pages + Supabase)

Mobilvenlig webapp til Mexicano-turneringer, hvor data gemmes i Supabase.

## Funktioner

- Ingen bruger-login i appen (alle kan åbne siden)
- Admin-redigering låses op med PIN-kode i UI
- Spillerdatabase (tilføj/slet spillere)
- Single-bane og double-bane Mexicano
- Klassisk eller rangliste-turnering
- Aktiv turnering + historik gemmes i Supabase (`public.app_state`)

## Konfiguration

Fil: `supabase.config.js`

```js
window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_KEY";
window.PADEL_ADMIN_PIN = "9433"; // valgfri, men anbefalet
```

Bemærk:

- `PADEL_ADMIN_PIN` bruges kun til at låse skriveadgang op i UI.
- PIN kan være både tal og tekst, men sammenlignes som tekst.
- Hvis PIN ikke er sat, kan alle redigere.

## Supabase migrationer

Kør SQL-filerne i denne rækkefølge:

1. `supabase/migrations/20260313_init.sql`
2. `supabase/migrations/20260313_players_and_active_tournaments.sql`
3. `supabase/migrations/20260313_backfill_profiles.sql`
4. `supabase/migrations/20260316_public_app_state.sql`

## Lokal kørsel

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```
