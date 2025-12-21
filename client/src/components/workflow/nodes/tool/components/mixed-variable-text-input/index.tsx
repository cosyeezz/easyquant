import {
  memo,
} from 'react'
import { useTranslation } from 'react-i18next'
// import PromptEditor from '@/app/components/base/prompt-editor'
import Input from '@/app/components/base/input'
import Placeholder from './placeholder'
import type {
  Node,
  NodeOutPutVar,
} from '@/app/components/workflow/types'
import { BlockEnum } from '@/app/components/workflow/types'
import cn from '@/utils/classnames'
import { useStore } from '@/app/components/workflow/store'

type MixedVariableTextInputProps = {
  readOnly?: boolean
  nodesOutputVars?: NodeOutPutVar[]
  availableNodes?: Node[]
  value?: string
  onChange?: (text: string) => void
  showManageInputField?: boolean
  onManageInputField?: () => void
  disableVariableInsertion?: boolean
}
const MixedVariableTextInput = ({
  readOnly = false,
  nodesOutputVars,
  availableNodes = [],
  value = '',
  onChange,
  showManageInputField,
  onManageInputField,
  disableVariableInsertion = false,
}: MixedVariableTextInputProps) => {
  const { t } = useTranslation()
  const controlPromptEditorRerenderKey = useStore(s => s.controlPromptEditorRerenderKey)

  return (
    <Input
      key={controlPromptEditorRerenderKey}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      disabled={readOnly}
    />
    // <PromptEditor
    //   ...
    // />
  )
}

export default memo(MixedVariableTextInput)
