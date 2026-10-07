# Yoshi’s Island leaderboard — visual prototype

A responsive, browser-only exploration of the leaderboard. All seeded runners, times, and records are fictional samples, not actual community records.

## Preview

With Node.js installed:

```sh
npm start
```

Open http://127.0.0.1:4173. No installation or build step is required.

## Public hosting

The GitHub Pages workflow in `.github/workflows/pages.yml` checks, tests, builds, and publishes the prototype on each push to `main`. Enable GitHub Pages with **GitHub Actions** as the source in the repository's Pages settings. Run `npm run build` locally to copy the six public assets into `dist/`.

GitHub Pages is configured for `yoshi.sumof.best`. In the Hetzner DNS zone for `sumof.best`, set a `CNAME` record named `yoshi` to `florianhoelzel.github.io.`. Keep the root domain's records unchanged. After DNS validates and GitHub provisions a certificate, enable **Enforce HTTPS** in the repository's Pages settings. Custom domains for this Actions workflow are configured in Pages settings; no repository `CNAME` file is required.

The existing Sites deployment remains linked through `.openai/hosting.json` and requires a separate Sites publication to update.

Visitors see fictional sample records. Demo submissions, names, and moderation changes are stored in each browser and are not shared between visitors.

## Included

- Default frontpage with three rounded boxes: welcome, the five latest verified runs across categories, and a news empty state. Run times open details, runner names open profiles, and category links open their boards.
- Nine categories grouped as 100% (No Major Glitches, No Restrictions); All Main Stages (Warpless, Warps, Magical Journey); and Any% (Credits Warp, Beat Bowser, No ACE, Reverse Boss Order).
- Individual levels: 54 stages from [speedrun.com/yi/levels](https://www.speedrun.com/yi/levels), grouped into six worlds with stages 1–8 and an extra stage per world. Individual Levels appears below Any% in the sidebar categories, with expandable world lists containing each level. World, level, and Any% / 100% navigation supports direct links and browser history. Level boards share the submission, verification, profile, filtering, and ranking flow. Level records remain fictional sample data; no live records are imported.
- Combined SNES and emulator leaderboards, RTA stored as integer milliseconds, and competition ranking (1, 1, 3).
- Best verified run per runner, region filtering, runner search, profiles, and full verified run history.
- Run details and draft category rules.
- Submission form with time and video URL validation, local submission history, and demo verification/rejection controls.
- Demo names and submissions persist in browser localStorage. Use **Reset demo** to clear them.
- Dark/light mode follows the system preference until selected with the header toggle. The selection persists in browser localStorage.

## Boundaries

This is a visual prototype, not the Django implementation. Demo names are not authenticated. Moderation controls have no real permissions. There is no backend, real account system, database, or video associated with sample runs. The date is fixed to October 7, 2026 for the prototype. Official category rules and precise timing boundaries have not been defined.

The frontend uses native HTML, CSS, and JavaScript with an original decorative SVG landscape. It can later be adapted into Django templates. PostgreSQL and Coolify are planned for the working application.
