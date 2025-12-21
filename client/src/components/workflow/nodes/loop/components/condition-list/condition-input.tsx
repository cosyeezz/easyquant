import { useTranslation } from 'react-i18next'
import { useStore } from '@/app/components/workflow/store'
// import PromptEditor from '@/app/components/base/prompt-editor'
import Input from '@/app/components/base/input'
import { BlockEnum } from '@/app/components/workflow/types'
import type {
  Node,
} from '@/app/components/workflow/types'

type ConditionInputProps = {
  disabled?: boolean
  value: string
  onChange: (value: string) => void
  availableNodes: Node[]
}
const ConditionInput = ({
  value,
  onChange,
  disabled,
  availableNodes,
}: ConditionInputProps) => {
  const { t } = useTranslation()
  const controlPromptEditorRerenderKey = useStore(s => s.controlPromptEditorRerenderKey)
  const pipelineId = useStore(s => s.pipelineId)
  const setShowInputFieldPanel = useStore(s => s.setShowInputFieldPanel)

  return (
    <Input
      key={controlPromptEditorRerenderKey}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={t('workflow.nodes.ifElse.enterValue') || ''}
      disabled={disabled}
    />
    // <PromptEditor
    //   ...
    // />
  )
}

export default ConditionInput
