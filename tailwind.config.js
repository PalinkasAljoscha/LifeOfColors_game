/** @type {import('tailwindcss').Config} */
import { palette } from './src/theme.js'

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        game: {
          bg:       palette.gameBg,
          header:   palette.gameHeader,
          panel:    palette.panel,
          divider:  palette.divider,
          score:    palette.scoreYellow,
          star:     palette.starGold,
          'star-empty': palette.starEmpty,
          silver:   palette.silverGray,
          hint:     palette.hintGray,
          btn:      palette.btnBlue,
          'btn-hover': palette.btnBlueHover,
          orange:   palette.cellOrangeFill,
          green:    palette.cellGreenFill,
          blue:     palette.cellBlueFill,
          cell:     palette.cellUncolored,
        },
      },
      fontFamily: {
        game: ['"Arial Black"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
