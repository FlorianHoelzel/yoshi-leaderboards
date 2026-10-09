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
- Combined SNES/emulator leaderboards with separate VC boards, RTA stored as integer milliseconds, and competition ranking (1, 1, 3).
- Best verified run per runner for each category and platform board, profiles, and full verified run history. Platform tabs select SNES (including emulator) or VC on full-game and individual-level boards, with the selection in direct links.
- Runner profiles include a summary, ranked personal-best cards, full-game / individual-level and platform filters, dated PB progression with a chart and accessible table, and verified history paginated in groups of ten. Returning from run details restores the profile view and filters. Undated runs remain in PBs and history but are excluded from progression.
- Run dates include the year. Displayed times omit `.000` but retain nonzero milliseconds; stored RTA precision is unchanged. Countries appear only when known; no generic runner subtitle is shown.
- Stats page with verified run counts (total, full game, and individual levels), unique players, and cumulative RTA including historical submissions. Category- and platform-selectable world record progression uses strict improvements in date order, with the fastest verified run per day, combined SNES/emulator records, keyboard-accessible chart points, list view, and CSV export. Statistics use the mock fixture plus locally verified demo submissions. Undated records count toward totals but are excluded from record progression.
- Run details with embedded YouTube videos and Twitch VODs/clips, plus category and level rule dialogs summarizing the published speedrun.com rules.
- Submission form with seconds-only time autofill (24.123 → 0:24.123), aligned date/time fields, a themed calendar picker, video URL validation, local submission history, and demo verification/rejection controls.
- Demo names and submissions persist in browser localStorage.
- Dark/light mode follows the system preference until selected with the header toggle. The selection persists in browser localStorage.

## Boundaries

This is a visual prototype, not the Django implementation. Demo names are not authenticated. Moderation controls have no real permissions. There is no backend, real account system, or database. Imported mock runs retain their supplied video links. The date is fixed to October 7, 2026 for the prototype. Category requirements, timing boundaries, and restrictions are summarized from the speedrun.com category and Run Type APIs, checked October 7, 2026. This prototype keeps SNES/emulator boards combined and VC separate and uses integer-millisecond RTA.

The frontend uses native HTML, CSS, and JavaScript with an original decorative SVG landscape. It can later be adapted into Django templates. PostgreSQL and Coolify are planned for the working application.

## Removable mock data

Imported mock runs live in `data/mock-runs.json`. The build and optional local server turn this JSON into a browser fixture. Browser submissions remain separate under `yoshi-visual-prototype-v1`; the fictional records are used only by tests.

- Disable mock records by setting `"enabled": false` in the JSON file.
- Remove them by deleting `data/mock-runs.json`. Builds and the local server supply an empty fixture automatically; no HTML changes are required.
- Regenerate with `npm run mock:import -- "path/to/yi_all_runs.csv" --resolve`. This reads public speedrun.com API metadata at import time; the site stays static. Without `--resolve`, ambiguous full-game records are skipped.

See [data/README.md](data/README.md) for the record contract and import lifecycle.

The CSV omits category variables. Full-game boards are resolved by run ID using the actual Run Type values, not guesses from category names or times. The source Platform variable identifies VC (`yn2jx2e8=21g5jw8l`); SNES and emulator still share boards. Original hardware labels and API values are retained in each mock record for traceability. Unresolved records are skipped. Missing run dates remain unknown; submitted/verified dates are not substituted. Source statuses are preserved, with `new` converted to `pending`; only verified records rank. Times are rounded from seconds to integer milliseconds.

This snapshot includes 2,441 of the CSV's 2,442 runs, including 156 VC runs. One rejected run (`zxvv8eky`) has no runner name and is omitted. All 35 missing run dates remain unknown.

## Project layout

`public/` contains the site entry point and browser assets. `data/` contains the imported JSON snapshot. `scripts/` contains build, preview, validation, and import tools. `tests/` contains behavior and build checks, with fictional data in `tests/fixtures/`. `docs/blueprint.md` describes the planned backend.

Browser code is grouped by responsibility:

- `public/assets/js/domain/`: levels, categories, rules, timing, and ranking/progression queries. Ranking queries take explicit run collections.
- `public/assets/js/data/store.js`: imported records, local submission loading, and persistence.
- `public/assets/js/app.js`: navigation, view state, rendering, charts, dialogs, and event handling.
- `public/assets/js/theme.js`: early theme initialization.
- `public/assets/css/` and `public/assets/images/`: styles and visual assets.

The HTML script order loads domain definitions before storage and the application. Native scripts keep the site dependency-free. `scripts/lib/assets.js` gives the build and local server the same public asset list; only `public/` and the generated mock fixture are published. `dist/` is disposable build output.

Run `npm run check`, `npm test`, and `npm run build` to validate changes.
