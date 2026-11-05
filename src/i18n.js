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

// Start in the browser's language if we have it, otherwise German (the default). Read locally only: the language is
// never sent anywhere (see src/telemetry/telemetry.js for what is collected).
const browser = (typeof navigator !== 'undefined' && navigator.language || 'en').slice(0, 2).toLowerCase()
const initial = LANGUAGES.some((l) => l.code === browser) ? browser : 'de'

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

export default i18n
