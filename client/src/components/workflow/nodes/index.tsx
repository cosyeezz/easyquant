import {
  memo,
  useMemo,
} from 'react'
import { useHooksStore } from '../hooks-store'
import type { NodeProps } from 'reactflow'
import type { Node } from '../types'
import { CUSTOM_NODE } from '../constants'
import {
  NodeComponentMap,
  PanelComponentMap,
} from './components'
import BaseNode from './_base/node'
import BasePanel from './_base/components/workflow-panel'
import ToolPanel from './tool/panel'
import DynamicNodePanel from './dynamic/panel'

const CustomNode = (props: NodeProps) => {
  const nodeData = props.data
  
  const NodeComponent = useMemo(() => {
    if (!nodeData.type) return null
    return NodeComponentMap[nodeData.type] || ToolNode // Fallback to ToolNode
  }, [nodeData.type])

  if (!NodeComponent) {
    return (
      <BaseNode id={props.id} data={props.data}>
         <div style={{ color: 'red', padding: 10 }}>
            {nodeData.type ? `Unknown Node Type: ${nodeData.type}` : 'Initializing Node...'}
         </div>
      </BaseNode>
    );
  }

  return (
    <>
      <BaseNode
        id={props.id}
        data={props.data}
      >
        <NodeComponent />
      </BaseNode>
    </>
  )
}
CustomNode.displayName = 'CustomNode'

export type PanelProps = {
  type: Node['type']
  id: Node['id']
  data: Node['data']
}
export const Panel = memo((props: PanelProps) => {
  const nodeClass = props.type
  const nodeData = props.data
  const { nodesMap } = useHooksStore.getState().availableNodesMetaData || { nodesMap: {} }

  const PanelComponent = useMemo(() => {
    if (nodeClass !== CUSTOM_NODE) return () => null
    
    // 1. Check if we have a specific panel for this type
    if (PanelComponentMap[nodeData.type]) return PanelComponentMap[nodeData.type]
    
    // 2. Check if it's a backend node (V2 Protocol)
    const meta = (nodesMap as any)?.[nodeData.type]
    if (meta?.metaData?.isBackend) return DynamicNodePanel
    
    // 3. Fallback to ToolPanel
    return ToolPanel
  }, [nodeClass, nodeData.type, nodesMap])

  if (nodeClass === CUSTOM_NODE) {
    return (
      <BasePanel
        key={props.id}
        id={props.id}
        data={props.data}
      >
        <PanelComponent />
      </BasePanel>
    )
  }

  return null
})

Panel.displayName = 'Panel'

export default memo(CustomNode)
