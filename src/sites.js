// SITES -- the places on the home map (components/CastleMap.jsx).
//
// The levels are still "castles" in the code (engine/castles.js), but on the map each one is a
// different place: the training level is a castle, levels 1, 2, 3, ... walk through SITE_ORDER and
// start again. A site is only a look and a name (locales `sites.<key>`); rules, unlocking and
// telemetry do not know about it.
// Pictures: src/assets/sites/<key>.svg (open), <key>-locked.svg (grey, with padlock) and
// <key>-land.svg (the bit of landscape around it), all flat like the rest of the map and still
// (no animation). The site pictures use the box x -110..110, y -165..15 and the landscape
// x -145..145, y -105..75, in units of size / 100 around the middle of the site's ground line.
// No React and no image imports here, so the tests can load it.

export const TRAINING_SITE = 'castle'
export const SITE_ORDER = ['forestHut', 'tavern', 'manor', 'castle', 'wizardTower', 'windmill', 'yurt', 'forestLodge']

export const SITE_BOX = { x: -110, y: -165, w: 220, h: 180 }
export const LAND_BOX = { x: -145, y: -105, w: 290, h: 180 }

/** The site of a level (castle number): 0 = the training castle, then SITE_ORDER in a loop. */
export function siteFor(castle) {
  const n = Math.trunc(castle)
  if (!(n >= 1)) return TRAINING_SITE
  return SITE_ORDER[(n - 1) % SITE_ORDER.length]
}
