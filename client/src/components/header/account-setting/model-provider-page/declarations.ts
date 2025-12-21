export enum ModelTypeEnum {
  textGeneration = 'llm',
  embeddings = 'text-embedding',
  speech2text = 'speech2text',
  tts = 'tts',
  rerank = 'rerank',
  moderation = 'moderation',
}

export enum FormTypeEnum {
  textInput = 'text-input',
  secretInput = 'secret-input',
  select = 'select',
  checkbox = 'checkbox',
  dropdown = 'dropdown',
  radio = 'radio',
  switch = 'switch',
  modelSelector = 'model-selector',
  toolSelector = 'tool-selector',
  multiToolSelector = 'multi-tool-selector',
  appSelector = 'app-selector',
  textNumber = 'text-number',
  file = 'file',
  files = 'files',
  boolean = 'boolean',
  object = 'object',
  array = 'array',
  dynamicSelect = 'dynamic-select',
  any = 'any',
}

export enum ModelFeatureEnum {
  vision = 'vision',
  multiModal = 'multi-modal',
  toolCall = 'tool-call',
  agent = 'agent',
}

export type ModelProvider = {
  provider: string
  label: Record<string, string>
  icon_small: Record<string, string>
  icon_large: Record<string, string>
  supported_model_types: ModelTypeEnum[]
}

export type ModelItem = {
  id: string
  model: string
  model_type: ModelTypeEnum
}

export type DefaultModelResponse = {
  model: string
  model_type: ModelTypeEnum
  provider: {
    provider: string
    label: Record<string, string>
  }
}

export type ModelParameterRule = {
  name: string
  label: Record<string, string>
  type: string
  default: any
  min?: number
  max?: number
  options?: string[]
}

export type ModelLoadBalancingConfig = {
  enabled: boolean
  configs: any[]
}

export type TypeWithI18N<T> = Record<string, T>