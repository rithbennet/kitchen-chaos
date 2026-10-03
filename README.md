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

Run `npm run build` to create a Cloudflare Workers ESM artifact in `dist/`. Game sources are in `public/`; server routes are in `worker/`. The build embeds the vendored game assets in the Worker and includes the generated D1 migrations. Sites provisions the `DB` binding and applies migrations during deployment. No third-party API keys or CDN are needed.

`npm run dev` serves the game and a local SQLite-backed leaderboard through Vite; local test records are isolated in the ignored `.sites-runtime/` folder. Production scores live in D1. Generate future schema migrations with `npm run db:generate` and inspect their SQL before publishing. Applied migrations must remain unchanged.

Current deployment: https://kitchen-chaos-harith.rithbennet.chatgpt.site

## Controls

- Any tool: hold or swipe a body part or loose item to grab it; release to fling. Short taps use the selected tool. Detached limbs remain draggable.
- Punch: tap a body part. Repeated hits detach limbs; further hits can destroy a loose part into debris.
- Bomb: tap to drop a timed bomb with radial blast impulses.
- Pan, Bottle, Rolling pin: tap to throw. Bottles shatter on strong impacts and nearby blasts, scattering physical glass. Glass that hits a buddy can remain attached to that body part.
- Egg / Gelato: tap to throw. Eggs leave physical shells and yolk; gelato splashes pink cream. Blood and food decals attach to body parts, while droplets mark the floor. Effects have time and count limits.
- Scores: enter a public player name to save a personal best and join the shared top 25. A secure, HttpOnly guest cookie remembers this browser; names do not grant access to another player. Saving is automatic every 10 seconds, with an explicit Save score button and retry states. Google sign-in is not configured.
- Repair buddies: restore all selected buddies and their limbs, removing attached glass, blood, food splatters and loose fragments.
- Both: select both buddies to share the room and collide with each other.
- Reset kitchen: restore cookware and clear the current score. Saved personal bests remain.
- Keyboard: 1–8 select tools, Space punches, B drops a bomb, R repairs the buddies.

## Implementation

Three.js handles rendering. Cannon-es handles gravity, articulated joints, collision response, impulses, and dragging. Models, materials, lighting, effects, and audio are constructed at runtime. The character designs are inspired by the supplied toy-like reference.

Third-party licenses are retained in `public/vendor/THREE-LICENSE.txt` and `public/vendor/CANNON-LICENSE.txt`.

## Validation

Run `npm test` for physics and real SQLite-backed API regression checks. Scores are client-reported with server validation and session-bound writes; this is a casual leaderboard, not an authoritative anti-cheat system. Clearing browser cookies or changing devices creates a new guest player.


Physics and game logic were checked for simultaneous buddies, limb detachment and destruction, dragging from every tool, short-tap weapon use, glass shattering and attachment, repair cleanup, fragment limits, explosions, blood and food effects, egg collisions, score ranking, name validation, cookie authorization, repeated/concurrent saves, and resetting. The available preview browser had WebGL disabled, so visual rendering and actual phone performance remain unverified.
