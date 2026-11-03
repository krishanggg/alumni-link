# Product

## Platform

Native Windows/WAMP administrator web portal with a companion Android alumni app

## Users

**Primary: Approved alumni** of a participating school — graduates who want to stay connected to their school and batchmates after leaving. Their job: find and reconnect with classmates through a privacy-respecting directory, keep up with school announcements and events, view reports the school has chosen to share, and keep their own profile current. In this client delivery they use the companion Android app; the web portal does not expose the alumni experience.

**Secondary: School staff who keep that experience trustworthy** — a School Admin (one per school, operational scope limited to their own school's alumni, batches, reports, announcements, and registration approvals) and a single Super Admin (cross-school access; the only role that manages schools, user accounts, and backups). Their job is data stewardship — reviewing self-registrations, correcting records, publishing reports and announcements — in service of alumni having something worth returning to, not as the product's own end goal.

## Product Purpose

AlumniLink keeps a school's alumni connected to their school and to each other after graduation, through a directory, announcements, and published reports alumni can trust. That trust is maintained by an admin-run approval and record-keeping workflow underneath: self-registered accounts are reviewed before they can appear in or use the directory, and privacy tiers control exactly what each alumnus exposes to classmates.

Success looks like: alumni can find and reconnect with batchmates, self-registrations get timely admin review instead of sitting unapproved, and each school's data stays accurate and properly scoped as more schools and cohorts are added.

## Positioning

AlumniLink is a **multi-school SaaS platform**, not a bespoke single-institution build: many schools run their alumni programs on one system, each with server-enforced, school-scoped admin access and alumni data, under a single cross-school Super Admin tier. A single-tenant alumni tool could not truthfully claim to host multiple independent schools' alumni communities with that isolation guarantee built into the authorization model itself, not layered on as configuration.

## Operating Context

Core workflow: public self-registration with school selection → account starts `pending` → admin review (with possible-duplicate matching against existing alumni) → approval moves the account to alumni-safe access, or rejection lets the alumnus edit and resubmit. Once approved, alumni browse a privacy-filtered directory, see school- and batch-scoped announcements, and view reports their school has explicitly published to alumni.

School Admins run this workflow, plus batch tracking, report generation, and announcements, for exactly one school. The Super Admin additionally manages schools, user accounts, cross-school reporting, and system backups — the only account with cross-school reach.

This client delivery ships the buildable administrator browser frontend source
plus its compiled SPA against the Laravel API. `setup.bat` builds it into
`backend/public/app`; Apache serves that output, while administrator browser
authentication uses Laravel session cookies and CSRF protection. The alumni
experience is intentionally mobile-only in this package, and native mobile
source remains outside this client package.

## Capabilities and Constraints

- Alumni directory privacy has three tiers — `public`, `limited`, `private` (default `limited`) — but contact information (email, phone, address, birthdate, student ID) is never exposed to alumni at any tier; `public` and `limited` differ from `private` only in whether the profile appears in the directory at all.
- Reports are admin-only by default. Publishing a report to alumni requires an alumni-safe template that strips contact and audit fields; report lifecycle is `draft → published → archived/deleted`, with unpublished reports auto-archived after 90 days.
- Backups are Super-Admin-only, system-generated only — no arbitrary SQL upload/restore.
- Auth is deliberately split by platform: the admin web portal uses Laravel session cookies + CSRF; the alumni mobile app uses Sanctum personal access tokens (30-day expiry, no refresh — re-login required).
- Dashboard stats are near-real-time (cache up to 5 minutes), not push/websocket-driven; announcements refresh on app-open/dashboard-load/foreground-return/tab-focus, not in real time.
- v1 scope is frozen — feature scope, alumni access breadth, privacy rules, and auth/report/backup semantics are explicit, locked product decisions, not implementation details open to reinterpretation.
- Terminology: `super_admin` / `school_admin` / `alumni` roles; alumni account states `pending` / `rejected` / approved; report states `draft` / `published` / `archived` / `deleted`; announcement states `draft` / `published` / `expired` / `archived`.

## Brand Commitments

Product name: **AlumniLink**. Visual identity (palette, type, motion, and elevation) is part of the compiled browser application and is not a client installation concern.

## Evidence on Hand

No real pilot school, alumni data, institutional logos, or testimonials are committed yet. Design and content work must use realistic but clearly generic placeholder schools/names/data and must not fabricate a specific real institution, logo, or testimonial as if it were confirmed.

## Product Principles

1. **Privacy is enforced server-side per tier, not styled away in the UI.** Contact information never reaches an alumni-facing surface regardless of platform or privacy tier — this is an authorization guarantee, not a display choice.
2. **Every admin capability is scoped to exactly one school unless the actor is the single Super Admin.** Cross-school data leakage is treated as a security bug, not a missing filter.
3. **Multi-school is structural, not incidental.** Every workflow assumes more than one institution can be operating on the system simultaneously with fully isolated data.
4. **Alumni-facing mobile access is the client delivery surface.** The Android app reads the same admin-curated, privacy-filtered data as the admin portal's publishing workflows, refreshed on lifecycle events rather than realtime infrastructure.
5. **The v1 spec is frozen.** Product decisions here are locked; design work should not imply features, access, or workflows broader than what's specified without an explicit change request.

## Accessibility & Inclusion

Motion respects `prefers-reduced-motion` and `prefers-contrast`/`forced-colors: active`. Browser controls retain accessible focus states and touch targets.
