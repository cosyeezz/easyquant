import {
  memo,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from 'react'
import { useStoreApi } from 'reactflow'
import { useTranslation } from 'react-i18next'
import { groupBy } from 'lodash-es'
import {
  RiAppsLine,
  RiDatabase2Line,
  RiStockLine,
  RiBrainLine,
  RiGitMergeLine,
  RiCodeSSlashLine,
  RiToolsLine,
  RiArrowRightSLine,
  RiArrowDownSLine,
  RiHistoryLine,
  RiServerLine,
} from '@remixicon/react'
import BlockIcon from '../block-icon'
import { BlockEnum } from '../types'
import type { NodeDefault, PluginDefaultValue } from '../types'
import { BLOCK_CLASSIFICATIONS } from './constants'
import { BlockClassificationEnum } from './types'
import { useBlocks } from './hooks'
import Tooltip from '@/app/components/base/tooltip'
import Badge from '@/app/components/base/badge'
import cn from '@/utils/classnames'

type BlocksProps = {
  searchText: string
  onSelect: (type: BlockEnum, pluginDefaultValue?: PluginDefaultValue) => void
  availableBlocksTypes?: BlockEnum[]
  blocks?: NodeDefault[]
}

const ClassificationIcons: Record<string, React.ComponentType<any>> = {
  [BlockClassificationEnum.Default]: RiAppsLine,
  [BlockClassificationEnum.System]: RiServerLine,
  [BlockClassificationEnum.Data]: RiDatabase2Line,
  [BlockClassificationEnum.Quant]: RiStockLine,
  [BlockClassificationEnum.QuestionUnderstand]: RiBrainLine,
  [BlockClassificationEnum.Logic]: RiGitMergeLine,
  [BlockClassificationEnum.Transform]: RiCodeSSlashLine,
  [BlockClassificationEnum.Utilities]: RiToolsLine,
}

const Blocks = ({
  searchText,
  onSelect,
  availableBlocksTypes = [],
  blocks: blocksFromProps,
}: BlocksProps) => {
  const { t } = useTranslation()
  const store = useStoreApi()
  const blocksFromHooks = useBlocks()

  // Use external blocks if provided, otherwise fallback to hook-based blocks
  const blocks = blocksFromProps || blocksFromHooks.map(block => ({
    metaData: {
      classification: block.classification,
      sort: 0, // Default sort order
      type: block.type,
      title: block.title,
      author: 'Dify',
      description: block.description,
    },
    defaultValue: {},
    checkValid: () => ({ isValid: true }),
  }) as NodeDefault)

  const groups = useMemo(() => {
    return BLOCK_CLASSIFICATIONS.reduce((acc, classification) => {
      const grouped = groupBy(blocks, 'metaData.classification')
      const list = (grouped[classification] || []).filter((block) => {
        // Filter out trigger types from Blocks tab
        if (block.metaData.type === BlockEnum.TriggerWebhook
            || block.metaData.type === BlockEnum.TriggerSchedule
            || block.metaData.type === BlockEnum.TriggerPlugin)
          return false

        if (searchText) {
             return block.metaData.title.toLowerCase().includes(searchText.toLowerCase()) && availableBlocksTypes.includes(block.metaData.type)
        }
        return availableBlocksTypes.includes(block.metaData.type)
      })

      return {
        ...acc,
        [classification]: list,
      }
    }, {} as Record<string, typeof blocks>)
  }, [blocks, searchText, availableBlocksTypes])
  
  const isEmpty = Object.values(groups).every(list => !list.length)

  // Split View Logic
  const [activeClassification, setActiveClassification] = useState(BLOCK_CLASSIFICATIONS[0])
  const [expandedNode, setExpandedNode] = useState<string | null>(null)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = useCallback((classification: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setActiveClassification(classification)
    }, 80) // 80ms delay for smoother interaction
  }, [])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])
  
  // Reset active classification when search text changes (if needed)
  useEffect(() => {
      if (searchText) {
          // When searching, we don't strictly need activeClassification as we show flat list,
          // but if we want to support categorization during search, we can keep it.
          // For now, search results are flat.
      }
  }, [searchText])


  const renderNodeItem = useCallback((block: NodeDefault) => {
    const hasVersions = block.metaData.versions && block.metaData.versions.length > 0
    const isExpanded = expandedNode === block.metaData.type

    return (
      <div key={block.metaData.type} className='flex flex-col'>
        <Tooltip
          position='right'
          popupClassName='w-[200px] rounded-xl'
          needsDelay={false}
          popupContent={(
            <div>
              <BlockIcon
                size='md'
                className='mb-2'
                type={block.metaData.type}
              />
              <div className='system-md-medium mb-1 text-text-primary'>{block.metaData.title}</div>
              <div className='system-xs-regular text-text-tertiary'>{block.metaData.description}</div>
            </div>
          )}
        >
          <div
            className={cn(
              'flex h-8 w-full cursor-pointer items-center rounded-lg px-3 hover:bg-state-base-hover group',
              isExpanded && 'bg-state-base-hover'
            )}
            onClick={(e) => {
              if (hasVersions) {
                e.stopPropagation()
                setExpandedNode(isExpanded ? null : block.metaData.type)
              } else {
                onSelect(block.metaData.type)
              }
            }}
          >
            <BlockIcon
              className='mr-2 shrink-0'
              type={block.metaData.type}
            />
            <div className='grow text-sm text-text-secondary'>{block.metaData.title}</div>
            {
              block.metaData.type === BlockEnum.LoopEnd && (
                <Badge
                  text={t('workflow.nodes.loop.loopNode')}
                  className='ml-2 shrink-0'
                />
              )
            }
            {hasVersions && (
              <div className='ml-2 shrink-0 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity'>
                <span className='text-[10px] font-mono'>{block.metaData.recommendedVersion}</span>
                {isExpanded ? <RiArrowDownSLine className='w-3 h-3' /> : <RiArrowRightSLine className='w-3 h-3' />}
              </div>
            )}
          </div>
        </Tooltip>

        {/* Version List */}
        {hasVersions && isExpanded && (
          <div className='ml-6 mt-1 mb-2 border-l-2 border-divider-subtle pl-2 space-y-1 animate-in fade-in slide-in-from-left-1 duration-200'>
            {block.metaData.versions?.map((v) => (
              <div
                key={v.version}
                className='flex items-center gap-2 h-7 px-2 rounded-md hover:bg-state-base-hover cursor-pointer'
                onClick={() => onSelect(block.metaData.type, {
                  node_id: (block.metaData as any).dbId,
                  version: v.version
                })}
              >
                <RiHistoryLine className='w-3 h-3 text-text-tertiary' />
                <span className='text-[11px] font-mono text-text-secondary'>{v.version}</span>
                <span className={cn(
                  'text-[9px] px-1 rounded border',
                  v.version_type === 'RELEASE' ? 'text-success-600 border-success-200 bg-success-50' : 'text-warning-600 border-warning-200 bg-warning-50'
                )}>
                  {v.version_type}
                </span>
                {v.version === block.metaData.recommendedVersion && (
                  <span className='text-[9px] text-text-accent font-bold'>★</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }, [onSelect, t, expandedNode])

  const renderGroup = useCallback((classification: string, isFlat = false) => {
    const list = groups[classification].sort((a, b) => (a.metaData.sort || 0) - (b.metaData.sort || 0))
    const { getNodes } = store.getState()
    const nodes = getNodes()
    const hasKnowledgeBaseNode = nodes.some(node => node.data.type === BlockEnum.KnowledgeBase)
    const filteredList = list.filter((block) => {
      if (hasKnowledgeBaseNode)
        return block.metaData.type !== BlockEnum.KnowledgeBase
      return true
    })

    if (!filteredList.length) return null

    return (
      <div
        key={classification}
        className='mb-1 last-of-type:mb-0'
      >
        {
          isFlat && classification !== '-' && (
            <div className='flex h-[22px] items-start px-3 text-xs font-medium text-text-tertiary'>
              {t(`workflow.tabs.${classification}`)}
            </div>
          )
        }
        {
          filteredList.map(renderNodeItem)
        }
      </div>
    )
  }, [groups, renderNodeItem, t, store])

  // Search Mode: Flat List
  if (searchText) {
      return (
        <div className='flex h-[360px] w-[500px] flex-col overflow-hidden bg-components-panel-bg'>
          <div className='flex-1 overflow-y-auto p-1'>
            {
              isEmpty && (
                <div className='flex h-[22px] items-center px-3 text-xs font-medium text-text-tertiary'>{t('workflow.tabs.noResult')}</div>
              )
            }
            {
              !isEmpty && BLOCK_CLASSIFICATIONS.map(c => renderGroup(c, true))
            }
          </div>
        </div>
      )
  }

  // Split View Mode (Default)
  return (
    <div className='flex h-[360px] w-[500px] overflow-hidden'>
        {/* Left Sidebar: Categories */}
        <div className='flex w-[160px] shrink-0 flex-col overflow-y-auto border-r border-divider-subtle bg-background-section-burn py-2'>
            {BLOCK_CLASSIFICATIONS.map((classification) => {
                 const isActive = activeClassification === classification
                 const Icon = ClassificationIcons[classification] || RiAppsLine

                 return (
                     <div
                        key={classification}
                        className={cn(
                            'group flex h-10 w-full cursor-pointer items-center gap-2.5 px-4 text-[13px] font-medium transition-all',
                            isActive 
                                ? 'bg-components-panel-bg text-text-accent' 
                                : 'text-text-secondary hover:bg-state-base-hover hover:text-text-primary'
                        )}
                        onMouseEnter={() => handleMouseEnter(classification)}
                     >
                         <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-text-accent' : 'text-text-tertiary group-hover:text-text-secondary')} />
                         <span className='truncate leading-none'>{t(`workflow.tabs.${classification}`)}</span>
                         {isActive && <div className='absolute left-0 h-4 w-1 rounded-r-full bg-text-accent' />}
                     </div>
                 )
            })}
        </div>

        {/* Right Panel: Nodes */}
        <div className='flex-1 overflow-y-auto bg-components-panel-bg p-3'>
            <div className="animate-in fade-in slide-in-from-right-1 duration-200">
                {renderGroup(activeClassification, false)}
            </div>
        </div>
    </div>
  )
}

export default memo(Blocks)
