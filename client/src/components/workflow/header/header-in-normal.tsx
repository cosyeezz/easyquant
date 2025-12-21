import ScrollToSelectedNodeButton from './scroll-to-selected-node-button'
import EditingTitle from './editing-title'

export type HeaderInNormalProps = {
  components?: {
    left?: React.ReactNode
    middle?: React.ReactNode
    chatVariableTrigger?: React.ReactNode
  }
  runAndHistoryProps?: any
}

const HeaderInNormal = ({
  components,
}: HeaderInNormalProps) => {
  return (
    <div className='flex w-full items-center justify-between pointer-events-none'>
      <div className='pointer-events-auto'>
        <EditingTitle />
      </div>
      <div className='pointer-events-auto'>
        <ScrollToSelectedNodeButton />
      </div>
      <div className='flex items-center gap-2 pointer-events-auto'>
        {components?.left}
        {components?.middle}
      </div>
    </div>
  )
}

export default HeaderInNormal
