# PR 23 — My places: sub remaining + Add apps.

Kitchen stills from Hub (Vite + system Chrome, `scripts/capture-ux-pr-23.mjs`). Not placeholders.

- Theme: daup-theme cream / terracotta / forest
- Desktop 1280×1100 · mobile 390×844 @2x
- Thumb: **My places · Apps · You · Other places**
- Kitchen doors only. No peer, DID, MCP, node, or licensed ids on chrome.

## What this pack shows

1. **My places** cards show the monthly choice (PLACE_SUB **R199 a month for this place.** + hosted **R299 hosted seed.** and **R498 a month.**) and time remaining (**N days left on trial.** / **Renews in N days.**).
2. **Place detail** — **Add apps.** multi-select of apps not yet on this place. One place may run more than one app.
3. **Already on this place.** — enabling an app already on the place is disabled / no-op. Never a second Eatery or Project.

Meters stay #22: **R199** a month for this place. · **R299** hosted seed. · **R0** hosted seed. when on this premises. Remaining is stubbed from `trial_ends_at`, else `trial_started + 30d`, else the next 30-day cycle when paid.

## Remaining period

| Status | Copy |
| --- | --- |
| Trial | *12 days left on trial.* |
| Paid (active) | *Renews in 18 days.* |

Stub renew date: `trial_ends_at` or `trial_started_at + 30d`. After that date, paid places use the next 30-day boundary. No live checkout (G).

## my-places-desktop.png

![My places card with sub choice and remaining — desktop](my-places-desktop.png)

After **See your apps**. Owned list.

- **Your places.** The Olive · Stellenbosch · LIVE
- *R199 a month for this place.*
- *R299 hosted seed.*
- *R498 a month.*
- *N days left on trial.*
- terracotta **Open.**

## my-places-mobile.png

![My places card with sub choice and remaining — mobile 390](my-places-mobile.png)

Same doors stacked. **Open.** is a 48px terracotta tap.

## place-add-apps-desktop.png

![Place detail Add apps. — desktop](place-add-apps-desktop.png)

**Open.** on The Olive.

- **Apps** Eatery LIVE **Open.**
- **Add apps.** multi-select
- Eatery door **Already on this place.** (disabled)
- Project / Farm / Reseller / Maker / Chat pickable
- terracotta **Add apps.**

## place-add-apps-mobile.png

![Place detail Add apps. — mobile 390](place-add-apps-mobile.png)

Same chips stacked. Already-on Eatery stays disabled.

## already-on-place-desktop.png

![Already on this place. after adding Project — desktop](already-on-place-desktop.png)

After adding Project.

- Apps: Eatery + Project
- Both doors **Already on this place.**
- Confirm **Add apps.** quiet until another app is picked

## already-on-place-mobile.png

![Already on this place. after adding Project — mobile 390](already-on-place-mobile.png)

Same already-on doors.

## Copy check

Doors scanned in these stills:

- **R199 a month for this place.** / **R299 hosted seed.** / **R498 a month.**
- **N days left on trial.** / **Renews in N days.**
- **Add apps.**
- **Already on this place.**
- protocol words stay off doors
