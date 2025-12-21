import {
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { BlockEnum } from '../types'
import type {
  OnSelectBlock,
  ToolWithProvider,
} from '../types'
import type { DataSourceDefaultValue, ToolDefaultValue } from './types'
import Tools from './tools'
import { ViewType } from './view-type-select'
import cn from '@/utils/classnames'
import { DEFAULT_FILE_EXTENSIONS_IN_LOCAL_FILE_DATA_SOURCE } from './constants'
import { useGetLanguage } from '@/context/i18n'

type AllToolsProps = {
  className?: string
  toolContentClassName?: string
  searchText: string
  onSelect: OnSelectBlock
  dataSources: ToolWithProvider[]
}

const DataSources = ({
  className,
  toolContentClassName,
  searchText,
  onSelect,
  dataSources,
}: AllToolsProps) => {
  const language = useGetLanguage()
  const wrapElemRef = useRef<HTMLDivElement>(null)

  const isMatchingKeywords = (text: string, keywords: string) => {
    return text.toLowerCase().includes(keywords.toLowerCase())
  }

  const filteredDatasources = useMemo(() => {
    const hasFilter = searchText
    if (!hasFilter)
      return dataSources.filter(toolWithProvider => toolWithProvider.tools.length > 0)

    return dataSources.filter((toolWithProvider) => {
      return isMatchingKeywords(toolWithProvider.name, searchText) || toolWithProvider.tools.some((tool) => {
        return (tool.label[language] || '').toLowerCase().includes(searchText.toLowerCase()) || tool.name.toLowerCase().includes(searchText.toLowerCase())
      })
    })
  }, [searchText, dataSources, language])

  const handleSelect = useCallback((_: BlockEnum, toolDefaultValue: ToolDefaultValue) => {
    let defaultValue: DataSourceDefaultValue = {
      plugin_id: toolDefaultValue?.provider_id,
      provider_type: toolDefaultValue?.provider_type,
      provider_name: toolDefaultValue?.provider_name,
      datasource_name: toolDefaultValue?.tool_name,
      datasource_label: toolDefaultValue?.tool_label,
      title: toolDefaultValue?.title,
      plugin_unique_identifier: toolDefaultValue?.plugin_unique_identifier,
    }
    if (toolDefaultValue?.provider_id === 'langgenius/file' && toolDefaultValue?.provider_name === 'file') {
      defaultValue = {
        ...defaultValue,
        fileExtensions: DEFAULT_FILE_EXTENSIONS_IN_LOCAL_FILE_DATA_SOURCE,
      }
    }
    onSelect(BlockEnum.DataSource, toolDefaultValue && defaultValue)
  }, [onSelect])

  return (
    <div className={cn('w-[400px] min-w-0 max-w-full', className)}>
      <div
        ref={wrapElemRef}
        className='max-h-[464px] overflow-y-auto overflow-x-hidden'
      >
        <Tools
          className={toolContentClassName}
          tools={filteredDatasources}
          onSelect={handleSelect as OnSelectBlock}
          viewType={ViewType.flat}
          hasSearchText={!!searchText}
          canNotSelectMultiple
        />
      </div>
    </div>
  )
}

export default DataSources