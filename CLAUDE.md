# Life of Colors -- public web app

Standalone web app for the "Life of Colors" puzzle (moved out of Maze Inc., branch `color-rules-2`,
on 2026-10-18). Public repo, deployed to GitHub Pages. The puzzle factory (generation, solver,
analysis) lives in the separate PRIVATE repo `LifeOfColors_factory`; this repo contains only what is
needed to run the app and to receive telemetry. See README.md for the full workflow.

**Player-facing name: "Life of Colors"** in all languages (it was "Sorcerer's Apprentice" /
"Zauberlehrling" / "L'Apprenti sorcier" until 2026-11-10): `app.title` in the locales (home heading,
browser tab via `src/i18n.js`), `index.html` title and meta tags. The sorcerer theme (the look) stays;
it has no "edition" tagline.

## Tech Stack (same as Maze Inc.)

| Concern | Choice |
|---|---|
| App shell | React 18 (Vite 6) |
| Board | Phaser 3 (mounted inside a React component) |
| Styling | Tailwind CSS 3 |
| Text | i18next / react-i18next (en, de, fr); always starts in German (`src/i18n.js`), whatever the browser says |
| Rules | `src/engine/engine.js` -- pure JS, shared by the scene and the tests |
| Telemetry | Supabase (Postgres REST), insert-only, anonymous |
| Tests | Node's built-in test runner (`npm test`), no extra dependency |

## Project Structure

```
src/
  App.jsx                 # screens: Home (castle map) -> Castle (grid) -> Game; ?instance=<name or id> opens one puzzle
  engine/engine.js        # THE rule engine (must match the factory's instance.py exactly), incl. special cells (tap)
  engine/catalog.js       # loads public/catalog/{index,puzzles,level_graph}.json (loadAll, loadLevelGraph)
  engine/castles.js       # the castle hierarchy: instance.site (else ranking cut) -> castles, required stars, unlocking (ANY parent done)
  engine/levelGraph.js    # the level graph (public/catalog/level_graph.json): which castles lead into which
  engine/progress.js      # tried/solved puzzles + best stars + per-castle star counters; saved only after opt-in
  engine/stars.js         # star rating of a win (1-5) from moves and moves_to_win_min
  telemetry/telemetry.js  # anonymous screen-view and puzzle-play telemetry (see privacy rule below)
  game/GameScene.js       # Phaser scene: draws the board, turns taps into engine calls
  hooks/usePhaserGame.js  # Phaser mount/unmount (from Maze Inc., takes width/height/registry/events)
  components/             # HomeScreen (CastleMap: scrollable SVG map of the levels as different sites,
                          # see "Map sites" below), LevelScreen (one castle:
                          # its puzzles as potions in a workshop scene (Workshop, see "Workshop
                          # scenes" below); a castle never shows more puzzles than its scene has places, the
                          # surplus is left out (workshops.js fitToScenes; no tile-grid fallback any more); the
                          # training castle instead: centred title under the Home button, no hint
                          # or puzzle-count line, and a vertical path of bars in the puzzles' colours -- a big title
                          # ("Introduction", then "Day One".."Day Five", levelScreen.days) over the
                          # puzzle's name -- joined by down arrows; won ones with a small medal, the
                          # next one framed and glowing with "Start", later ones faded; at the end one
                          # more arrow and "... and into the wide world ..." (levelScreen.journey, the
                          # notebook's handwriting font), grey at first and more golden with each won
                          # step, plain gold when all are won),
                          # GameScreen (Retry/Back -> back to the level grid; shows the puzzle name), Board, WinCelebration,
                          # ConsentBanner (opt-in for saved progress; the home footer's "opt in/out" link reopens it)
                          # HistoryDialog (home header, circled-arrow button left of "?": the last 20
                          # played puzzles, each opens the puzzle again in its castle; pick = 'grid')
  sites.js                # the places on the home map: which level is which site (castle, forest hut, tavern, ...)
  assets/sites/*.svg      # the sites' pictures: open, locked and their landscape
  wildcards.js            # the wildcards: config (which places, which challenge puzzle) and what a win opens
  workshops.js            # the workshop scenes: which castle shows which picture, where its potions stand,
                          # how each potion looks (no React, tested)
  assets/workshops/*.svg  # the scenes' flat pictures (390 x 844 units)
  theme.js                # all colours
  themes.js               # visual themes (classic, halloween, sorcerer): cell looks, cursor, texts, decorations;
                          # ACTIVE_THEME or ?theme=<name>. Appearance only, never rules/ids/telemetry
                          # Per-game variation: emoji / emojiColor may be lists; drawLook() picks one
                          # each when GameScreen mounts (Retry keeps it), passed to Board as `look`
                          # An object with no emoji (sorcerer potion) is drawn in game/drawnObjects.js
  locales/{en,de,fr}.json # all visible strings
public/catalog/           # GENERATED by the factory (export_catalog.py) -- never edit by hand
schema/instance.schema.json  # the game-instance format (contract with the factory)
telemetry/schema.sql      # Supabase tables + insert-only policies
tests/                    # engine vectors (generated), classic-rule test, catalog validation
.github/workflows/        # ci.yml (tests+build on non-main), deploy.yml (main -> GitHub Pages)
```

