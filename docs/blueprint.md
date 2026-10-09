# Speedrun Leaderboard — Project Blueprint

## 1. Project Goal

Build a self-hosted speedrun leaderboard for a single game.

The platform should allow runners to create accounts, submit runs, view leaderboards, and manage their personal run history. Moderators should be able to review submitted runs and approve or reject them.

The project should be simple enough to maintain on a single VPS, while still being structured well enough to expand later.

---

# 2. Recommended Stack

## Backend

**Python + Django**

Why:

- built-in authentication
- built-in admin panel
- ORM for database access
- form validation
- user permissions
- easy deployment
- good fit for a leaderboard-style application

## Database

**PostgreSQL**

Used for:

- users
- categories
- runs
- moderation
- runner profiles
- records
- optional statistics

## Frontend

Recommended first version:

- Django Templates
- Tailwind CSS
- minimal JavaScript

Optional later:

- React
- TypeScript
- frontend component libraries
- separate REST API

For the first version, a separate React frontend is probably unnecessary.

## Hosting

Existing VPS:

```text
VPS
└── Coolify
    ├── Django Application
    └── PostgreSQL Database
```

Optional:

```text
Cloudflare
    │
    ▼
Domain
    │
    ▼
Coolify
    │
    ▼
Django
```

---

# 3. Main Features

## Public Leaderboard

The main page should display the fastest verified runs.

Example:

```text
ANY%

#   Runner        Time          Date
1   PlayerOne     1:42:31.420   Oct 03
2   PlayerTwo     1:43:15.100   Sep 29
3   PlayerThree   1:44:02.880   Sep 20
```

Possible filters:

- category
- subcategory
- platform
- region
- version
- timing method

---

# 4. User Accounts

Users should be able to:

- register
- log in
- log out
- edit their profile
- submit runs
- view their submitted runs
- view their personal bests

Optional profile information:

```text
Username
Display Name
Country
Twitch
YouTube
Discord
Speedrun.com Profile
Bio
```

Avoid requiring unnecessary personal information.

---

# 5. Runner Profiles

Example:

```text
PLAYER PROFILE

RunnerA

Germany

PBs

Any%
1:42:31.420

100%
2:17:11.290

Runs
12

Verified
10

Pending
2
```

A profile could also display:

- personal best history
- submitted runs
- world records
- category rankings

---

# 6. Categories

Since the website only supports one game, categories can be simple.

Example:

```text
Category

Any%
100%
Warpless
Glitchless
Low%
```

Database model:

```text
Category
├── name
├── slug
├── description
├── rules
├── active
└── sort_order
```

---

# 7. Subcategories

Some categories may require additional variables.

Example:

```text
Any%

Platform:
- SNES
- Emulator

Region:
- NTSC
- PAL
- JP

Timing:
- RTA
- IGT
```

Instead of creating dozens of separate categories, these can be handled through category variables.

Example:

```text
CategoryVariable

Platform
├── SNES
├── Emulator

Region
├── NTSC
├── PAL
└── JP
```

This makes the leaderboard much easier to extend.

---

# 8. Run Submission

Users should be able to submit a run.

Example form:

```text
Submit Run

Category:
[Any%]

Time:
01:42:31.420

Date:
2026-10-07

Platform:
SNES

Region:
NTSC

Video:
https://youtube.com/...

Comment:
New PB

[Submit Run]
```

Required fields:

- runner
- category
- time
- date
- video URL

Optional fields:

- comment
- platform
- region
- game version
- timing method
- splits
- notes

---

# 9. Run Status

Every submitted run should have a moderation status.

```text
PENDING
VERIFIED
REJECTED
```

Possible additional status:

```text
OBSOLETE
```

An obsolete run is a previously verified PB that has been beaten by the same runner.

It should not be deleted.

---

# 10. Time Storage

Do not store speedrun times as formatted strings.

Bad:

```text
"1:42:31.420"
```

Better:

```text
6151420 milliseconds
```

Or even:

```text
6151420000 microseconds
```

The application can format the value when displaying it.

Example:

```text
Database:

6151420

Display:

1:42:31.420
```

This makes sorting much easier.

---

# 11. Frames

For games where individual frames matter, optionally store frame information.

Example:

```text
time_ms
frames
fps
```

