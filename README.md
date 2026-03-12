# Padel Turneringsplan (GitHub Pages)

Mobilvenlig webapp til padel-turnering med:

- Login (admin/bruger)
- Invitationer via e-mail (admin)
- Oprettelse og redigering af turneringer
- Historik over gemte planer

## Vigtigt om sikkerhed

Denne løsning er **100% statisk** (GitHub Pages), så login/roller/historik gemmes i browserens `localStorage`.
Det er fint til private/test-formål, men **ikke sikker produktion**.

## Standard admin (første opstart)

- E-mail: `admin@padel.local`
- Kode: `admin123`

## Lokal kørsel

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

## Deploy på GitHub Pages

1. Push koden til GitHub (fx branch `main`).
2. Gå til repo → **Settings** → **Pages**.
3. Under **Build and deployment**, vælg **GitHub Actions**.
4. Workflowet i `.github/workflows/deploy-pages.yml` deployer automatisk ved push.
5. Når workflowet er grønt, får du en URL som:
   `https://<brugernavn>.github.io/<repo>/`

## Invitationer (admin)

Admin kan invitere venner på e-mail i appen:

1. Log ind som admin.
2. Indtast e-mail og vælg rolle (admin/user).
3. Klik **Send invitation**.
4. Appen opretter invitationen og åbner din mailklient (`mailto`) med udfyldt besked.

## Begrænsninger i GitHub Pages-setup

- Brugere/historik synkroniseres ikke mellem enheder automatisk (data er lokale pr. browser).
- E-mailafsendelse sker via brugerens egen mailklient (ikke server-side udsendelse).

Hvis du vil have “rigtig” login, delt historik på tværs af enheder og server-side mail, så skal vi koble appen på backend (fx Supabase/Firebase).
