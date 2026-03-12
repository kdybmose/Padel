# Padel Turneringsplan (mobilvenlig)

En lille webapp til at lave en simpel padel-turneringsplan med:

- Deltagerliste
- Antal baner
- Kamp-varighed
- Starttid
- Automatisk kampplan

## Kør lokalt

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Åbn derefter i browseren:

- På samme maskine: `http://localhost:8080`
- På telefon på samme netværk: `http://<din-computers-ip>:8080`

Find din IP fx med:

```bash
hostname -I
```

## Deling/hosting

For hurtig intern deling er ovenstående nok.
Hvis du vil have offentlig adgang fra internettet, så deploy appen på fx:

- Netlify (drag-and-drop)
- Vercel
- GitHub Pages

Da appen er ren HTML/CSS/JS, kan den hostes som statiske filer.
