import {
  memo,
  useMemo,
} from 'react'
import type { NodeProps } from 'reactflow'
import type { Node } from '../types'
import { CUSTOM_NODE } from '../constants'
import {
  NodeComponentMap,
  PanelComponentMap,
} from './components'
import BaseNode from './_base/node'
import BasePanel from './_base/components/workflow-panel'

const CustomNode = (props: NodeProps) => {
  const nodeData = props.data
  // Debug log
  if (!nodeData.type) {
    // console.log('[CustomNode Debug] Missing type in data:', props.data, 'Node ID:', props.id);
  }
  const NodeComponent = useMemo(() => {
    // Fallback for HMR/Hydration issues
    if (!nodeData.type) return null
    return NodeComponentMap[nodeData.type]
  }, [nodeData.type])

  if (!NodeComponent) {
    // Only log if type exists but component is missing
    if (nodeData.type) {
      console.warn(`[CustomNode] Node component not found for type: ${nodeData.type}.`);
    }
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
  const PanelComponent = useMemo(() => {
    if (nodeClass === CUSTOM_NODE)
      return PanelComponentMap[nodeData.type]

    return () => null
  }, [nodeClass, nodeData.type])

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
