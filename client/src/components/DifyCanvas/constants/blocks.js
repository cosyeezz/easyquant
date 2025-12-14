export const BlockEnum = {
  Start: 'start',
  End: 'end',
  Answer: 'answer',
  LLM: 'llm',
  KnowledgeRetrieval: 'knowledge-retrieval',
  QuestionClassifier: 'question-classifier',
  IfElse: 'if-else',
  Code: 'code',
  TemplateTransform: 'template-transform',
  HttpRequest: 'http-request',
  VariableAggregator: 'variable-aggregator',
  Assigner: 'assigner',
  ParameterExtractor: 'parameter-extractor',
  Iteration: 'iteration',
  Loop: 'loop',
  DocExtractor: 'doc-extractor',
  ListFilter: 'list-filter',
  Agent: 'agent',
};

export const BlockClassificationEnum = {
  Default: '-',
  QuestionUnderstand: 'question-understand',
  Logic: 'logic',
  Transform: 'transform',
  Utilities: 'utilities',
};

export const BLOCK_CLASSIFICATIONS = [
  BlockClassificationEnum.Default,
  BlockClassificationEnum.QuestionUnderstand,
  BlockClassificationEnum.Logic,
  BlockClassificationEnum.Transform,
  BlockClassificationEnum.Utilities,
];

export const BLOCKS = [
  {
    classification: BlockClassificationEnum.Default,
    type: BlockEnum.LLM,
    title: 'LLM',
    description: 'Invokes the large language model to process input or generate text.',
    icon: 'RiBrainLine'
  },
  {
    classification: BlockClassificationEnum.Default,
    type: BlockEnum.KnowledgeRetrieval,
    title: 'Knowledge Retrieval',
    description: 'Query text from the knowledge base as context.',
    icon: 'RiBookOpenLine'
  },
  {
    classification: BlockClassificationEnum.Default,
    type: BlockEnum.End,
    title: 'End',
    description: 'Defines the final output of the workflow.',
    icon: 'RiStopCircleLine'
  },
  {
    classification: BlockClassificationEnum.Default,
    type: BlockEnum.Answer,
    title: 'Direct Answer',
    description: 'Directly replies to the user message.',
    icon: 'RiMessage2Line'
  },
  {
    classification: BlockClassificationEnum.QuestionUnderstand,
    type: BlockEnum.QuestionClassifier,
    title: 'Question Classifier',
    description: 'Classifies the user input to direct the downstream flow.',
    icon: 'RiGitBranchLine'
  },
  {
    classification: BlockClassificationEnum.Logic,
    type: BlockEnum.IfElse,
    title: 'IF/ELSE',
    description: 'Splits the workflow based on conditions.',
    icon: 'RiSplitCellsHorizontal'
  },
  {
    classification: BlockClassificationEnum.Logic,
    type: BlockEnum.Iteration,
    title: 'Iteration',
    description: 'Executes steps on a list of items.',
    icon: 'RiLoopLeftLine'
  },
  {
    classification: BlockClassificationEnum.Transform,
    type: BlockEnum.Code,
    title: 'Code',
    description: 'Executes custom Python or JavaScript code.',
    icon: 'RiCodeBoxLine'
  },
  {
    classification: BlockClassificationEnum.Transform,
    type: BlockEnum.TemplateTransform,
    title: 'Template Transform',
    description: 'Uses Jinja2 to format data strings.',
    icon: 'RiFileTextLine'
  },
  {
    classification: BlockClassificationEnum.Utilities,
    type: BlockEnum.HttpRequest,
    title: 'HTTP Request',
    description: 'Sends requests to external APIs.',
    icon: 'RiGlobalLine'
  },
];