Or use a high-resolution integer representation.

Example:

```text
time_microseconds
```

This avoids floating-point problems.

---

# 12. Run Model

Conceptually:

```text
Run
├── id
├── runner
├── category
├── time
├── date
├── video_url
├── comment
├── status
├── platform
├── region
├── submitted_at
├── verified_at
├── verified_by
└── rejection_reason
```

Example Django model idea:

```python
class Run(models.Model):
    runner = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE
    )

    time_ms = models.PositiveBigIntegerField()

    run_date = models.DateField()

    video_url = models.URLField()

    comment = models.TextField(
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('verified', 'Verified'),
            ('rejected', 'Rejected'),
        ],
        default='pending'
    )

    submitted_at = models.DateTimeField(
        auto_now_add=True
    )
```

---

# 13. Leaderboard Logic

Basic query:

```python
Run.objects.filter(
    category=category,
    status='verified'
).order_by('time_ms')
```

But there is one important rule:

The leaderboard should normally show only the fastest run per runner.

Example:

```text
RunnerA

1:50:00
1:45:00
1:42:00
```

Leaderboard:

```text
RunnerA — 1:42:00
```

The older runs should still remain in the database.

---

# 14. Personal Best History

Keeping old runs allows you to show PB progression.

Example:

```text
PB HISTORY

Jan 2026     1:55:21
Mar 2026     1:49:12
Jun 2026     1:45:44
Oct 2026     1:42:31
```

This is a very useful feature for a speedrun site.

---

# 15. World Record History

Because all verified runs remain stored, the website can generate WR history.

Example:

```text
WORLD RECORD HISTORY

PlayerA
1:50:12

PlayerB
1:48:02

PlayerA
1:45:31

PlayerC
1:42:31
```

This could later become a dedicated page.

---

# 16. Ties

The ranking system must handle identical times.

Example:

```text
1   RunnerA   1:42:31
1   RunnerB   1:42:31
3   RunnerC   1:43:02
```

Or alternatively:

```text
1
1
2
```

The ranking style should be decided early.

---

# 17. Moderation

Initially, use the built-in Django Admin.

Moderators should be able to:

- view pending runs
- open video links
- verify runs
- reject runs
- add rejection reasons
- edit incorrect metadata
- manage categories

This avoids having to build a custom moderation dashboard immediately.

---

# 18. Roles

Recommended permission levels:

```text
User
Moderator
Admin
```

## User

Can:

- submit runs
- edit profile
- view own submissions

## Moderator

Can:

- verify runs
- reject runs
- edit run information

## Admin

Can:

- manage users
- manage moderators
- manage categories
- change site settings

---

# 19. Rules

Each category should have its own rules page.

Example:

```text
ANY% RULES

Timing starts:
When selecting New Game.

Timing ends:
On the final input before the credits.

Allowed:
- glitches
- resets

Not allowed:
- emulator slowdown
- modified ROMs
```

Rules should ideally be stored in the database so moderators can update them without changing code.

---

# 20. Video Verification

Do not host videos yourself.

Accept links from:

- YouTube
- Twitch
- optionally Streamable or similar services

Example:

```text
video_url
```

Later you could automatically embed supported platforms.

---

# 21. Main Pages

Recommended initial routes:

```text
/
```

Leaderboard.

```text
/categories/
```

Category overview.

```text
/category/any-percent/
```

Category leaderboard.

```text
/submit/
```

Submit run.

```text
/runs/123/
```

Individual run.

```text
/runners/runner-a/
```

Runner profile.

```text
/login/
```

Login.

```text
/register/
```

Registration.

```text
/profile/
```

Account settings.

```text
/rules/
```

General rules.

```text
/admin/
```

Django administration.

---

# 22. Individual Run Page

Example:

```text
RunnerA

Any%

1:42:31.420

Rank
#1

Date
October 7, 2026

Platform
SNES

Region
PAL

Video
[Watch Run]

Status
Verified

Verified by
ModeratorName
```

Optional:

```text
Previous PB
1:43:11

Improvement
39.580 seconds
```

---

# 23. Homepage

The homepage could contain:

```text
GAME TITLE

[Leaderboard]

Current World Record

1:42:31.420
RunnerA

Recent Runs

PlayerA   1:45:21
PlayerB   1:47:13
PlayerC   1:44:58
```

