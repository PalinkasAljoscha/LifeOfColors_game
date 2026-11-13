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
// A landscape file has one part per line (parseLand reads it; the map draws them in different
// layers, see CastleMap.jsx):
//   <g data-flat="x0 y0 x1 y1">...</g>
//       one thing that lies flat on the ground (a field, a pond): under the paths, and only drawn
//       where it is clear of everything else (or in its mirror image on the other side)
//   <g data-foot="y" data-box="x0 y0 x1 y1">...</g>
//       one thing that stands up (a tree, a hedge, a statue, ...); y is where it touches the
//       ground, which decides what it stands in front of and behind
// The boxes are what each part covers, in the landscape's units (measured from the drawing).
// No React and no image imports here, so the tests can load it.

export const TRAINING_SITE = 'castle'
export const SITE_ORDER = ['forestHut', 'tavern', 'manor', 'castle', 'wizardTower', 'windmill', 'yurt', 'forestLodge']

export const SITE_BOX = { x: -110, y: -165, w: 220, h: 180 }
// What each site's picture really covers (open or locked; the castle with its flag), in the same
// units: [x0, y0, x1, y1]. Nothing flat is put there.
export const SITE_SOLID = {
  castle: [-62, -131, 62, 11],
  forestHut: [-70.8, -97.5, 80.5, 11],
  forestLodge: [-90.8, -143, 99.8, 11],
  manor: [-66, -122, 73.2, 11],
  tavern: [-60, -153, 60, 11],
  windmill: [-50, -112.2, 50, 11],
  wizardTower: [-46, -159.8, 46, 11],
  yurt: [-58, -63, 58, 11],
}
export const LAND_BOX = { x: -145, y: -105, w: 290, h: 180 }

/** The site of a level (castle number): 0 = the training castle, then SITE_ORDER in a loop. */
export function siteFor(castle) {
  const n = Math.trunc(castle)
  if (!(n >= 1)) return TRAINING_SITE
  return SITE_ORDER[(n - 1) % SITE_ORDER.length]
}

const NUM = '-?\\d+(?:\\.\\d+)?'
const BOX = `(${NUM}) (${NUM}) (${NUM}) (${NUM})`
const FLAT_LINE = new RegExp(`^<g data-flat="${BOX}">(.*)</g>$`)
const PROP_LINE = new RegExp(`^<g data-foot="(${NUM})" data-box="${BOX}">(.*)</g>$`)

/** A landscape file's parts: { flats: [{ box, svg }], props: [{ foot, box, svg }] } in the file's
 *  order -- flats lie flat, props stand up; box = [x0, y0, x1, y1] and foot = the y where it
 *  touches the ground, in the landscape's units; svg = its markup. Throws on any other line. */
export function parseLand(text) {
  const flats = [], props = []
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    // the frame, and metadata a tool may add (content credentials): not part of the drawing
    if (/^<svg[^>]*>$/.test(line) || line === '</svg>' || /^<metadata>.*<\/metadata>(<\/svg>)?$/.test(line)) continue
    const flat = line.match(FLAT_LINE), prop = line.match(PROP_LINE)
    if (flat) flats.push({ box: flat.slice(1, 5).map(Number), svg: flat[5] })
    else if (prop) props.push({ foot: Number(prop[1]), box: prop.slice(2, 6).map(Number), svg: prop[6] })
    else throw new Error(`landscape: a line that is neither flat nor a standing thing: ${line.slice(0, 60)}`)
  }
  return { flats, props }
}
