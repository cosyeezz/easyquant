import Tooltip from '@/app/components/base/tooltip'
import Indicator from '@/app/components/header/indicator'
import classNames from '@/utils/classnames'
import { memo, useMemo, useRef, useState } from 'react'
import { getIconFromMarketPlace } from '@/utils/get-icon'
import { useTranslation } from 'react-i18next'
import { Group } from '@/app/components/base/icons/src/vender/other'
import AppIcon from '@/app/components/base/app-icon'

type Status = 'not-installed' | 'not-authorized' | undefined

export type ToolIconProps = {
  id: string
  providerName: string
}

export const ToolIcon = memo(({ providerName }: ToolIconProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Simplified: No backend fetch
  const providerNameParts = providerName.split('/')
  const author = providerNameParts[0]
  const name = providerNameParts[1]
  
  // Use marketplace static icon logic if available, or just a default
  const icon = useMemo(() => {
    return getIconFromMarketPlace(`${author}/${name}`)
  }, [author, name])

  const status: Status = undefined // Always assume valid for frontend-only
  
  const notSuccess = false
  const [iconFetchError, setIconFetchError] = useState(false)

  return (
    <div
      className={classNames(
        'relative',
      )}
      ref={containerRef}
    >
      <div className="flex size-5 items-center justify-center overflow-hidden rounded-[6px] border-[0.5px] border-components-panel-border-subtle bg-background-default-dodge">
        {(() => {
          if (iconFetchError || !icon)
            return <Group className="h-3 w-3 opacity-35" />
          if (typeof icon === 'string') {
            return <img
              src={icon}
              alt='tool icon'
              className={classNames(
                'size-3.5 h-full w-full object-cover',
                notSuccess && 'opacity-50',
              )}
              onError={() => setIconFetchError(true)}
            />
          }
          if (typeof icon === 'object') {
            return <AppIcon
              className={classNames(
                'size-3.5 h-full w-full object-cover',
                notSuccess && 'opacity-50',
              )}
              icon={icon?.content}
              background={icon?.background}
            />
          }
          return <Group className="h-3 w-3 opacity-35" />
        })()}
      </div>
    </div>
  )
})

ToolIcon.displayName = 'ToolIcon'
