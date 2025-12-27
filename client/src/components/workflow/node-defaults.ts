import { BlockEnum } from '@/app/components/workflow/types'
import StartNodeDefault from '@/app/components/workflow/nodes/start/default'
import EndNodeDefault from '@/app/components/workflow/nodes/end/default'
import AnswerNodeDefault from '@/app/components/workflow/nodes/answer/default'
import LLMNodeDefault from '@/app/components/workflow/nodes/llm/default'
import KnowledgeRetrievalNodeDefault from '@/app/components/workflow/nodes/knowledge-retrieval/default'
import QuestionClassifierNodeDefault from '@/app/components/workflow/nodes/question-classifier/default'
import IfElseNodeDefault from '@/app/components/workflow/nodes/if-else/default'
import CodeNodeDefault from '@/app/components/workflow/nodes/code/default'
import TemplateTransformNodeDefault from '@/app/components/workflow/nodes/template-transform/default'
import HttpRequestNodeDefault from '@/app/components/workflow/nodes/http/default'
import VariableAssignerNodeDefault from '@/app/components/workflow/nodes/variable-assigner/default'
// import ToolNodeDefault from '@/app/components/workflow/nodes/tool/default' // Tool might be complex
import ParameterExtractorNodeDefault from '@/app/components/workflow/nodes/parameter-extractor/default'
import IterationNodeDefault from '@/app/components/workflow/nodes/iteration/default'
import DocExtractorNodeDefault from '@/app/components/workflow/nodes/document-extractor/default'
import LoopNodeDefault from '@/app/components/workflow/nodes/loop/default'
import ColumnMappingNodeDefault from '@/app/components/workflow/nodes/column-mapping/default'

export const nodes = [
  StartNodeDefault,
  EndNodeDefault,
  AnswerNodeDefault,
  LLMNodeDefault,
  KnowledgeRetrievalNodeDefault,
  QuestionClassifierNodeDefault,
  IfElseNodeDefault,
  CodeNodeDefault,
  TemplateTransformNodeDefault,
  HttpRequestNodeDefault,
  VariableAssignerNodeDefault,
  // ToolNodeDefault,
  ParameterExtractorNodeDefault,
  IterationNodeDefault,
  DocExtractorNodeDefault,
  LoopNodeDefault,
  ColumnMappingNodeDefault,
]

export const nodesMap = nodes.reduce((acc, node) => {
  acc[node.metaData.type] = node
  return acc
}, {} as Record<BlockEnum, any>)

export const availableNodesMetaData: any = {
  nodes,
  nodesMap,
}
