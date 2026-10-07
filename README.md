# Yoshi’s Island leaderboard — visual prototype

A responsive, browser-only exploration of the leaderboard. All seeded runners, times, and records are fictional samples, not actual community records.

## Preview

With Node.js installed:

```sh
npm start
```

Open http://127.0.0.1:4173. No installation or build step is required.

## Included

- Nine categories grouped as 100% (No Major Glitches, No Restrictions); All Main Stages (Warpless, Warps, Magical Journey); and Any% (Credits Warp, Beat Bowser, No ACE, Reverse Boss Order).
- Combined SNES and emulator leaderboards, RTA stored as integer milliseconds, and competition ranking (1, 1, 3).
- Best verified run per runner, region filtering, runner search, profiles, and full verified run history.
- Run details and draft category rules.
- Submission form with time and video URL validation, local submission history, and demo verification/rejection controls.
- Demo names and submissions persist in browser localStorage. Use **Reset demo** to clear them.
- Dark/light mode follows the system preference until selected with the header toggle. The selection persists in browser localStorage.

## Boundaries

This is a visual prototype, not the Django implementation. Demo names are not authenticated. Moderation controls have no real permissions. There is no backend, real account system, database, deployment, or video associated with sample runs. The date is fixed to October 7, 2026 for the prototype. Official category rules and precise timing boundaries have not been defined.

The frontend uses native HTML, CSS, and JavaScript with an original decorative SVG landscape. It can later be adapted into Django templates. PostgreSQL and Coolify are planned for the working application.
