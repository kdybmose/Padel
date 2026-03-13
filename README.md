# Padel Turneringsplan (GitHub Pages + Supabase)

Mobilvenlig webapp til padel-turnering med:

- Supabase Auth (email/password)
- Roller (`admin` / `user`)
- Invitationer via SMTP (Supabase Auth invite)
- Oprettelse og redigering af turneringer
- Historik gemt i Supabase

## 1) Konfigurer frontend

Fil: `supabase.config.js`

```js
window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR_PUBLISHABLE_KEY";
```

## 2) Kør SQL migration i Supabase

Kør indholdet af:

- `supabase/migrations/20260313_init.sql`

Den opretter tabeller, funktioner, trigger og RLS policies.

## 3) Deploy edge function til invitationer

Filen ligger i:

- `supabase/functions/invite-user/index.ts`

Deploy via Supabase CLI:

```bash
supabase functions deploy invite-user
```

Functionen bruger:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

som miljøvariabler i Supabase projectet.

## 4) SMTP + Auth-indstillinger

I Supabase dashboard:

- **Authentication → Providers**: Email/password aktiv.
- **Authentication → URL configuration**: sæt Site URL til GitHub Pages URL.
- **Authentication → SMTP settings**: konfigurer SMTP så invite-mails sendes rigtigt.

## 5) Opret første admin

Da appen nu bruger Supabase Auth (ingen hardcoded admin), gør sådan:

1. Opret en bruger via Authentication i dashboardet.
2. Kør SQL i editor:

```sql
update public.profiles
set role = 'admin'
where email = 'din-admin@email.dk';
```

## Lokal kørsel

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

## Deploy på GitHub Pages

1. Push koden til GitHub.
2. Deploy via eksisterende workflow/Pages setup.
3. Bekræft at Site URL i Supabase matcher Pages URL'en.