Optional later:

```text
Recent WRs
Active Runners
Run Count
Community Links
```

---

# 24. Search

Eventually add search for:

```text
Runner
Run
Category
```

Not required for the first version.

---

# 25. Statistics

Optional statistics page:

```text
Total runners

Total verified runs

Runs submitted this month

Most active runners

Average completion time

Median completion time
```

Category statistics:

```text
World Record

Average Time

Median Time

Run Count

Runner Count
```

---

# 26. Activity Feed

Optional:

```text
Recent Activity

RunnerA submitted a new Any% PB.

Player2 achieved a new world record.

Player3 submitted their first run.

Moderator1 verified Player4's run.
```

---

# 27. Notifications

Not necessary for version 1.

Possible later features:

```text
Run verified

Run rejected

New WR

Someone passed your leaderboard position
```

Could initially be website-only notifications.

Email notifications can be added later.

---

# 28. API

Do not build an API first unless needed.

Later you could expose:

```text
GET /api/leaderboard/

GET /api/runners/

GET /api/runs/

GET /api/categories/
```

Example:

```json
{
  "rank": 1,
  "runner": "RunnerA",
  "time_ms": 6151420,
  "time": "1:42:31.420"
}
```

Useful later for:

- Discord bots
- OBS overlays
- external websites
- statistics
- stream overlays

---

# 29. Discord Integration

Potential future feature:

```text
New verified run:

RunnerA
Any%
1:42:31.420
New World Record

Watch:
youtube.com/...
```

This could be sent automatically through a Discord webhook.

---

# 30. Security

Basic requirements:

- Django CSRF protection
- secure passwords
- rate limiting
- email verification if necessary
- validate submitted URLs
- limit text lengths
- prevent HTML injection
- secure admin accounts
- HTTPS only

Django already handles many of these concerns.

---

# 31. Anti-Spam

Eventually consider:

- rate limits
- CAPTCHA for registration
- email verification
- submission limits

For a small community, this may not initially be necessary.

---

# 32. Backups

Important because leaderboard history should not be lost.

Back up:

```text
PostgreSQL database
```

At least:

```text
Daily database backup
```

Preferably retain multiple versions.

Example:

```text
7 daily backups
4 weekly backups
```

---

# 33. Deployment

Recommended setup:

```text
GitHub Repository
        │
        ▼
      Coolify
        │
        ├── Django
        │
        └── PostgreSQL
```

Workflow:

```text
Local development
      │
      ▼
git push
      │
      ▼
GitHub
      │
      ▼
Coolify deploy
```

---

# 34. Environment Variables

Never store secrets directly in GitHub.

Example:

```text
SECRET_KEY=
DATABASE_URL=
DEBUG=false

ALLOWED_HOSTS=

CSRF_TRUSTED_ORIGINS=
```

Optional later:

```text
DISCORD_WEBHOOK_URL=
EMAIL_HOST=
EMAIL_PASSWORD=
```

---

# 35. Development Environment

Recommended local setup:

```text
Python

Django

PostgreSQL

VS Code

Git

GitHub

Docker optional
```

During early development, SQLite could be used locally.

However, using PostgreSQL locally as well avoids database-specific differences.

---

# 36. Repository Structure

Example:

```text
speedrun-leaderboard/

├── manage.py
│
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
│
├── users/
│   ├── models.py
│   ├── views.py
│   └── urls.py
│
├── runs/
│   ├── models.py
│   ├── views.py
│   ├── forms.py
│   └── urls.py
│
├── leaderboard/
│   ├── views.py
│   └── urls.py
│
├── moderation/
│
├── templates/
│
├── static/
│   ├── css/
│   ├── js/
│   └── images/
│
├── requirements.txt
│
├── Dockerfile
│
└── README.md
```

---

# 37. Core Database Relationships

```text
User
 │
 └──── RunnerProfile
 │
 └──── Run
          │
          ├──── Category
          │
          └──── VerifiedBy → User
```

Potential expanded version:

```text
User
├── RunnerProfile
└── Run
     ├── Category
     ├── Platform
     ├── Region
     ├── Variables
     └── Verification
```

---

# 38. Minimum Viable Product

