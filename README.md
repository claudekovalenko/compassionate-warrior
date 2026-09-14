# Compassionate Warrior

A small installable web app (PWA) for the Compassionate Warrior men's group. It lives on your phone's home screen, works offline, and keeps everything on your own device.

**Meetings:** Mondays, 1:45 – 3:45 PM Pacific
**Group:** KP (leader), Ivan, Kellen, Chris, Franklin

## What it does

- **Home** – countdown to the next meeting, this week's homework checklist, and quick links to this week's commitment and FASTER check-in.
- **Homework** – the assignment for each week (seeded with Week 1: Chapter 1, *The Divine Paradox of the Compassionate Warrior*, plus the FASTER Scale and Commitment to Change tools). Check items off; add or edit weeks as the group moves through the workbook.
- **Commitments** – write your Commitment to Change each week. It is saved and logged by week so you can look back, and the following week you mark how it went (kept / partly / missed) with notes.
- **FASTER** – a weekly check-in on the FASTER Scale (Restoration → Forgetting priorities → Anxiety → Speeding up → Ticked off → Exhausted → Relapse), with the signs for each stage and a history of past check-ins.
- **More** – pick your name, install instructions, export / import a JSON backup, erase data.

There is no server and no login. Data is stored in the browser's `localStorage` on each phone. Use *Export backup* to keep a copy or move to a new phone.

## Running it

It is plain HTML, CSS and JavaScript with no build step. Serve the folder over HTTP (service workers need `http://localhost` or HTTPS):

```sh
npx http-server -p 8080 .
# then open http://localhost:8080
```

## Deploying

The included GitHub Actions workflow (`.github/workflows/pages.yml`) publishes the repo root to GitHub Pages on every push to `main`. Turn on Pages in the repository settings (Settings → Pages → Source: GitHub Actions) once, then the site is available at `https://<user>.github.io/compassionate-warrior/`. All paths in the app are relative, so it also works from any other static host.

## Installing on a phone

- **iPhone (Safari):** open the site, tap Share, then *Add to Home Screen*.
- **Android (Chrome):** open the site, then use *Install app* on the More tab or *Add to Home screen* in the browser menu.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell and bottom tab bar |
| `app.js` | All app logic: routing, storage, weeks, commitments, FASTER, backup |
| `styles.css` | Styling, light and dark mode |
| `sw.js` | Service worker: caches the app shell for offline use |
| `manifest.webmanifest` | PWA manifest (name, icons, colors) |
| `icons/` | App icons (SVG source plus PNG renders) |

To change the group, meeting time, or first-meeting date, edit the constants at the top of `app.js`.

The FASTER Scale content is adapted from Michael Dye's *The Genesis Process*.
