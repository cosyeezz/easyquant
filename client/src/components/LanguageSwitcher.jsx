import { useEffect, useState } from 'react'
import { getLocaleOnClient, setLocaleOnClient } from '../i18n-config'

const LanguageSwitcher = () => {
  const [mounted, setMounted] = useState(false)
  const [locale, setLocale] = useState('zh-Hans')

  useEffect(() => {
    setLocale(getLocaleOnClient())
    setMounted(true)
  }, [])

  if (!mounted) return null

  const handleSwitch = () => {
    const target = locale === 'zh-Hans' ? 'en-US' : 'zh-Hans'
    console.log(`[LanguageSwitcher] Switching to ${target}`)
    setLocaleOnClient(target)
  }

  return (
    <div className="flex items-center">
      <button
        onClick={handleSwitch}
        className="
          cursor-pointer
          text-xs font-medium text-eq-text-secondary 
          hover:text-eq-text-primary 
          px-2 py-1 
          rounded 
          border border-eq-border-subtle 
          hover:bg-eq-bg-elevated
          active:scale-95 transition-all
        "
      >
        {locale === 'zh-Hans' ? 'English' : '中文'}
      </button>
    </div>
  )
}

export default LanguageSwitcher
