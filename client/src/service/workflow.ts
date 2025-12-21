export const fetchWorkflowDraft = async () => ({ graph: { nodes: [], edges: [] } })
export const syncWorkflowDraft = async () => ({})
export const fetchNodeInspectVars = async () => ({})
export const fetchAllInspectVars = async () => []
export const fetchNodeDefault = async (appId: string, blockType: string, params: any) => ({ config: {} })
export const fetchPipelineNodeDefault = async (pipelineId: string, blockType: string, params: any) => ({ config: {} })
export const getIterationSingleNodeRunUrl = async () => ''
export const getLoopSingleNodeRunUrl = async () => ''
export const singleNodeRun = async () => ({})
export const fetchWorkflowDraftWithIterInfo = async () => ({})
export const stopWorkflowRun = async () => ({})