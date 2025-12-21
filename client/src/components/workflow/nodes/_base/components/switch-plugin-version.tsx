'use client'

import Badge from '@/app/components/base/badge'
import Tooltip from '@/app/components/base/tooltip'
// import PluginVersionPicker from '@/app/components/plugins/update-plugin/plugin-version-picker'
import { RiArrowLeftRightLine } from '@remixicon/react'
import type { ReactNode } from 'react'
import { type FC } from 'react'
import cn from '@/utils/classnames'

export type SwitchPluginVersionProps = {
  uniqueIdentifier: string
  tooltip?: ReactNode
  onChange?: (version: string) => void
  className?: string
}

export const SwitchPluginVersion: FC<SwitchPluginVersionProps> = (props) => {
  const { uniqueIdentifier, tooltip, className } = props

  const [pluginId] = uniqueIdentifier?.split(':') || ['']
  // const [isShow, setIsShow] = useState(false)
  const isShow = false
  // const [target, setTarget] = useState<{
  //   version: string,
  //   pluginUniqueIden: string;
  // }>()
  /*
  const pluginDetails = useCheckInstalled({
    pluginIds: [pluginId],
    enabled: true,
  })
  const pluginDetail = pluginDetails.data?.plugins.at(0)
  */
  const pluginDetail = { version: '0.0.1' } // Mock

  /*
  const handleUpdatedFromMarketplace = useCallback(() => {
    hideUpdateModal()
    pluginDetails.refetch()
    onChange?.(target!.version)
  }, [hideUpdateModal, onChange, pluginDetails, target])
  const { getIconUrl } = useGetIcon()
  const icon = pluginDetail?.declaration.icon ? getIconUrl(pluginDetail.declaration.icon) : undefined
  const mutation = useUpdatePackageFromMarketPlace()
  const install = () => {
    mutation.mutate(
      {
        new_plugin_unique_identifier: target!.pluginUniqueIden,
        original_plugin_unique_identifier: uniqueIdentifier,
      },
      {
        onSuccess() {
          handleUpdatedFromMarketplace()
        },
      })
  }
  const { t } = useTranslation()
  */

  // Guard against null/undefined uniqueIdentifier to prevent app crash
  if (!uniqueIdentifier || !pluginId)
    return null

  return <Tooltip popupContent={tooltip} triggerMethod='hover'>
    <div className={cn('flex w-fit items-center justify-center', className)} onClick={e => e.stopPropagation()}>
      {/* {isShowUpdateModal && pluginDetail && <PluginMutationModel
        ...
      />} */}
      {pluginDetail && (
          <Badge
            className={cn(
              'mx-1 flex hover:bg-state-base-hover',
              isShow && 'bg-state-base-hover',
            )}
            uppercase={true}
            text={
              <>
                <div>{pluginDetail.version}</div>
                <RiArrowLeftRightLine className='ml-1 h-3 w-3 text-text-tertiary' />
              </>
            }
            hasRedCornerMark={true}
          />
      )}
    </div>
  </Tooltip>
}
