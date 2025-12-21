import { memo } from 'react'

const EditingTitle = () => {
  return (
    <div className='system-xs-regular flex h-[18px] min-w-[300px] items-center whitespace-nowrap text-text-tertiary font-bold text-lg'>
      Easy Canvas
    </div>
  )
}

export default memo(EditingTitle)
