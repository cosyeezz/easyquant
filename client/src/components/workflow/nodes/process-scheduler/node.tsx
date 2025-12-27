import React, { FC } from 'react'

const ProcessSchedulerNode: FC<any> = ({ data }) => {
  const groupCount = data.process_groups?.length || 0
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[40px] text-xs text-gray-600">
      {groupCount > 0 ? `${groupCount} 个进程组` : '点击配置进程组'}
    </div>
  )
}

export default ProcessSchedulerNode
