# Kitchen Chaos

A mobile-friendly 3D ragdoll kitchen sandbox with male and female buddies together or individually, breakable limbs, punches, timed bombs, drag-and-fling controls, shattering bottles, blood particles and splatters, gelato, breakable eggs, a shared leaderboard, throwable cookware, slow motion, and optional sound.

## Run locally

Requires Node.js 22.13+ (Node.js 24 recommended for the local SQLite leaderboard).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The game requires a browser with WebGL 2 support.

## Hosting

Deploy directly to the personal Cloudflare account for `harith.bennett@gmail.com`. `wrangler.jsonc` binds the `kitchen-chaos` Worker to that account and its `kitchen-chaos-leaderboard` D1 database. Game sources in `public/` are served by Workers Static Assets; only `/api/*` requests invoke the Worker in `worker/`. Model and texture files can be added to `public/` without embedding them into JavaScript. No paid add-ons or third-party API keys are required.

```sh
npx wrangler login
npx wrangler whoami
npm test
npm run build
npm run db:migrate:remote
npm run deploy
```

`npm run build` validates and bundles the Worker into `dist/` without publishing it. `npm run deploy` publishes directly with Wrangler; ChatGPT Sites is no longer involved in deployment. Keep the account and database IDs in `wrangler.jsonc` pointed at the intended account. For another account, create a new D1 database and update both IDs before applying migrations or deploying.

`npm run dev` serves the game and a local SQLite-backed leaderboard through Vite; local test records are isolated in the ignored `.sites-runtime/` folder. Production scores live in D1. Generate future schema migrations with `npm run db:generate` and inspect their SQL before publishing. Applied migrations must remain unchanged.

To test the actual Workers runtime locally, run `npm run db:migrate:local`, then `npm run dev:worker`. Its local D1 data is separate from Vite's SQLite database and is ignored under `.wrangler/`.

The deployment uses Workers, Static Assets, and D1 free-tier allowances. Static assets bypass the Worker; score autosaves are batched once a minute, while explicit saves, resets, and page exits can save sooner. No subscription upgrade is performed by these scripts.

Current deployment: https://kitchen-chaos.harith-bennett.workers.dev

Previous deployment: https://kitchen-chaos-harith.rithbennet.chatgpt.site. The three public leaderboard entries were copied when moving accounts. Guest cookies are tied to their original domain, so previous players must create a new guest player on this domain; imported scores remain as historical records. Google sign-in is not configured yet.

## Controls

- Any tool: hold or swipe a body part or loose item to grab it; release to fling. Short taps use the selected tool. Detached limbs remain draggable.
- Punch: tap a body part. Repeated hits detach limbs; further hits can destroy a loose part into debris.
- Bomb: tap to drop a timed bomb with radial blast impulses.
- Pan, Bottle, Rolling pin: tap to throw. Bottles shatter on strong impacts and nearby blasts, scattering physical glass. Glass that hits a buddy can remain attached to that body part.
- Egg / Gelato: tap to throw. Eggs leave physical shells and yolk; gelato splashes pink cream. Blood and food decals attach to body parts, while droplets mark the floor. Effects have time and count limits.
- Scores: enter a public player name to save a personal best and join the shared top 25. A secure, HttpOnly guest cookie remembers this browser; names do not grant access to another player. Saving is automatic every 60 seconds, with an explicit Save score button and retry states. Google sign-in is not configured.
- Repair buddies: restore all selected buddies and their limbs, removing attached glass, blood, food splatters and loose fragments.
- Both: select both buddies to share the room and collide with each other.
- Reset kitchen: restore cookware and clear the current score. Saved personal bests remain.
- Keyboard: 1–8 select tools, Space punches, B drops a bomb, R repairs the buddies.

## Implementation

Three.js handles rendering. Cannon-es handles gravity, articulated joints, collision response, impulses, and dragging. Models, materials, lighting, effects, and audio are constructed at runtime. The character designs are inspired by the supplied toy-like reference.

Third-party licenses are retained in `public/vendor/THREE-LICENSE.txt` and `public/vendor/CANNON-LICENSE.txt`.

## Validation

Run `npm test` for physics and real SQLite-backed API regression checks. Scores are client-reported with server validation and session-bound writes; this is a casual leaderboard, not an authoritative anti-cheat system. Clearing browser cookies or changing devices creates a new guest player.


All 13 physics and SQLite API regression tests passed during the Cloudflare migration. The local Workers runtime and live deployment were checked for static asset delivery, guest sessions, secure cookies, D1 score writes, best-score preservation, ranking, invalid scores, and cross-origin rejection. All three imported scores matched the previous leaderboard. Browser checks confirmed WebGL 2 initialization, keyboard punching and score changes, and leaderboard loading on the live domain. Screenshot capture was unavailable in the collaborative browser, so visual layout and actual phone performance remain unverified.
