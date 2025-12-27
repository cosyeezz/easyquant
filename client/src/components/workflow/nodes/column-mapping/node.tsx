import React, { FC } from 'react'
import { Handle, Position } from 'reactflow'

const ColumnMappingNode: FC<any> = () => {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-2 !h-2 !bg-gray-400"
      />
      <div className="flex items-center justify-center w-full h-full min-h-[40px] text-xs font-medium text-gray-700">
        列名重命名
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-2 !h-2 !bg-gray-400"
      />
    </div>
  )
}

export default ColumnMappingNode
