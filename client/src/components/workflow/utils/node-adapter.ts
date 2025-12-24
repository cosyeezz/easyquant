import { BlockEnum } from '../types'
import { BlockClassificationEnum } from '../block-selector/types'
import type { NodeDefault, Var } from '../types'
import { VarType } from '../types'

export type DbNodeDefinition = {
  id: number
  name: string // e.g. 'csv_loader'
  title: string
  category: string // 'input', 'transform'
  type: string // 'generic', 'custom'
  icon?: string
  description?: string
  parameters_schema: {
    properties: Record<string, any>
    required: string[]
  }
  outputs_schema: Record<string, any>
  ui_config: any
  handler_path: string
}

const mapCategoryToClassification = (category: string): BlockClassificationEnum => {
  switch (category) {
    case 'input': return BlockClassificationEnum.Data
    case 'output': return BlockClassificationEnum.Data
    case 'data': return BlockClassificationEnum.Data
    case 'transform': return BlockClassificationEnum.Transform
    case 'quant': return BlockClassificationEnum.Quant
    case 'strategy': return BlockClassificationEnum.Logic
    case 'logic': return BlockClassificationEnum.Logic
    case 'question-understand': return BlockClassificationEnum.QuestionUnderstand
    case 'problem_understanding': return BlockClassificationEnum.QuestionUnderstand
    case 'utilities': return BlockClassificationEnum.Utilities
    default: return BlockClassificationEnum.Default
  }
}

const mapCategoryToBlockEnum = (category: string, name: string): BlockEnum => {
    // This is a bit of a hack since BlockEnum is an enum.
    // We should ideally extend BlockEnum or use a string type for custom nodes.
    // For now, we cast the name to BlockEnum as we are adding dynamic nodes.
    return name as BlockEnum
}

export const convertDbNodeToNodeDefault = (dbNode: DbNodeDefinition): NodeDefault => {
  const nodeType = mapCategoryToBlockEnum(dbNode.category, dbNode.name)
  
  // 1. Build Default Value
  const defaultValue: Record<string, any> = {}
  if (dbNode.parameters_schema?.properties) {
    Object.entries(dbNode.parameters_schema.properties).forEach(([key, schema]) => {
      if (schema.default !== undefined) {
        defaultValue[key] = schema.default
      }
    })
  }

  return {
    metaData: {
      classification: mapCategoryToClassification(dbNode.category),
      sort: 0,
      type: nodeType,
      title: dbNode.title,
      author: 'User',
      description: dbNode.description,
      isStart: dbNode.category === 'input',
    },
    defaultValue,
    checkValid: (payload: any, t: any) => {
      let isValid = true
      let errorMessage = ''
      
      const requiredFields = dbNode.parameters_schema?.required || []
      for (const field of requiredFields) {
        if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
          isValid = false
          errorMessage = `${field} is required`
          break
        }
      }
      return { isValid, errorMessage }
    },
    getOutputVars: (payload: any) => {
      const vars: Var[] = []
      if (dbNode.outputs_schema) {
        Object.entries(dbNode.outputs_schema).forEach(([key, schema]) => {
           // Map string types to VarType
           let type = VarType.string
           if (schema.type === 'df') type = VarType.arrayObject
           else if (schema.type === 'number') type = VarType.number
           else if (schema.type === 'json') type = VarType.object
           
           vars.push({
             variable: key,
             type: type,
             des: schema.description
           })
        })
      }
      return vars
    }
  }
}
