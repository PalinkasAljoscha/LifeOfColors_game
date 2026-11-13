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
//   <g data-foot="y" data-box="x0 y0 x1 y1" data-group="name">...</g>
//       one thing that stands up (a tree, a hedge, a statue, ...); y is where it touches the
//       ground, which decides what it stands in front of and behind. data-group (optional) makes it
//       part of a group that may go: the whole group is left out where any of it touches a path
//       (the manor's garden, its left and its right side)
// The boxes are what each part covers, in the landscape's units (measured from the drawing).
// No React and no image imports here, so the tests can load it.

export const TRAINING_SITE = 'castle'
export const SITE_ORDER = ['forestHut', 'tavern', 'manor', 'castle', 'wizardTower', 'windmill', 'yurt', 'forestLodge']

export const SITE_BOX = { x: -110, y: -165, w: 220, h: 180 }
// What each site's picture really covers (open or locked; the castle with its flag), in the same
// units: a few boxes [x0, y0, x1, y1], one per band of height (measured from the drawings, so a
// tower's narrow body is not a wide block). Nothing flat is put there.
export const SITE_SOLID = {
  castle: [[37, -141, 57, -117], [-39.2, -117, 57, -105], [-45, -105, 45, -93], [-53.2, -93, 53.2, -69], [-50, -69, 50, -9], [-62, -9, 62, 15]],
  forestHut: [[-0.5, -105, 41.8, -93], [-4.2, -93, 49.2, -81], [-43.5, -81, 56.5, -69], [-50.8, -69, 61, -57], [-55, -57, 64.2, -45], [-60.2, -45, 71.5, -33], [-63.8, -33, 71, -21], [-70.8, -21, 80.2, 3], [-57.8, 3, 57.8, 15]],
  forestLodge: [[35.5, -153, 46.5, -141], [32, -141, 50, -129], [24.8, -129, 48.5, -117], [26, -117, 43.8, -105], [26, -105, 62.8, -93], [-58.8, -93, 70, -81], [-66, -81, 77.2, -69], [-72.2, -69, 78.8, -57], [-74, -57, 85, -45], [-82.2, -45, 90.2, -33], [-79.2, -33, 88.5, -21], [-90.8, -21, 99.8, 3], [-63.5, 3, 63.5, 15]],
  manor: [[-10.2, -129, 10, -105], [-38, -105, 9.8, -93], [-38, -93, 36, -81], [-36, -81, 64.5, -69], [-46.5, -69, 73.2, -57], [-50, -57, 68.8, -45], [-46, -45, 61.5, -33], [-46, -33, 57, -9], [-66, -9, 66, 15]],
  tavern: [[20, -153, 38, -141], [12.8, -141, 37.5, -129], [13, -129, 31.8, -117], [17, -117, 30.8, -105], [-14, -105, 28, -93], [-23.8, -93, 25.8, -81], [-33.5, -81, 34.5, -69], [-43.2, -69, 44, -57], [-44, -57, 54, -45], [-38.5, -45, 54, -21], [-46, -21, 29.2, -9], [-60, -9, 60, 15]],
  windmill: [[11.2, -117, 27.5, -105], [-40.2, -105, 27, -93], [-45.8, -93, 23.2, -81], [-46, -81, 19.2, -69], [-17.2, -69, 32, -57], [-21.2, -57, 46, -45], [-25, -45, 42.2, -33], [-27.5, -33, 16.5, -21], [-18, -21, 18, -9], [-50, -9, 50, 15]],
  wizardTower: [[-6.5, -165, 11, -129], [-13.8, -129, 16.5, -117], [-21.5, -117, 24.8, -105], [-28, -105, 30, -93], [-24, -93, 26, -69], [-11.2, -69, 29, -57], [-12.8, -57, 26, -33], [-14.5, -33, 16.5, -9], [-46, -9, 46, 15]],
  yurt: [[-6, -69, 6, -57], [-18.2, -57, 48.2, -45], [-31.5, -45, 48.2, -33], [-49.2, -33, 48.2, -21], [-56, -21, 48.2, -9], [-58, -9, 58, 15]],
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
const PROP_LINE = new RegExp(`^<g data-foot="(${NUM})" data-box="${BOX}"(?: data-group="(\\w+)")?>(.*)</g>$`)

/** A landscape file's parts: { flats: [{ box, svg }], props: [{ foot, box, group, svg }] } in the
 *  file's order -- flats lie flat, props stand up; box = [x0, y0, x1, y1] and foot = the y where it
 *  touches the ground, in the landscape's units; group = its group's name or null; svg = its
 *  markup. Throws on any other line. */
export function parseLand(text) {
  const flats = [], props = []
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    // the frame, and metadata a tool may add (content credentials): not part of the drawing
    if (/^<svg[^>]*>$/.test(line) || line === '</svg>' || /^<metadata>.*<\/metadata>(<\/svg>)?$/.test(line)) continue
    const flat = line.match(FLAT_LINE), prop = line.match(PROP_LINE)
    if (flat) flats.push({ box: flat.slice(1, 5).map(Number), svg: flat[5] })
    else if (prop) props.push({ foot: Number(prop[1]), box: prop.slice(2, 6).map(Number), group: prop[6] ?? null, svg: prop[7] })
    else throw new Error(`landscape: a line that is neither flat nor a standing thing: ${line.slice(0, 60)}`)
  }
  return { flats, props }
}