## Coding Rules

- **Colors** -- never hardcode colour values; use `src/theme.js` (add named colours there).
- **Strings** -- never hardcode visible text; use `t()` and add keys to all three locale files.
- **Asset paths** -- relative only (the site is served under `/LifeOfColors_game/`). Use
  `import.meta.env.BASE_URL` for files in `public/`.
- **Engine** -- game rules live ONLY in `src/engine/engine.js` (deliberate exception to the Maze Inc.
  rule "game logic lives in the Phaser scene": the rules must be shared with tests and must match the
  factory). Any change to engine behaviour needs matching changes in the factory's `instance.py`, new
  golden vectors, and a new feature tag if it adds a variation.
- **New variations** -- add a feature tag to `SUPPORTED_FEATURES` only when fully implemented and
  tested. Instances whose `requires` contains unknown tags are hidden automatically.
- **Catalog** -- `public/catalog/` and `tests/vectors.json` are written by the factory. Don't edit.
- **Puzzle names** -- the app shows `instance.name` ("Cerulean Gorge"), never the id; the grid tile
  colour is `instance.name_color` (data, so not in theme.js). Name lookups use `normalizeName`
  (lower case, letters/digits only), identical to the factory's `instance_names.normalize_name`.
  Telemetry still sends the id.
- **Telemetry privacy** -- collect nothing personal. Only: random in-memory visit id, app/catalog
  version, env, screens shown (`screen_views`) and per-play game data (`puzzle_plays` snapshots:
  instance, level, pick = how it was chosen, counters, rules, visible-time durations, click list).
  No browser clock times (the database's received_at is the only clock). No
  cookies/localStorage ids, no user agent, screen size, language, location, referrer. Any new field
  must keep this property and must be added to `telemetry/schema.sql` and the factory's `stats_helpers.py`.
- **Best / stars** -- `instance.moves_to_win_min` (not hashed, exported by the factory: the lowest
  number of moves it found; proven minimum when `meta.proven_min_moves`) is shown as "Best: X" in
  the win animation only (not on the game screen); a win gets 1-5 stars from `src/engine/stars.js` `starsForWin` (5 at/below
  the min, 2 at 1.4 x min, linear in between rounded to the nearest star, 1 above), shown in the
  win animation. Missing value -> neither is shown. Stars are not sent to telemetry (derivable from
  moves); `meta` itself is still never read by the app.
- **Saved progress** -- `src/engine/progress.js` is the ONLY code that touches browser storage:
  `loc-storage-consent` (the opt-in answer) and, only while that is 'granted', `loc-progress-v1`
  ({v:2, p:{id: 't' | 0..5}, c:{castle: stars}, h:[id, ...]}: tried, or solved with the best stars; c = the
  per-castle star counters, see Castles; h = recently played ids, newest first, max 20, optional;
  v:1 without c is still read and converted once by seedCastleStars). Nothing is persisted before the
  player says yes (ConsentBanner); "No thanks" deletes saved progress. Without consent progress
  lives in memory for the visit. Total stars = sum of each puzzle's best rating (max 5 each).
  Progress is never sent anywhere (not in telemetry). Every storage access is try/catch: blocked
  storage must never break the game. A new stored field needs the same opt-in.
- **Castles** -- `src/engine/castles.js` + `src/engine/levelGraph.js`, settings in `src/config.js`.
  Since 2026-11-13 the castles and the paths between them come from the **level graph** the factory
  ships next to the catalog: `public/catalog/level_graph.json` (factory `export_level_graph.py`,
  from a graph saved by its `level_graph.ipynb`; don't edit). Node id = castle number (0 = the
  training castle T, ids grow with the graph's layer), `layer` = row on the map, `col` = column,
  every path goes one layer up. `parseLevelGraph` checks it (a broken file is a load error);
  without the file the castles form one line of `CASTLE_COUNT` (`chainGraph`, the old map).
  The catalog has NO levels: castle 0 = every playable instance with `training_position` (in that
  order; played in order, done when all are won); the remaining instances with
  `difficulty_ranking` are cut, in ranking order, into castles 1..n-1 of nearly equal size, in
  castle-number order (so harder puzzles lie further up the map). `assignCastles` sets
  `instance.level` = castle number (app field). Castles 0 and 1 are open from the start; any other
  castle opens when ANY castle with a path into it (its graph parents) is open and its STAR COUNTER
  reaches `UNLOCK_STARS` (20, the same for every castle, independent of its number of puzzles).
  Star counters (engine/progress.js castleStars): each gain in a puzzle's best rating is added to
  the castle it is in at that moment; they never go down and are independent of which puzzles a
  castle holds now (puzzles can move after a new export; their own stars move with them -- the
  switch from 30 castles to the graph's 55 left old counters as they were: no real players yet,
  user decision). The castle screen names what finishing it opens: its graph children (one name,
  or "3 new places": `castles.nextOpen` / `nextOpenMany`, said by the plate's bar hint once the castle is done). When play opens a castle and
  progress is not saved, the consent banner reappears once per visit (`nudge`). Telemetry
  `level` = castle number (= graph node id; the factory keeps a snapshot of every exported graph
  in `exports/level_graphs/<graph_version>.json` to read it), on the castle screen and in a game.
  **Review:** `?map=all` in the URL opens every castle (any build, saves nothing; a note over the
  map says so; the training castle's own order still applies).
- **Start cell switch** -- `src/config.js` `HIDE_START_CELL_IF_NOT_REQUIRED`: puzzles with
  `start_cell_required: false` start all-uncolored (`src/game/startBoard.js`); same id either way.
- **Game screen** -- top row (2026-11-18): 🗺️ (home: back to the map, telemetry reason 'home'),
  Retry, Back -- the picture of the puzzle's place (`sites.js` `siteFor(instance.level)`, its open
  `<site>.svg`; aria-label "Back to <name>", `game.backTo`) -- and an info button (circled "i") that opens the
  rules pop-up (RulesDialog, "How it works"). Below: the puzzle name with its colour tile (no place name) and the moves counter only. No
  goal / rules line under the board; in training the notebook peek starts right at the board's
  lower edge and reaches the screen bottom: the board box takes the board's aspect ratio, the free
  space goes mostly into the notebook (grow 4, 5.5-13rem) and the rest above the board; the
  title label (1.95rem, nearly the cover's width) is the notes' drop target. While the open
  notebook (NotebookOpen) is on screen the closed one is hidden (`hidden`, via `onShown`), so it
  looks like the same notebook opening. An empty open notebook shows only its title; below the last notes row about half a note's
  height stays free above the home-indicator area (safe-area inset). Notes have a 2px frame.
- **Training note animation** -- `components/NoteFlight.jsx`: a new rule observation is circled on
  the board and flies into a note card, which drops into the notebook. The card sits ON the board
  but never over the tapped cell's neighbourhood: in the free space above it, or below when it does
  not fit above (`engine/training.js` `noteCardPlace`, tested). While a note animation runs the
  board takes no taps (GameScreen: a transparent layer over the board), so the next move waits until
  the note has landed. The neighbours' highlight stays on for the whole animation, until the card
  has dropped into the notebook. Every training puzzle uses the phased version (first the coloured
  neighbours are circled and fly to the left side of the rule, then the changed cell is circled and
  flies to the right side).
- **Goal intro** (2026-11-16) -- `GameScene._showGoalIntro(ms)`: the goal object (the crown) blinks
  on the goal field with a pointing hand next to it. Board's `goalIntro` = its length in ms (0 =
  none), decided in GameScreen: the training castle (`INTRO_MS`, 2 s; not when its first puzzle
  opens) and the first `GOAL_INTRO_LEVELS` (3) levels after it, castles 1-3 (`GOAL_INTRO_MS`, 3 s;
  `src/config.js`) -- at every start of a puzzle, also after Retry. It never blocks taps.
- **Training intro** -- `components/TrainingIntro.jsx`: training puzzle 1 (`training.day === 1`)
  opens with four speech bubbles, each right next to what it explains, its arrow pointing at the ring with a
  small space (`ARROW_SPACE`, 6 px)
  (on the board via `noteCardPlace(..., snug = true)`): tap a field (ring around an example cell, `engine/training.js`
  `introExampleCell`), the neighbourhood decides (its neighbours glow inside a dashed frame), the
  goal (ring around the gold-framed cell, the goal object drawn in the text), and the notebook
  (ring around its cover, bubble right above it: observed rules are noted there, then a hint in
  lighter text after a light bulb, `intro.notesHint`). "Next" or a tap on
  the board goes on; the board takes no moves until the last one. Shown each time the puzzle is
  opened, not again on Retry; the scene's blinking-goal intro is skipped there (Board `goalIntro`).
  Texts: `intro.*` in the locales.
- **Win animation** -- `components/WinCelebration.jsx` replaces the former win dialog. How much
  plays depends on the win (`engine/stars.js` `winMode`, tested):
  - `stars` (any win outside the training castle, also without a known best): yellow stars of
    different sizes pop up over the board, get brighter, turn white and evaporate (rising white
    puffs); meanwhile the result box;
  - `full` (5-star win outside the training castle): as `stars`, plus 5 bigger coloured stars
    (`winSparkle1-5`) that twinkle with glints before they fade;
  - `text` (training castle, or reduced motion): only the result box.
  No shake, no lightning (both tried and dropped).
  **New places unlocked** (2026-11-18): when a win brings the castle's star counter to
  `UNLOCK_STARS` (it was below before) and the castle leads to a place that is still locked (App
  `canUnlock`), a copper plate in the workshop plate's copper (medal gradient, edge, ring, rivets)
  comes down on two chains from the top of the screen over the board's upper part, swings to rest,
  says "New places unlocked!" (`win.unlocked`) and goes up again at the end (CSS `win-plate`; the
  whole animation lasts at least 5.6 s then; reduced motion: it just hangs there).
  The result box (translucent, over the board) has no title: the won stars, "New best!", the
  training-complete message, moves and "Best: X". Afterwards only the board is left as it is: the
  scene takes no more taps after a win, and the player goes on with Retry or Back. Random within
  limits, drawn once per win. Colours `win*` in theme.js, keyframes `win-*` in index.css.
- **Wildcards** (2026-11-18) -- a way up for strong players, `src/wildcards.js` (config + pure
  functions, `tests/wildcards.test.js`). `WILDCARDS`: one place on each of the map rows 3, 6, 8
  and 9 (levels 6, 15, 22, 24; row 7's House of the Tulip, level 19, dropped 2026-11-19; row 5's
  Tower of Venus, level 13, moved to row 6's Yurt of the Wind, level 15, 2026-11-19; the upper
  rows only the usual way), each with a fixed challenge
  puzzle (its place's hardest puzzle without special cells, export of 2026-11-13 -- except level 22,
  Argon Castle: Pondering Dune, and level 15, Yurt of the Wind: White Helix, both special puzzles
  chosen by hand 2026-11-19; if an export moves
  it away, `wildcardPuzzle` falls back to the place's hardest one without special cells). While such
  a place is locked the map shows the wildcard -- a playing card with a key and a gold star in each
  corner (`WildcardCard.jsx`) -- at the top right of its picture (no sticky card). Tapping any card
  opens the wildcard scroll (`WildcardScroll.jsx`, parchment with rolled ends, title "Wildcard" in
  every language): the rule (win with the minimum number of moves -- the same as 5 stars; unlimited
  tries) and every wildcard whose place is still locked (picture, name, level; no move numbers). Picking one opens its puzzle (App `playWildcard`, telemetry
  pick 'grid') with "Wildcard try" in orange, tilted, over the puzzle name, and "Need n moves to pass"
  (`wildcard.needMoves`, n = `moves_to_win_min`) over the moves counter. A 5-star win
  (`WILDCARD_STARS`) opens the place and EVERY place on a lower map row (`wildcardOpens`), saved as
  their own list (`engine/progress.js` `recordWildcard`, stored field `w`, same opt-in) -- never as
  stars: opened places are open, not done (`castleStates(..., { opened })`, state `wildcard`), what
  lies above still needs its 20 stars; the puzzle's own stars count as usual. The win shows the
  copper plate with "Wildcard won! Many places unlocked." (`wildcard.won`, one line per sentence);
  a smaller win repeats "Need n moves to pass" in the result box. Back from a
  game whose castle is still locked goes to the map. A path into a wildcard-opened place is drawn
  open once the place it comes from is open. Texts `wildcard.*`, colours `wildcard*` / `scroll*`.
- **Map layout** (2026-11-13) -- `components/CastleMap.jsx` draws the level graph: one band per
  graph row from the bottom (training castle) up, the graph's columns spread over the map's width.
  Inside a band the places are staggered by column (`stagger`: the order of heights that keeps
  neighbouring columns furthest apart, also across bands), so no two places stand at the same
  height and neighbours are at least a picture plus label apart; that sets the band height.
  Then the places are nudged (`components/mapLayout.js` `relax`, tested; worked out once per map
  size, ~100 ms): each may move up to 2/3 of the columns' distance sideways and up to a whole band
  up or down -- but always stays at least `ABOVE` (0.45) bands above every place a path into it
  comes from (or as far as at the start, if that is less) -- wherever that lowers the layout's `badness`: path points inside a building that
  is not one of the path's ends (weighted most), paths that cross, points of two paths on top of
  each other (away from an end they share), buildings too close together (must not happen), and
  how far each place moved. Places go over again and again (sideways first, then up/down) until
  nothing improves. So two places of neighbouring rows may end up side by side (e.g. forest hut
  25 next to forest lodge 24, a user suggestion the optimiser finds by itself since crossings
  count); on the current graph all four counts end at 0. Place
  pictures are 56-72 px (`size`, from the width). The WHOLE map is shown: open places in colour,
  locked ones grey with a padlock (no fog). A path runs between the two places' ground centres (where
  the buildings stand, `foot`) and is paved with rows of near-rectangular stones of different sizes, no
  border line (`components/mapPath.js` `pathStones`: deterministic per path, tested; about 12 px wide,
  two close sand tones `mapPath` / `mapPathAlt`). It is open once the place it leads to is open
  through it (start done, or the path to castle 1), otherwise grey (`mapPathLocked`), faint and
  with stones missing. The places' names are NOT written on the map (since 2026-11-13; the
  open place's name is its button's tooltip and aria-label); a place only gets a badge "★ stars" (✓ when
  done; framed gold / green; never "/20" -- only the training castle shows "✓ won/all") once stars
  were collected there ("…" while it loads); badges are kept inside the map's width. A locked place
  shows its name (bold) and what opens it in a bubble over it, "Get 20 stars in a preceding place
  first" (`castles.lockedHint`): while the mouse is over it or it has the
  focus, and for `HINT_MS` (2.6 s) after a tap -- so locked places are not `disabled` buttons
  (`aria-disabled`). What covers what (2026-11-13), two rules only: (1) layers, bottom to top: grass, what
  lies flat (fields, ponds), paths, everything that stands up, badges; (2) everything that stands
  up -- place pictures, the standing things of their landscapes, the trees below the training
  castle -- is ONE list drawn top-down by its foot (where it touches the ground), so what stands
  lower covers what stands behind it. For that a `<site>-land.svg` has one part per line: `<g data-flat="box">` per flat thing
  and `<g data-foot="y" data-box="box">` per standing thing (`sites.js` `parseLand`, tested;
  boxes measured from the drawing, in the landscape's units); the map draws them inline. Plus one
  rule for flat things: a field or pond is only drawn on free grass -- clear of paths, the
  places' pictures (`SITE_SOLID`: a few boxes per site, one per band of height, measured from
  the drawings), standing things and other flat things, and inside the map --
  else in its mirror image on the other side of its place, then either of them a little higher,
  lower or further out (`SHIFTS`), else not at all (`components/mapClear.js` `placeFlat`,
  tested; lower levels first, the fields below castle 0 last). Standing things are not moved and
  stay even on a path (a tree may stand on one) -- except a group that may go (`data-group` on
  its lines: the manor's `leftGarden` and `rightGarden`): it is left out, all of it, where any of
  it touches a path, so only one side goes (`onAnyPath`). Overlapping paths give way
  (`mapClear.js` `giveWay`, tested): open paths before locked ones, then in graph order; a later
  path drops its stones whose middle lies on an earlier path (within `PATH_HALF`) and is drawn
  under it, so where paths run together there is one paving and a branch starts without a gap. The wizard tower's pond and its three water plants are one
  flat thing (they always move, mirror and disappear together); its own spot is at the tower's
  foot on the north-west side, a little behind the tower: a place's flat things may touch the
  place's own picture and standing things in their drawn spot and its mirror image (`own`,
  `ownSpots`), never anywhere else (tested).
- **Map sites** (2026-11-12) -- on the home map a level is no longer always a castle
  (`src/sites.js`, drawn in `components/CastleMap.jsx`). The training level (castle 0) is a castle;
  levels 1, 2, 3, ... walk through `SITE_ORDER` in a loop: forest hut, spooky tavern, manor, castle,
  wizard's tower, old windmill, yurt, forest lodge (`siteFor`). In the code a level is still a
  "castle" (engine, progress, telemetry: unchanged); a site is only a look and a name. Every level has
  its OWN name (2026-11-16; `sites.js` `siteName(t, castle)`, no level number any more): the k-th
  level of a site takes the k-th name of the site's list in the locales, `siteNames.<site>` (8 each,
  the same length in every language, starting again after the last; tested: no two levels share a
  name): forest hut and forest lodge = gemstone + "Hut" ("Amethyst Hut"; two different gem lists),
  manor and castle = "House of the" + flower, windmill = gas + "Castle" ("Helium Castle"), yurt =
  "Yurt of the Sun / Wind / ...", tavern = short tavern names ("The Bewitched Hen"), wizard's tower
  = "Tower of" + planet. Names are written out per language (articles and cases differ), at most
  24 letters (the workshop title). `sites.*` (the kind of place) is only the fallback; the
  training level stays `castles.tutorial`. The
  same name is used as the workshop's title, in the "to open ..." lines and in the history.
  Pictures in `src/assets/sites/`: `<site>.svg` (open), `<site>-locked.svg` (the same in grey with a
  padlock, windows dark, no smoke) and `<site>-land.svg` (its own bit of landscape: castle and
  windmill fields and trees; manor hedges, statues and clipped trees; forest hut and forest lodge
  firs and bushes; tavern trees and a lit lantern; wizard's tower dead trees and a pond; yurt only
  grass tufts). Flat like the rest of the map, a little magic and spooky, and STILL: no animation
  in any map picture (tested). Only the castle's flag is drawn by the app (its colour changes from
  castle to castle). The random fields and trees remain only below the training castle, where no
  site stands. The pictures come from the same drawing script as the workshop scenes (not in this
  repo).
  **Training ground** (2026-11-19, `components/TrainingGround.jsx`): around the training castle a
  wooden arrow sign on a post points at it (1.3 x 1.2 x its first size), "Training"
  (`castles.trainingSign`) in Mystery Quest (a magic / mystery / fun lettering, BUNDLED like Cinzel:
  npm `@fontsource/mystery-quest`, latin 400, imported in main.jsx; `CHAR_W` = its measured letter
  width). Anchored by its tip, so a longer word grows away from the castle; a word too long for
  the room left of the castle gets a smaller font (`signFont`, not below 14) rather than the
  layout flipping. Everything is on the castle's left / sticks on its right, mirrored only where
  the sticks have no room on the right with a spider (🕷️) hanging on its thread
  (`mapSpiderThread`) from the plank, a big dark-grey (not black) cauldron over a small fire, both
  in a ring of big stones (`mapStone*`, 2 x their first size; the back half behind them, the front half in front), behind and above the sign (not hidden by it), with a copper handle (`wsMedalMid` / `wsMedalEdge`)
  and the end of a big wooden spoon sticking out, only a faint wisp of fumes over it in the win
  animation's style (two small blurred white puffs, `winVapour`; still, no animation),
  in front of the castle (a little to the sign's side) two mirrors drawn like the game's mirror cells (`mirrorLink` frame and
  tint, `mirrorGlint` diagonal glints) standing face to face on wooden stands with an electric
  flash between them (zigzag, glowing); between the sign's post and the left mirror ONE small flask lying on the grass -- the workshop's
  round-bottomed flask (Workshop.jsx `FLASK`, its glass and highlights, no stopper) in orchid
  `mapFlaskPotion` (#DA70D6, one of the puzzles' potion colours) with its potion running out
  into a puddle -- and before the mirrors a bow with three arrows lying around (heads only, no
  fletching: it read as a second head; `mapArrowTip`, `mapBowString`); and on the castle's other side six practice targets: sticks in the ground, spread out irregularly, of different heights,
  some upright, some tilted, each topped with a round wooden disc like a road sign carrying one of the puzzles'
  emojis (🍄 👑 🐸 💎 🐉 🪨), with the game's bomb (💣) lying among them; an orc (the
  puzzles' 🧌, twice the emojis' size) standing in front of the castle between the mirrors and the
  sticks; two small clusters of mushrooms drawn as in the workshop pictures (pale stem, half-round
  cap in red / orange / purple with two white dots; `mapMushroom*`; the two biggest of each were
  taken out again), one by the sign's post, one beyond the sticks (so `STICKS_REACH` includes
  them); and a crooked chimney on the castle's LEFT tower roof (never mirrored, like the castle;
  drawn right after the castle) with smoke in the win animation's style -- blurred puffs, white
  `winVapour` and golden `winStar`, rising and drifting away from the path into a wide cloud
  above the castle's left half (the user's sketch: `SMOKE_SCALE` 2 x, puffs and blur scaled
  together so the texture stays) -- and small stars in it, mostly golden, a few in the win's
  sparkle colours. All are standing things (each stick on its own foot); the castle's
  own fields make way for them. Colours `mapSign*`, `mapCauldron*`, `mapFire*`, `mapBrew*`, `mapSpiderThread`.
  (Tried and dropped: a practice board of emoji cells on the grass; a drawn crow on the sign;
  three small flasks in the cell colours.)
