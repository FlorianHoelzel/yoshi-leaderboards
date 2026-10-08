# Yoshi’s Island leaderboard — visual prototype

A responsive, browser-only exploration of the leaderboard. Mock records are imported from the supplied yi_all_runs.csv export. They are a static fixture, not a live leaderboard.

## Preview

With Node.js installed:

```sh
npm start
```

Open http://127.0.0.1:4173. No installation or build step is required.

## Public hosting

The GitHub Pages workflow in `.github/workflows/pages.yml` checks, tests, builds, and publishes the prototype on each push to `main`. Enable GitHub Pages with **GitHub Actions** as the source in the repository's Pages settings. Run `npm run build` locally to copy the public assets into `dist/`.

GitHub Pages is configured for `yoshi.sumof.best`. In the Hetzner DNS zone for `sumof.best`, set a `CNAME` record named `yoshi` to `florianhoelzel.github.io.`. Keep the root domain's records unchanged. After DNS validates and GitHub provisions a certificate, enable **Enforce HTTPS** in the repository's Pages settings. Custom domains for this Actions workflow are configured in Pages settings; no repository `CNAME` file is required.

The existing Sites deployment remains linked through `.openai/hosting.json` and requires a separate Sites publication to update.

Visitors see the same CSV-derived mock records. Demo submissions, names, and moderation changes are stored in each browser and are not shared between visitors.

## Included

- Leaderboards open by default, with Full game and Individual levels navigation. Rules opens from the top-right corner of each board.
- Nine categories in collapsed sidebar menus ordered All Main Stages (Warpless, Warps, Magical Journey); 100% (No Major Glitches, No Restrictions); and Any% (Credits Warp, Beat Bowser, No ACE, Reverse Boss Order).
- Individual levels: 54 stages from [speedrun.com/yi/levels](https://www.speedrun.com/yi/levels), grouped into six worlds with stages 1–8 and an extra stage per world. Individual Levels appears below Any% in the sidebar categories, with a collapsed world menu. World, level, and Any% / 100% navigation supports direct links and browser history. Level boards share the submission, verification, profile, filtering, and ranking flow. Level records come from the supplied CSV mock fixture; no runtime API requests are made.
- Combined platform leaderboards including SNES, emulator, and VC, RTA stored as integer milliseconds, and competition ranking (1, 1, 3).
- Best verified run per runner, profiles, and full verified run history.
- Stats page with verified run counts (total, full game, and individual levels), unique players, and cumulative RTA including historical submissions. Category-selectable world record progression uses strict improvements in date order, with the fastest verified run per day, combined SNES/emulator records, keyboard-accessible chart points, list view, and CSV export. Statistics use the mock fixture plus locally verified demo submissions. Undated records count toward totals but are excluded from record progression.
- Run details with embedded YouTube videos and Twitch VODs/clips, plus category and level rule dialogs summarizing the published speedrun.com rules, with source links.
- Submission form with seconds-only time autofill (24.123 → 0:24.123), aligned date/time fields, a themed calendar picker, video URL validation, local submission history, and demo verification/rejection controls.
- Demo names and submissions persist in browser localStorage.
- Dark/light mode follows the system preference until selected with the header toggle. The selection persists in browser localStorage.

## Boundaries

This is a visual prototype, not the Django implementation. Demo names are not authenticated. Moderation controls have no real permissions. There is no backend, real account system, or database. Imported mock runs retain their supplied video links. The date is fixed to October 7, 2026 for the prototype. Category requirements, timing boundaries, and restrictions are summarized from the speedrun.com category and Run Type APIs, checked October 7, 2026. This prototype keeps platform boards combined and uses integer-millisecond RTA.

The frontend uses native HTML, CSS, and JavaScript with an original decorative SVG landscape. It can later be adapted into Django templates. PostgreSQL and Coolify are planned for the working application.

## Removable mock data

All mock runs live in `mock-data.js`, loaded before `app.js`. The application never writes them to localStorage; browser submissions remain separate under `yoshi-visual-prototype-v1`. The previous fictional records are kept only as a test fixture.

- Disable all mock records by setting `enabled: false` at the top of `mock-data.js`.
- Permanently remove them by deleting `mock-data.js` and removing its script tag from `index.html`. The app starts with empty boards and retains local submissions. The build automatically excludes a deleted fixture and removes its previously built copy.
- Regenerate with `npm run mock:import -- "path/to/yi_all_runs.csv" --resolve`. This reads public speedrun.com API run metadata at import time; the site itself stays static. Without `--resolve`, ambiguous full-game records are skipped.

The CSV omits category variables. Full-game boards are resolved by run ID using the actual Run Type values, not guesses from category names or times. The source Platform variable identifies VC (`yn2jx2e8=21g5jw8l`); SNES and emulator still share boards. Original hardware labels and API values are retained in each mock record for traceability. Unresolved records are skipped. Missing run dates remain unknown; submitted/verified dates are not substituted. Source statuses are preserved, with `new` converted to `pending`; only verified records rank. Times are rounded from seconds to integer milliseconds.

This snapshot includes 2,441 of the CSV's 2,442 runs, including 156 VC runs. One rejected run (`zxvv8eky`) has no runner name and is omitted. All 35 missing run dates remain unknown.
