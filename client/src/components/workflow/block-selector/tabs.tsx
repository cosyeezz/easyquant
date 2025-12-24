import type { Dispatch, FC, SetStateAction } from 'react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  BlockEnum,
  NodeDefault,
  OnSelectBlock,
  ToolWithProvider,
} from '../types'
import { TabsEnum } from './types'
import Blocks from './blocks'
import AllStartBlocks from './all-start-blocks'
import AllTools from './all-tools'
import DataSources from './data-sources'
import cn from '@/utils/classnames'
import Tooltip from '@/app/components/base/tooltip'

export type TabsProps = {
  activeTab: TabsEnum
  onActiveTabChange: (activeTab: TabsEnum) => void
  searchText: string
  tags: string[]
  onTagsChange: Dispatch<SetStateAction<string[]>>
  onSelect: OnSelectBlock
  availableBlocksTypes?: BlockEnum[]
  blocks: NodeDefault[]
  dataSources?: ToolWithProvider[]
  tabs: Array<{
    key: TabsEnum
    name: string
    disabled?: boolean
  }>
  filterElem: React.ReactNode
  noBlocks?: boolean
  noTools?: boolean
  forceShowStartContent?: boolean // Force show Start content even when noBlocks=true
  allowStartNodeSelection?: boolean // Allow user input option even when trigger node already exists (e.g. change-node flow or when no Start node yet).
}
const Tabs: FC<TabsProps> = ({
  activeTab,
  onActiveTabChange,
  tags,
  onTagsChange,
  searchText,
  onSelect,
  availableBlocksTypes,
  blocks,
  dataSources = [],
  tabs = [],
  filterElem,
  noBlocks,
  noTools,
  forceShowStartContent = false,
  allowStartNodeSelection = false,
}) => {
  const { t } = useTranslation()
  const inRAGPipeline = dataSources.length > 0

  return (
    <div onClick={e => e.stopPropagation()}>
      {
        !noBlocks && false && ( // Hiding tabs header for now to enforce split-view
          <div className='relative flex bg-background-section-burn pl-1 pt-1'>
            {
              tabs.map((tab) => {
                const commonProps = {
                  'className': cn(
                    'system-sm-medium relative mr-0.5 flex h-8 items-center rounded-t-lg px-3',
                    tab.disabled
                      ? 'cursor-not-allowed text-text-disabled opacity-60'
                      : activeTab === tab.key
                        ? 'sm-no-bottom cursor-default bg-components-panel-bg text-text-accent'
                        : 'cursor-pointer text-text-tertiary',
                  ),
                  'aria-disabled': tab.disabled,
                  'onClick': () => {
                    if (tab.disabled || activeTab === tab.key)
                      return
                    onActiveTabChange(tab.key)
                  },
                } as const
                if (tab.disabled) {
                  return (
                    <Tooltip
                      key={tab.key}
                      position='top'
                      popupClassName='max-w-[200px]'
                      popupContent={t('workflow.tabs.startDisabledTip')}
                    >
                      <div {...commonProps}>
                        {tab.name}
                      </div>
                    </Tooltip>
                  )
                }
                return (
                  <div
                    key={tab.key}
                    {...commonProps}
                  >
                    {tab.name}
                  </div>
                )
              })
            }
          </div>
        )
      }
      {filterElem}
      {
        activeTab === TabsEnum.Start && (!noBlocks || forceShowStartContent) && (
          <div className='border-t border-divider-subtle'>
            <AllStartBlocks
              allowUserInputSelection={allowStartNodeSelection}
              searchText={searchText}
              onSelect={onSelect}
              availableBlocksTypes={availableBlocksTypes}
              tags={tags}
            />
          </div>
        )
      }
      {
        activeTab === TabsEnum.Blocks && !noBlocks && (
          <div className=''>
            <Blocks
              searchText={searchText}
              onSelect={onSelect}
              availableBlocksTypes={availableBlocksTypes}
              blocks={blocks}
            />
          </div>
        )
      }
      {
        activeTab === TabsEnum.Sources && !!dataSources.length && (
          <div className='border-t border-divider-subtle'>
            <DataSources
              searchText={searchText}
              onSelect={onSelect}
              dataSources={dataSources}
            />
          </div>
        )
      }
      {
        activeTab === TabsEnum.Tools && !noTools && (
          <AllTools
            searchText={searchText}
            onSelect={onSelect}
            tags={tags}
            canNotSelectMultiple
            buildInTools={[]}
            customTools={[]}
            workflowTools={[]}
            mcpTools={[]}
            canChooseMCPTool
            onTagsChange={onTagsChange}
            isInRAGPipeline={inRAGPipeline}
            featuredPlugins={[]}
            featuredLoading={false}
            showFeatured={false}
            onFeaturedInstallSuccess={async () => {
              // No-op
            }}
          />
        )
      }
    </div>
  )
}

export default memo(Tabs)
