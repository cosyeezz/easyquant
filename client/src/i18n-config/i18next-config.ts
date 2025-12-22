'use client'
import i18n from 'i18next'
import { camelCase } from 'lodash-es'
import { initReactI18next } from 'react-i18next'
import Cookies from 'js-cookie'
import { LOCALE_COOKIE_NAME } from '@/config'

const NAMESPACES = [
  'app-annotation',
  'app-api',
  'app-debug',
  'app-log',
  'app-overview',
  'app',
  'billing',
  'common',
  'custom',
  'dataset-creation',
  'dataset-documents',
  'dataset-hit-testing',
  'dataset-pipeline',
  'dataset-settings',
  'dataset',
  'easyquant',
  'education',
  'explore',
  'layout',
  'login',
  'oauth',
  'pipeline',
  'plugin-tags',
  'plugin-trigger',
  'plugin',
  'register',
  'run-log',
  'share',
  'time',
  'tools',
  'workflow',
]

// Vite specific: Load en-US synchronously for initial render
const enUsFiles = import.meta.glob('../i18n/en-US/*.ts', { eager: true })

const getInitialTranslations = () => {
  const en_USResources = NAMESPACES.reduce((acc, ns) => {
    // Construct the file path key that matches import.meta.glob output
    const filePath = `../i18n/en-US/${ns}.ts`
    const module = enUsFiles[filePath] as any
    if (module && module.default) {
       acc[camelCase(ns)] = module.default
    }
    return acc
  }, {} as Record<string, any>)
  
  return {
    'en-US': {
      translation: en_USResources,
    },
  }
}

// Async loader for other languages
const requireSilent = async (lang: string, namespace: string) => {
  let res
  try {
    // Explicit extension .ts required by Vite dynamic imports
    res = (await import(`../i18n/${lang}/${namespace}.ts`)).default
  }
  catch (e) {
    console.warn(`Failed to load translation: ${lang}/${namespace}`, e)
    // Fallback to pre-loaded en-US
    const filePath = `../i18n/en-US/${namespace}.ts`
    res = (enUsFiles[filePath] as any)?.default
  }

  return res
}

export const loadLangResources = async (lang: string) => {
  const modules = await Promise.all(
    NAMESPACES.map(ns => requireSilent(lang, ns)),
  )
  const resources = modules.reduce((acc, mod, index) => {
    acc[camelCase(NAMESPACES[index])] = mod
    return acc
  }, {} as Record<string, any>)
  return resources
}

if (!i18n.isInitialized) {
  const currentLocale = Cookies.get(LOCALE_COOKIE_NAME) || 'zh-Hans'

  i18n.use(initReactI18next).init({
    lng: currentLocale,
    fallbackLng: 'zh-Hans',
    resources: getInitialTranslations(), // Ideally preload zh-Hans too if possible, but async load works
    interpolation: {
      escapeValue: false,
    },
  })
  
  // Trigger initial load for current locale if not present in initial resources (en-US is preloaded)
  loadLangResources(currentLocale).then(resources => {
      i18n.addResourceBundle(currentLocale, 'translation', resources, true, true)
      i18n.changeLanguage(currentLocale)
  })
}

export const changeLanguage = async (lng?: string) => {
  if (!lng) return
  if (!i18n.hasResourceBundle(lng, 'translation')) {
    const resource = await loadLangResources(lng)
    i18n.addResourceBundle(lng, 'translation', resource, true, true)
  }
  await i18n.changeLanguage(lng)
}

export default i18n