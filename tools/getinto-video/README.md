# Get Into: guides and the animation engine

Every Get Into guide is one Markdown file in `_getinto/`. Its front matter drives
the card on `/getinto/`, the guide page, the popup, and the animation.

## Add a guide

1. Copy `_includes/getinto-guide-template.md` to `_getinto/<slug>.md` (or start
   from a `status: soon` stub that's already there). Fill in the front matter
   (3 to 5 pillars, author, `author_bio`, headshot in `assets/getinto/authors/`)
   and the body. Set `status: live` and `player: /getinto/player/getinto-<slug>.html`.
2. Build the site player (needs Node 18+; sound needs `ffmpeg` and `python3` + `numpy`):
   ```sh
   cd tools/getinto-video && npm install && cd ../..
   node tools/getinto-video/build.mjs _getinto/<slug>.md --site --out getinto/player
   ```
   Commit `getinto/player/getinto-<slug>.html`, `.mp3`, and the shared
   `getinto-engine.js`. Regenerate whenever the pillars change.
3. Commit and push. Pages builds the card, the page, and the popup.

Social cuts: `node tools/getinto-video/build.mjs _getinto/<slug>.md --out .getinto-out`
writes a 1920x1080 and a 1080x1920 MP4 with sound (needs `npx playwright install chromium`;
the Playwright package and its Chromium build must match).

Where the videos live: the landscape cut goes on YouTube and into the Get Into playlist.
Put its link in the guide's front matter as `youtube: https://www.youtube.com/watch?v=...`
and the guide page and popup show a "Watch the video" link under the player. The playlist
link on `/getinto/` is `getinto_playlist` in `_config.yml`. The portrait cut is for
Instagram and TikTok. Copies of both cuts are kept in `getinto/video/` as
`getinto-<slug>-landscape.mp4` and `getinto-<slug>-portrait.mp4`: they are served at that
URL for direct use, but no page links to them.

## Rules

- Match the site: reuse `style.css` tokens, Figtree body, JetBrains Mono for brand,
  labels and numbers. Check dark and light.
- Mobile first. No em dashes in copy.
- Don't touch `episode-prep/` or `tools/lock-prep.mjs`.

## Engine notes

- v2 is 2.5D: Three.js draws the slab stack, grid, glow and camera; a DOM layer on
  top carries the text so type stays crisp. Colors are the site tokens.
- Each step holds for `words / 3.2 + 0.9` s (3.0 to 5.5 s) after its text lands, so
  length follows the copy. Tune in `src/timeline.js`.
- `renderAt(t)` fully defines a frame (no CSS animations, timers or `Math.random()`
  in the stage), which keeps MP4 renders exact.
- Modes: `?render&format=` (video), `?embed[&format=]` (site iframe), none (standalone).
  The page drives the player with
  `postMessage({type:'getinto', format, cmd:'play'|'pause'|'toggle'|'restart'|'next'|'prev', seek, muted, volume})`.
