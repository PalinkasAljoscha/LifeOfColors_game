// Homepage decorations of a theme (src/themes.js `decorations`). Purely visual: never clickable,
// hidden from screen readers, emoji only (so no colours here; recoloured emojis via <Emoji>).
//   slot 'background'  fixed behind the content: only in the free corners and the top bar on
//                      phones; extra pieces left and right of the content column on wide screens
//   slot 'footer'      a small row in the page flow, above the privacy note

import { Emoji } from './Emoji.jsx'

const HALLOWEEN = {
  background: () => (
    <>
      {/* content column (all screens): cobwebs in two corners, moon and bats in the top bar */}
      <div className="relative mx-auto h-full max-w-md">
        <span className="absolute -top-3 -left-3 text-7xl opacity-25 -rotate-12">🕸️</span>
        <span className="absolute -bottom-4 -right-4 text-8xl opacity-15 rotate-[160deg]">🕸️</span>
        <span className="deco-moon absolute top-2 left-[30%] text-3xl md:hidden">🌕</span>
        <span className="deco-bat absolute top-4 left-[46%] text-lg opacity-80">🦇</span>
        <span className="deco-bat absolute top-1 left-[56%] text-sm opacity-60" style={{ animationDelay: '-3s' }}>🦇</span>
      </div>
      {/* wide screens only: left and right of the content column */}
      <div className="hidden md:block">
        <span className="deco-moon absolute top-16 left-[9%] text-8xl">🌕</span>
        <span className="deco-bat absolute top-52 left-[17%] text-4xl opacity-80">🦇</span>
        <span className="deco-bat absolute top-24 right-[12%] text-3xl opacity-70" style={{ animationDelay: '-2s' }}>🦇</span>
        <span className="deco-bat absolute top-72 right-[20%] text-2xl opacity-60" style={{ animationDelay: '-4.5s' }}>🦇</span>
        <span className="deco-spider absolute top-0 right-[8%] flex flex-col items-center opacity-80">
          <span className="block w-px h-48 bg-white/30" />
          <span className="text-4xl -mt-1">🕷️</span>
        </span>
        <span className="absolute bottom-8 left-[10%] text-7xl opacity-80">🎃</span>
        <span className="absolute bottom-6 left-[19%] text-4xl opacity-60">🎃</span>
        <span className="absolute bottom-10 right-[11%] text-5xl opacity-70">👻</span>
      </div>
    </>
  ),
  footer: () => (
    <div className="flex justify-center items-end gap-3 mb-3 text-2xl">
      <span>🎃</span><Emoji e="🍬" className="text-xl opacity-80" /><span className="text-3xl">🎃</span>
      <span className="text-xl opacity-80">👻</span><span>🎃</span>
    </div>
  ),
}

const SORCERER = {
  background: () => (
    <>
      {/* content column (all screens): moon, sparkles and an owl in the top bar, stars in two corners */}
      <div className="relative mx-auto h-full max-w-md">
        <span className="deco-moon absolute top-2 left-[30%] text-3xl md:hidden">🌙</span>
        <span className="deco-twinkle absolute top-3 left-[46%] text-lg">✨</span>
        <span className="deco-twinkle absolute top-1 left-[58%] text-sm opacity-70" style={{ animationDelay: '-1.5s' }}>✨</span>
        <span className="absolute -top-2 -left-2 text-6xl opacity-20 -rotate-12">⭐</span>
        <span className="absolute -bottom-3 -right-3 text-7xl opacity-15 rotate-12">🔮</span>
      </div>
      {/* wide screens only: left and right of the content column */}
      <div className="hidden md:block">
        <span className="deco-moon absolute top-16 left-[9%] text-8xl">🌙</span>
        <span className="deco-bat absolute top-52 left-[17%] text-4xl opacity-80">🦉</span>
        <span className="deco-twinkle absolute top-24 right-[12%] text-4xl">✨</span>
        <span className="deco-twinkle absolute top-72 right-[20%] text-2xl opacity-70" style={{ animationDelay: '-2s' }}>✨</span>
        <span className="deco-twinkle absolute top-40 left-[24%] text-xl opacity-60" style={{ animationDelay: '-3.2s' }}>⭐</span>
        <span className="absolute bottom-8 left-[10%] text-7xl opacity-80">📜</span>
        <span className="absolute bottom-6 left-[19%] text-4xl opacity-70">🍄</span>
        <span className="absolute bottom-10 right-[11%] text-6xl opacity-80">🔮</span>
        <Emoji e="drawn:potion" className="absolute bottom-6 right-[20%] text-4xl opacity-70" />
      </div>
    </>
  ),
  footer: () => (
    <div className="flex justify-center items-end gap-3 mb-3 text-2xl">
      <span>🪄</span><span className="text-xl opacity-80">✨</span><span className="text-3xl">👑</span>
      <span className="text-xl opacity-80">✨</span><span>🪄</span>
    </div>
  ),
}

const DECORATIONS = { halloween: HALLOWEEN, sorcerer: SORCERER }

export default function ThemeDecorations({ name, slot = 'background' }) {
  const Deco = DECORATIONS[name]?.[slot]
  if (!Deco) return null
  if (slot === 'background') {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
        <Deco />
      </div>
    )
  }
  return <div className="pointer-events-none select-none" aria-hidden="true"><Deco /></div>
}
