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
import ToolNode from './tool/node'
import ToolPanel from './tool/panel'

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
  const PanelComponent = useMemo(() => {
    if (nodeClass === CUSTOM_NODE)
      return PanelComponentMap[nodeData.type] || ToolPanel // Fallback to ToolPanel

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
