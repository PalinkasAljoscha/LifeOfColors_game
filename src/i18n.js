import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'
import de from './locales/de.json'

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
]

// Always start in German, whatever the browser's language (the player switches with DE / EN / FR on
// the home screen; the choice is not stored).
const initial = 'de'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      de: { translation: de },
    },
    lng: initial,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React already escapes output
    showSupportNotice: false,
  })

// The browser tab shows the game's name in the current language (index.html has the English one).
const setTitle = () => {
  // (without soft hyphens: the German name has one for the narrow home header)
  if (typeof document !== 'undefined') document.title = i18n.t('app.title').replace(/\u00ad/g, '')
}
setTitle()
i18n.on('languageChanged', setTitle)
// the page's language follows the chosen one (screen readers, hyphenation)
i18n.on('languageChanged', (lng) => { if (typeof document !== 'undefined') document.documentElement.lang = lng })

export default i18n
