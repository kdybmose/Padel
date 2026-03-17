# Padel Mexicano (GitHub Pages + Supabase)

Mobilvenlig webapp til Mexicano-turneringer, hvor data gemmes i Supabase.

## Funktioner

- UI uden bruger-login (lokal admin-PIN i klienten)
- Offentlig spiller-registrering direkte på siden (opretter spiller i spillerdatabasen)
- Database-regler for invitation-baseret adgang via Supabase Auth
- Spillerdatabase
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

- UI kan fortsat bruge `PADEL_ADMIN_PIN` til lokal lås af redigering.
- På databaseniveau håndhæves invitationer (`public.invitations`) og admin-mail `dybmose@hotmail.com` af migrationer.

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
