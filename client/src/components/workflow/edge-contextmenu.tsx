import {
  memo,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useClickAway } from 'ahooks'
import { RiDeleteBinLine } from '@remixicon/react'
import { useEdgesInteractions } from './hooks'
import { useStore } from './store'

const EdgeContextmenu = () => {
  const { t } = useTranslation()
  const ref = useRef(null)
  const { handleEdgeDelete } = useEdgesInteractions()
  const edgeMenu = useStore(s => s.edgeMenu)
  const setEdgeMenu = useStore(s => s.setEdgeMenu)

  useClickAway(() => {
    if (edgeMenu)
      setEdgeMenu(undefined)
  }, ref)

  if (!edgeMenu)
    return null

  return (
    <div
      className='absolute z-[9] w-[240px] rounded-lg border-[0.5px] border-components-panel-border bg-components-panel-bg shadow-xl'
      style={{
        left: edgeMenu.left,
        top: edgeMenu.top,
      }}
      ref={ref}
    >
      <div className='p-1'>
        <div
          className='flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-text-secondary hover:bg-state-base-hover hover:text-text-destructive'
          onClick={() => {
            handleEdgeDelete()
            setEdgeMenu(undefined)
          }}
        >
          <RiDeleteBinLine className='h-4 w-4' />
          {t('common.operation.delete')}
        </div>
      </div>
    </div>
  )
}

export default memo(EdgeContextmenu)
