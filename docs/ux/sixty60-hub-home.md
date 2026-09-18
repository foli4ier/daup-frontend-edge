# Sixty60 hub lock

Signed-in **app.daup.co.za** lands on **Places**. Cream / terracotta / forest only — `daup-theme` tokens.

Home was removed: it duplicated Places (**Open.** / **+ Register**) and Apps (**Get apps.**).

## Hierarchy

1. **Place context** — house name, city, email. No Advanced, Profile, or Log off.
2. **Places (default)** — **Your places.** with **Open.** when a house is live, or **+ Register** when there is none. **On the chain.** sits under the bound place.
3. **Get apps.** — LIVE: Eatery, EatOut, Project. Held app: **Open.** only (terracotta). Not held: one **Get.** as primary. Never Get.+Open. together. Project **Open.** is `https://project.daup.co.za` — or `/d/hub?token=` when Hub already has email + house (same owner arrival as Eatery; see `src/hub/projectUrls.ts`).
4. **Thumb nav** — Places / Apps / You

Protocol stays off this surface. **You.** holds visible **Log off.**, then **Settings.** (**Register a new house.** / **Delete the house.** / **Ask for an enhancement.**), then Advanced.

## Empty

No house: *No house on this hub yet.* plus **+ Register**. Register stays as that empty CTA only — not a loose **Register a new house.** link on a populated Places pane.

## Money and dates

Where money or dates show: **R** and day-first (`14 Dec 2023`). Empty country defaults to Rand.

## Gate (logged out)

Full-viewport cream. Desktop island 640px. **Open your hub.** is a 48px primary. **I have a staff invite** is a 48px outline secondary.

![Signed-in home desktop](sixty60-home-desktop.png)
![Signed-in home mobile](sixty60-home-mobile.png)
![Empty home](sixty60-home-empty.png)
![Empty home mobile](sixty60-home-empty-mobile.png)
![You pane](sixty60-you.png)
![Email gate desktop](sixty60-gate-desktop.png)
![Email gate mobile](sixty60-gate-mobile.png)