- **Workshop scenes** (2026-11-11, flat look 2026-11-12) -- every castle except the training castle
  picks its puzzles in a sorcerer's workshop instead of a tile grid (`components/Workshop.jsx`, data
  in `src/workshops.js`). Six scenes (hut, cupboard, lab, tower, study, crypt); castle n uses scene
  `(n - 1) mod 6` (`workshopFor`), so neighbouring castles differ. The look matches the home map and
  the game screen: a scene is a FLAT picture `src/assets/workshops/<key>.svg` -- the app's navy wall
  (`gameBg`) with a few lighter wall stones, plain two-tone shapes in the map's and the game's
  colours, no textures, gradients or outlines (a first, painted version with its own fonts was
  dropped as not coherent with the rest of the app) -- plus, in workshops.js, its potion places
  (`slots`), rack rails, flame spots and, for the crypt only, where the motto "Vita Colorum"
  (`levelScreen.cryptMotto`, Latin for "life of colours", the same in every language; drawn as a
  worn inscription by `Motto`: Roman capitals in Cinzel -- the one font the app bundles itself,
  `@fontsource/cinzel`, latin 700 only (the map's training sign bundles Mystery Quest the same way), never from another server -- dark grey `wsMotto` with a
  pale lower edge `wsMottoLight`, rough edges and missing patches (SVG filter) and fixed scratches
  and chipped holes (mask, seeded)) sits (on its stone lintel; the other scenes have no such line).
  A castle with fewer puzzles than its scene has places (since the level graph: about 18 per
  castle) spreads them over the scene (`spreadSlots`: the slots cut into equal runs, one random slot
  per run, seeded by the castle number, puzzles kept in slot order); every other place shows an
  EMPTY test tube (just glass, no stopper, not tappable; `emptySlots`, `EmptyTube`).
  Everything that changes is drawn over the picture as SVG in the picture's 390 x 844 units:
  one potion per puzzle in its `name_color` -- a **test tube for a base puzzle, a round-bottomed
  flask for a special puzzle** (`isSpecial`); solved = copper medal at the neck with the best stars
  (check mark without a rating; drawn 1.6 x, `MEDAL_SCALE`); only opened = stopper off, a little
  vapour now and then; untouched = stoppered. The potions keep their glass, glow and stoppers (the
  only gradients on the screen). Header in the app's own look: the hanging copper plate, in the SAME copper as the potions' medals
  (their gradient `ws-medal`, edge, ring and ink `wsMedal*`; star and number in the medal's ink),
  with the castle's stars (the number only, no "/ required") over a bar that fills towards the next
  castle; the bar stays gold (never green), and once the 20 stars are reached the star and the
  number turn gold too (dark copper outline). No "to open ..." line on the plate: the bar says what it is for in a small bubble under
  the plate, "20 stars needed to open next sites" (`castles.starsNeeded` / `starsNeededMany`; once
  done: `nextOpen` / `nextOpenMany`; `LevelScreen.barHint`), while the mouse is over it or it has
  the focus, and for 2.6 s after a tap. Then the castle title with "Level n" (`levelScreen.level`) under it,
  and 🗺️ (back to the map, `levelScreen.back` as its label) as the game screen's rounded button. The castle title in the
  app's font, the puzzle count, and "Home" as the game screen's rounded button.
  A potion's lean, shift, fill level, stopper (cork, dark cork, wooden plug, wax, linen cap, glass
  ball) and its rare life (bubbles, or a small electric flash) come from its puzzle id
  (`potionLook`, seeded), so a potion looks the same every time. Most potions are still.
  **Picking**: a tapped potion lifts up and comes forward a little (CSS `ws-lift`, drawn in front
  of the rail and its neighbours), and its puzzle opens after `PICK_MS` (520 ms; a slow, short lift: 7 units up, 1.1 x, 420 ms; a stoppered potion is
  unstoppered meanwhile: CSS `ws-unstop`, starting 110 ms after the lift, the stopper pulled up along
  the neck with a small twist and fading out); further taps are
  ignored meanwhile. The lift is the ONLY movement of a pick: no press-in scale on `:active` (it
  grew, shrank back and only then lifted -- the picked potion is drawn anew in front). The glow of a potion reaches over its neighbours and takes no taps.
  In the tower a bat passes outside the window at random times (every 6-30 s, one or two abrupt
  turns, each flight drawn anew; `Bat`, `scene.window`), behind the window's bars.
  No motion at all with "reduce motion" (the puzzle then opens at once).
  The picture is shown whole (never cropped); the rest of the screen is the same navy. In the
  tower some places lie on a table: special puzzles get standing places first (`placePuzzles`).
  A castle never shows more puzzles than its scene has places (34-35): `workshops.js`
  `fitToScenes` (called in App right after `assignCastles`, tested) leaves the surplus out -- the
  last of the pool's ranking order, so the easiest stay -- with a `console.warn`. Left-out puzzles
  are in no castle: not on the screen, not in the counts or the history; `?instance=` still opens
  them. The factory's export should never let it happen (it is only a guard; the former tile-grid
  fallback is gone since 2026-11-16). The pictures and the numbers in workshops.js come from one drawing script (not in
  this repo) -- a new picture needs new numbers. Decoration in the pictures is sparse and simple,
  from a fixed list: mice, spider, roots, toad, mushrooms (the only colourful things besides the
  potions and gold), gold coins, dried herbs, corkscrew, plus candles, a lantern, a retort and
  books (book backs vary: gold strip, gold symbol, dark red stripes, or an unreadable black title;
  symbol and title books with silver stripes of varying width at the top, the bottom or both); no
  skulls. Colours of the live parts: `ws*` in theme.js. Fonts: the app's own (Arial Black) --
  never load fonts (or anything else) from another server; the exceptions in look, Cinzel for the crypt's motto and Mystery Quest for the map's training sign, are bundled with the app (npm `@fontsource/cinzel`, `@fontsource/mystery-quest`).