Version 1 should only contain:

```text
✓ Account registration

✓ Login

✓ Runner profiles

✓ Categories

✓ Leaderboard

✓ Run submission

✓ YouTube/Twitch links

✓ Pending runs

✓ Moderator verification

✓ Rejected runs

✓ Personal Best detection

✓ Django Admin

✓ PostgreSQL

✓ VPS deployment

✓ HTTPS
```

That is enough for a real usable leaderboard.

---

# 39. Version 2

After the basic leaderboard works:

```text
PB history

WR history

Advanced leaderboard filters

Runner statistics

Category statistics

Run comments

Better moderator interface

Discord notifications

Search

Country flags

Profile customization
```

---

# 40. Version 3

Possible advanced features:

```text
REST API

Discord bot

OBS leaderboard overlay

Live race support

Run comparisons

Split uploads

Automatic statistics

Achievements

Runner rankings

Seasonal leaderboards

Tournament integration
```

---

# 41. Things Not to Build Initially

Avoid these at the beginning:

```text
Separate React frontend

Microservices

Redis

WebSockets

Custom authentication system

Self-hosted video

Complex notification system

Mobile app

Native desktop application

Advanced API

Real-time leaderboards
```

None of these are required for the core project.

---

# 42. Suggested Development Order

## Phase 1 — Setup

```text
1. Create GitHub repository
2. Create Django project
3. Connect PostgreSQL
4. Configure environment variables
5. Create basic layout
```

## Phase 2 — Data Models

```text
6. Create Category model
7. Create Run model
8. Create Runner Profile model
9. Create migrations
10. Configure Django Admin
```

## Phase 3 — Leaderboard

```text
11. Create leaderboard query
12. Display category leaderboard
13. Implement PB filtering
14. Implement rankings
15. Handle ties
```

## Phase 4 — Accounts

```text
16. Registration
17. Login
18. Logout
19. Profile pages
20. Account settings
```

## Phase 5 — Run Submission

```text
21. Submission form
22. Validate time
23. Validate video link
24. Create pending run
25. Show submission status
```

## Phase 6 — Moderation

```text
26. Pending run list
27. Verification
28. Rejection
29. Moderator notes
30. Record verifier
```

## Phase 7 — UI

```text
31. Tailwind setup
32. Leaderboard design
33. Profile design
34. Run page
35. Responsive mobile design
```

## Phase 8 — Deployment

```text
36. Dockerfile
37. Push to GitHub
38. Create Coolify project
39. Add PostgreSQL
40. Add environment variables
41. Connect domain
42. Enable HTTPS
43. Run migrations
44. Create admin account
```

## Phase 9 — Testing

```text
45. Test registration
46. Test run submission
47. Test verification
48. Test rankings
49. Test ties
50. Test PB replacement
51. Test rejected runs
52. Test permissions
```

---

# 43. First Realistic Milestone

The first milestone should be:

```text
User registers
        ↓
User submits run
        ↓
Run becomes Pending
        ↓
Moderator opens Django Admin
        ↓
Moderator verifies run
        ↓
Run automatically appears on leaderboard
```

Once that workflow works, the core application is finished.

Everything else is an improvement.

---

# 44. Recommended Architecture

For this specific project:

```text
┌──────────────────────────────┐
│          Browser             │
└──────────────┬───────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────┐
│            Django            │
│                              │
│  Templates                   │
│  Authentication              │
│  Leaderboard                 │
│  Run Submission              │
│  Moderation                  │
│  Admin                       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│         PostgreSQL           │
│                              │
│ Users                        │
│ Runs                         │
│ Categories                   │
│ Profiles                     │
│ Verification                 │
└──────────────────────────────┘
```

Hosted as:

```text
VPS
└── Coolify
    ├── leaderboard-web
    └── leaderboard-postgres
```

---

# 45. Final Scope Recommendation

Start with:

```text
ONE GAME
     │
     ├── Categories
     │
     ├── Runner Accounts
     │
     ├── Run Submission
     │
     ├── Verification
     │
     ├── Leaderboards
     │
     └── Runner Profiles
```

Do not try to recreate Speedrun.com.

Build a better, focused leaderboard for one specific community.

That keeps the application small enough to finish while still giving it enough depth to become a serious full-stack project.
