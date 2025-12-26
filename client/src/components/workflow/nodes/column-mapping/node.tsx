import React, { FC } from 'react'
import { NodeHandle } from '../_base/components/node-handle'
import { Position } from 'reactflow'

const ColumnMappingNode: FC<any> = () => {
  return (
    <div className="relative">
      <NodeHandle
        type="target"
        position={Position.Left}
        id="input"
      />
      <div className="flex items-center justify-center w-full h-full min-h-[40px] text-xs font-medium text-gray-700">
        列名重命名
      </div>
      <NodeHandle
        type="source"
        position={Position.Right}
        id="output"
      />
    </div>
  )
}

export default ColumnMappingNode
