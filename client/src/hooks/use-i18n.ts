import { useGetLanguage } from '@/context/i18n'
import { renderI18nObject } from '@/i18n-config'

export const useRenderI18nObject = () => {
  const language = useGetLanguage()
  return (obj: Record<string, string>) => {
    return renderI18nObject(obj, language)
  }
}