- **Mobile first** -- portrait phones are the main target; boards up to 9 rows x 6 cols must fit.
- **Special cells** (2026-11-06; schema 1.1, feature tags `special-blocked`, `special-bomb`,
  `special-mirror`, `special-clock`, one entry in `board.special_cells`). CRITICAL: the rules live in
  `engine.js` `tap(inst, state, r, c)` and must stay IDENTICAL to the factory's `instance.py` `tap`
  (which the factory checks against its solver model on every export). `tests/engine.test.js` replays
  the factory's special golden vectors (every tap's event, board and pre-explosion board); never
  edit the vectors or relax that test -- a rule change needs the factory first, then a new export.
  The entry is hashed into the id: a published rule can never change meaning (new behaviour = new
  feature tag). Frozen details: blocked / bomb cells count as uncolored and ignore taps; the bomb goes
  off when a tap turns a neighbour into its `trigger` colour, or on the `taps_to_explode`-th tap on it
  since the last (re)start (earlier taps only warn); going off = Retry (moves reset, the triggering tap
  is no move); mirror: the tapped cell's new colour (from ITS neighbours) goes to both cells, no
  chain; clock: untappable, starts at `cycle[start]` (also with a hidden start cell), steps after
  every tap that changed the board. The scene must call `tap` for every tap -- never `applyClick`
  directly (that is the core rule only).
  - Scene (`GameScene.js`): `this.state` = `{ board, bombTaps, hideStart }` (`startBoard.js`
    `startState`); events `specialTap` (blocked / clock tap: ignored; bomb tap: warning) and `boom`
    (300 ms `BOOM_SHOW_MS` after a colour trigger, with the triggering colour shown; at once for the
    last bomb tap); after a boom the scene takes no taps -- React's Retry remounts it. Drawing:
    blocked = dark hatched hole; bomb = 💣 only (never show the trigger -- the player must find it);
    mirror = frames on both cells, a translucent mirror sheen over each whole cell (tint + diagonal
    glints, the state stays visible) and a dashed straight line between them; clock = the cell bulges out (rounded square + a circle of
    `CLOCK_BULGE` x its half side; the square's corners are rounded (`CLOCK_SQUARE_RADIUS`) so they
    stay hidden inside the circle; a normal uncoloured cell's fill, its outline a little lighter
    (`CLOCK_OUTLINE_LIGHTEN`); a circle of that outline around the active (top) state, its diameter =
    the outer circle's radius (touches the outer circle at the top and the centre at its bottom); an arrowhead on the outer circle at half past 10 (`CLOCK_ARROW_AT`) pointing
    counter-clockwise (the turning direction); drawn above its
    neighbours, may reach over them or off the board) with its cycle's states on a circle (no ring
    line drawn), current state big at the top, the others small and faded, turning
    counter-clockwise one step per move (`CLOCK_TURN_MS`). On `boom` the scene knocks every cell out
    of line (`_wreck`: shifted, tilted, squeezed, overlapping; stepped, not smooth) and the bomb is
    gone: its cell shows black burn traces instead (`_scorch`: ragged charred blotch, soot streaks
    and specks, on ash-grey ground, colours `bombScorch` / `bombSoot` / `bombAsh*`).
  - React (`GameScreen.jsx`, `components/SpecialOverlays.jsx`): a bomb, mirror or clock puzzle
    opens with its explanation (`special.bombIntro` / `mirrorIntro` / `clockIntro`) as one line of
    grey text (`bombTicker`) between two marks (⚠️ / 🪞 / 🕰️, `INTRO_MARKS`) passing from right to
    left, visible only between the outer edges of the board's outer cells, just above the board
    (lifted 0.3 em), twice (`IntroTicker`, `TICKER_PASSES`, 7.8 s a pass, CSS
    `ticker-pass`; each time opened, not on Retry; taps do not stop it, an explosion does; with
    "reduce motion" it stands still for 4.5 s) -- no opening callouts any more; the first tap
    on a blocked / clock cell per screen explains it; each bomb tap shows "Oh, careful!" with 😱 (2 s);
    an explosion = cartoon starburst with BAM drawn into it as letter shapes (SVG paths
    `BAM_LETTERS`, no font, the same in every language; each letter tilted and sized differently),
    the screen trembles only slightly (1-2 px), deliberately jerky (`steps()` in `index.css`, 1 s),
    then the real wrecked board under a grey dust cloud that drifts slowly off the board in one
    direction (`dust-drift`, ~40 s, clipped at the board's edge) with a transparent grey Retry
    button (same as the top Retry). Texts
    `special.*` in all locales (`special.bombIntro` says "objects"; the classic theme says "colors"
    via its `text` map). Colours in `theme.js` (Special cells section). Callouts are positioned from
    the canvas with `cellOnScreen` (they retry until the canvas is laid out).
  - Workshop: a special puzzle is a round-bottomed flask instead of a test tube (see Workshop scenes).
  - Tiles (history dialog, game screen name swatch): a special puzzle's tile has a wavy white border (`SpecialTile` / `isSpecial` in
    `LevelScreen.jsx`, colour `specialTileEdge`) instead of the plain rounded rectangle, so players
    can find the special puzzles. Only the drawing changes; the button keeps the full tile as its
    tap area (the grid has `pt-1` so the top row's waves are not clipped). The same tile is used in
    the history dialog and as the name swatch on the game screen. `isSpecial` = the instance has a
    `board.special_cells` entry.
  - Telemetry unchanged: an explosion is a click with changed = false; the rubble's Retry is the
    normal restart. Saved progress unchanged. Special puzzles are never in the training castle.

## Branching Strategy (as in Maze Inc.)

- `main` -- always stable; every push deploys to GitHub Pages
- `dev` -- integration branch
- `feature/<short-description>` -- one branch per feature

## Phaser + React pattern

- `Board` mounts `Phaser.Game` (scale FIT, internal size = board size) and destroys it on unmount.
- The scene emits `boardClick`, `won`, `specialTap` and `boom` on `game.events`; React owns everything outside the canvas
  (buttons, counters, dialog, telemetry).
- Retry = remount `Board` via a `key` change. Home = unmount.
