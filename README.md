# Compassionate Warrior

A small installable web app (PWA) for the Compassionate Warrior men's group. It lives on your phone's home screen, works offline, and keeps everything on your own device.

**Meetings:** Mondays, 1:45 – 3:45 PM Pacific
**Group:** KP (leader), Ivan, Kellen, Chris, Franklin

## What it does

- **Home** – countdown to the next meeting, this week's homework checklist, and quick links to this week's commitment and FASTER check-in.
- **Homework** – the assignment for each week (seeded with Week 1: Chapter 1, *The Divine Paradox of the Compassionate Warrior*, plus the FASTER Scale and Commitment to Change tools). Check items off; add or edit weeks as the group moves through the workbook.
- **Commitments** – write your Commitment to Change each week. It is saved and logged by week so you can look back, and the following week you mark how it went (kept / partly / missed) with notes. Once you join the group, a *Mine / The brothers* toggle shows what the other men committed to.
- **FASTER** – a weekly check-in on the FASTER Scale (Restoration → Forgetting priorities → Anxiety → Speeding up → Ticked off → Exhausted → Relapse), with the signs for each stage, the group's check-ins for the week, and a history of your own.
- **More** – pick your name, join the group, install instructions, export / import a JSON backup, erase data.

## Sharing with the group

Each phone saves entries locally first, so the app works with no signal. When you enter the
group passcode under **More → Join the group**, commitments, FASTER check-ins and the homework
list also sync to Supabase, and everyone else's come back. The Home tab then shows a roster of
who has posted a commitment and where each man is on the scale this week.

Conflicts resolve last-write-wins per entry, deletes propagate, and personal homework tick marks
stay on your own phone. Sync runs when the app opens, after each save, when you switch tabs with
data older than 30 seconds, every two minutes while open, and when the phone regains signal.

If you reinstall the app, pick your name and enter the passcode: your own past entries are
recognised by name and come back as yours, editable.

### How the data is protected

The Supabase URL and publishable key are in `sync.js`, which is fine on a public page: the
`cw_*` tables have row level security enabled with **no policies**, so that key alone reads
nothing. Every read and write goes through the `cw_sync` Postgres function, which is
`SECURITY DEFINER` and checks a bcrypt hash of the group passcode before it touches a row.
A wrong passcode gets a deliberate delay to slow down guessing.

The passcode is deliberately **not** in this repository. KP shares it with the group, and any
member can rotate it under **More → Change passcode**, which asks everyone to re-enter the new
one once. Exported backup files leave the passcode out too.

Because the group chose a short, memorable passcode, the gate is also throttled: capitals and
stray spaces are ignored so it is hard to mistype, and once 25 wrong attempts pile up in fifteen
minutes further guesses are refused outright. The check runs before the throttle, so the real
passcode always works and nobody can lock the group out by hammering the endpoint.

Because the content is personal, treat the passcode like a house key. Anyone who has it can read
the group's entries.

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
| `app.js` | All app logic: routing, storage, weeks, commitments, FASTER, group sync, backup |
| `sync.js` | Supabase connection and the wire format for shared entries |
| `styles.css` | Styling, light and dark mode |
| `sw.js` | Service worker: caches the app shell for offline use |
| `manifest.webmanifest` | PWA manifest (name, icons, colors) |
| `icons/` | App icons (SVG source plus PNG renders) |

To change the group, meeting time, or first-meeting date, edit the constants at the top of `app.js`.
The database schema lives in the Supabase project as the `compassionate_warrior_group_sync`
migration: tables `cw_group`, `cw_commitments`, `cw_checkins`, `cw_weeks` and the functions
`cw_sync` and `cw_set_passcode`.

The FASTER Scale content is adapted from Michael Dye's *The Genesis Process*.
