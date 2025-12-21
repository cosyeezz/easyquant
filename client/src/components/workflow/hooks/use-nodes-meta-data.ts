import { useMemo } from 'react'
import type { AvailableNodesMetaData } from '@/app/components/workflow/hooks-store'
import { useHooksStore } from '@/app/components/workflow/hooks-store'
import type { Node } from '@/app/components/workflow/types'

export const useNodesMetaData = () => {
  const availableNodesMetaData = useHooksStore(s => s.availableNodesMetaData)

  return useMemo(() => {
    return {
      nodes: availableNodesMetaData?.nodes || [],
      nodesMap: availableNodesMetaData?.nodesMap || {},
    } as AvailableNodesMetaData
  }, [availableNodesMetaData])
}

export const useNodeMetaData = (node: Node) => {
  const availableNodesMetaData = useNodesMetaData()
  const { data } = node
  const nodeMetaData = availableNodesMetaData.nodesMap?.[data.type]

  return useMemo(() => {
    return {
      ...nodeMetaData?.metaData,
      author: nodeMetaData?.metaData?.author || 'Dify',
      description: nodeMetaData?.metaData?.description || '', // Simplified: Use static description directly or handle i18n locally if needed
    }
  }, [nodeMetaData])
}
