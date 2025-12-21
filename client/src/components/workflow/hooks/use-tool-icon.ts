import { useCallback, useMemo } from 'react'
import type { Node, ToolWithProvider } from '../types'
import { BlockEnum } from '../types'
import { useStore, useWorkflowStore } from '../store'
import { CollectionType } from '@/app/components/tools/types'
import { canFindTool } from '@/utils'
// Mocked service hooks
const useAllBuiltInTools = () => []
const useAllCustomTools = () => []
const useAllMCPTools = () => []
const useAllWorkflowTools = () => []
const useAllTriggerPlugins = () => ({ triggerPlugins: [] })

// Removed imports
// import {
//   useAllBuiltInTools,
//   useAllCustomTools,
//   useAllMCPTools,
//   useAllWorkflowTools,
// } from '@/service/use-tools'
// import { useAllTriggerPlugins } from '@/service/use-triggers'
import type { PluginTriggerNodeType } from '../nodes/trigger-plugin/types'
import type { ToolNodeType } from '../nodes/tool/types'
import type { DataSourceNodeType } from '../nodes/data-source/types'
import type { TriggerWithProvider } from '../block-selector/types'
import useTheme from '@/hooks/use-theme'

const isTriggerPluginNode = (data: Node['data']): data is PluginTriggerNodeType => data.type === BlockEnum.TriggerPlugin

const isToolNode = (data: Node['data']): data is ToolNodeType => data.type === BlockEnum.Tool

const isDataSourceNode = (data: Node['data']): data is DataSourceNodeType => data.type === BlockEnum.DataSource

type IconValue = ToolWithProvider['icon']

const resolveIconByTheme = (
  currentTheme: string | undefined,
  icon?: IconValue,
  iconDark?: IconValue,
) => {
  if (currentTheme === 'dark' && iconDark)
    return iconDark
  return icon
}

const findTriggerPluginIcon = (
  identifiers: (string | undefined)[],
  triggers: TriggerWithProvider[] | undefined,
  currentTheme?: string,
) => {
  const targetTriggers = triggers || []
  for (const identifier of identifiers) {
    if (!identifier)
      continue
    const matched = targetTriggers.find(trigger => trigger.id === identifier || canFindTool(trigger.id, identifier))
    if (matched)
      return resolveIconByTheme(currentTheme, matched.icon, matched.icon_dark)
  }
  return undefined
}

export const useToolIcon = (data?: Node['data']) => {
  const dataSourceList = useStore(s => s.dataSourceList)
  const { theme } = useTheme()

  const toolIcon = useMemo(() => {
    if (!data)
      return ''

    if (isTriggerPluginNode(data)) {
      // No backend fetch for triggers
      return ''
    }

    if (isToolNode(data)) {
      const fallbackIcon = resolveIconByTheme(theme, data.provider_icon, data.provider_icon_dark)
      if (fallbackIcon)
        return fallbackIcon

      return ''
    }

    if (isDataSourceNode(data))
      return dataSourceList?.find(toolWithProvider => toolWithProvider.plugin_id === data.plugin_id)?.icon || ''

    return ''
  }, [data, dataSourceList, theme])

  return toolIcon
}

export const useGetToolIcon = () => {
  const workflowStore = useWorkflowStore()
  const { theme } = useTheme()

  const getToolIcon = useCallback((data: Node['data']) => {
    const {
      dataSourceList,
    } = workflowStore.getState()

    if (isTriggerPluginNode(data)) {
      return undefined
    }

    if (isToolNode(data)) {
      const fallbackIcon = resolveIconByTheme(theme, data.provider_icon, data.provider_icon_dark)
      if (fallbackIcon)
        return fallbackIcon

      return undefined
    }

    if (isDataSourceNode(data))
      return dataSourceList?.find(toolWithProvider => toolWithProvider.plugin_id === data.plugin_id)?.icon

    return undefined
  }, [workflowStore, theme])

  return getToolIcon
}
