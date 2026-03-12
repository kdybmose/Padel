# Padel Planner (GitHub Pages)

Ny version af appen med:

- Login med roller: **admin** og **bruger**
- Admin-invitationer via e-mail (med invitationskode)
- Historik over gemte turneringer
- Mobilvenlig UI
- Deploy til GitHub Pages

## Standard admin

Ved første opstart oprettes:

- E-mail: `admin@padel.local`
- Kodeord: `admin123`

## Kør lokalt

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

## GitHub Pages deploy

1. Push repo til GitHub.
2. Gå til **Settings → Pages**.
3. Vælg **GitHub Actions** under build/deploy.
4. Workflowet i `.github/workflows/deploy-pages.yml` deployer automatisk.

## Invitation-flow

1. Log ind som admin.
2. Opret invitation med e-mail + rolle.
3. Appen genererer en **inviteringskode** og åbner mailklient (`mailto:`).
4. Modtager opretter konto med e-mail + kode.

## Bemærkning om sikkerhed

Dette er stadig en statisk app på GitHub Pages.
Data gemmes i browserens `localStorage`, så det er ikke en fuld backend-løsning.
Vil du have rigtig sikker login + delt data mellem enheder, så skal der backend på (fx Supabase/Firebase).
