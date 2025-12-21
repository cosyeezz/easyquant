import {
  useMemo,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { NodeSelectorProps } from './main'
import NodeSelector from './main'
import { useHooksStore } from '@/app/components/workflow/hooks-store/store'
import { BlockEnum } from '@/app/components/workflow/types'
import { useStore } from '../store'

const NodeSelectorWrapper = (props: NodeSelectorProps) => {
  const { t } = useTranslation()
  const availableNodesMetaData = useHooksStore(s => s.availableNodesMetaData)
  const dataSourceList = useStore(s => s.dataSourceList)

  const blocks = useMemo(() => {
    const result = availableNodesMetaData?.nodes || []

    return result.filter((block) => {
      if (block.metaData.type === BlockEnum.Start)
        return false

      if (block.metaData.type === BlockEnum.DataSource)
        return false

      if (block.metaData.type === BlockEnum.Tool)
        return false

      if (block.metaData.type === BlockEnum.IterationStart)
        return false

      if (block.metaData.type === BlockEnum.LoopStart)
        return false

      if (block.metaData.type === BlockEnum.DataSourceEmpty)
        return false

      return true
    }).map((block) => {
      return {
        ...block,
        metaData: {
          ...block.metaData,
          title: t(`workflow.blocks.${block.metaData.type}`),
          description: t(`workflow.blocksAbout.${block.metaData.type}`),
        },
      }
    })
  }, [availableNodesMetaData?.nodes, t])

  return (
    <NodeSelector
      {...props}
      blocks={props.blocks || blocks}
      dataSources={props.dataSources || dataSourceList || []}
    />
  )
}

export default NodeSelectorWrapper
