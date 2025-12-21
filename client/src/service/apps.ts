import type { ApiKeysListResponse, AppDailyConversationsResponse, AppDailyEndUsersResponse, AppDailyMessagesResponse, AppDetailResponse, AppListResponse, AppStatisticsResponse, AppTemplatesResponse, AppTokenCostsResponse, AppVoicesListResponse, CreateApiKeyResponse, DSLImportResponse, GenerationIntroductionResponse, TracingConfig, TracingStatus, UpdateAppModelConfigResponse, UpdateAppSiteCodeResponse, UpdateOpenAIKeyResponse, ValidateOpenAIKeyResponse, WebhookTriggerResponse, WorkflowDailyConversationsResponse } from '@/models/app'
import type { CommonResponse } from '@/models/common'
import type { TracingProvider } from '@/app/(commonLayout)/app/(appDetailLayout)/[appId]/overview/tracing/type'

export const fetchAppList = ({ url, params }: { url: string; params?: Record<string, any> }): Promise<AppListResponse> => {
  return Promise.resolve({ data: [], total: 0, page: 1, limit: 10 } as unknown as AppListResponse)
}

export const fetchAppDetail = ({ url, id }: { url: string; id: string }): Promise<AppDetailResponse> => {
  return Promise.resolve({ id, name: 'Dummy App', mode: 'advanced-chat' } as unknown as AppDetailResponse)
}

// Direct API call function for non-SWR usage
export const fetchAppDetailDirect = async ({ url, id }: { url: string; id: string }): Promise<AppDetailResponse> => {
  return Promise.resolve({ id, name: 'Dummy App', mode: 'advanced-chat' } as unknown as AppDetailResponse)
}

export const fetchAppTemplates = ({ url }: { url: string }): Promise<AppTemplatesResponse> => {
  return Promise.resolve({ data: [] } as unknown as AppTemplatesResponse)
}

export const createApp = ({
  name,
}: {
  name: string
}): Promise<AppDetailResponse> => {
  return Promise.resolve({ id: 'new_app', name } as unknown as AppDetailResponse)
}

export const updateAppInfo = ({
  appID,
}: {
  appID: string
}): Promise<AppDetailResponse> => {
  return Promise.resolve({ id: appID } as unknown as AppDetailResponse)
}

export const copyApp = ({
  appID,
}: {
  appID: string
}): Promise<AppDetailResponse> => {
  return Promise.resolve({ id: 'copied_app' } as unknown as AppDetailResponse)
}

export const exportAppConfig = ({ appID }: { appID: string }): Promise<{ data: string }> => {
  return Promise.resolve({ data: '' })
}

export const importDSL = (): Promise<DSLImportResponse> => {
  return Promise.resolve({} as DSLImportResponse)
}

export const importDSLConfirm = (): Promise<DSLImportResponse> => {
  return Promise.resolve({} as DSLImportResponse)
}

export const switchApp = (): Promise<{ new_app_id: string }> => {
  return Promise.resolve({ new_app_id: 'new_id' })
}

export const deleteApp = (appID: string): Promise<CommonResponse> => {
  return Promise.resolve({ result: 'success' })
}

export const updateAppSiteStatus = (): Promise<AppDetailResponse> => {
  return Promise.resolve({} as AppDetailResponse)
}

export const updateAppApiStatus = (): Promise<AppDetailResponse> => {
  return Promise.resolve({} as AppDetailResponse)
}

// path: /apps/{appId}/rate-limit
export const updateAppRateLimit = (): Promise<AppDetailResponse> => {
  return Promise.resolve({} as AppDetailResponse)
}

export const updateAppSiteAccessToken = (): Promise<UpdateAppSiteCodeResponse> => {
  return Promise.resolve({} as UpdateAppSiteCodeResponse)
}

export const updateAppSiteConfig = (): Promise<AppDetailResponse> => {
  return Promise.resolve({} as AppDetailResponse)
}

export const getAppDailyMessages = (): Promise<AppDailyMessagesResponse> => {
  return Promise.resolve({ data: [] } as unknown as AppDailyMessagesResponse)
}

export const getAppDailyConversations = (): Promise<AppDailyConversationsResponse> => {
  return Promise.resolve({ data: [] } as unknown as AppDailyConversationsResponse)
}

export const getWorkflowDailyConversations = (): Promise<WorkflowDailyConversationsResponse> => {
  return Promise.resolve({ data: [] } as unknown as WorkflowDailyConversationsResponse)
}

export const getAppStatistics = (): Promise<AppStatisticsResponse> => {
  return Promise.resolve({ data: [] } as unknown as AppStatisticsResponse)
}

export const getAppDailyEndUsers = (): Promise<AppDailyEndUsersResponse> => {
  return Promise.resolve({ data: [] } as unknown as AppDailyEndUsersResponse)
}

export const getAppTokenCosts = (): Promise<AppTokenCostsResponse> => {
  return Promise.resolve({ data: [] } as unknown as AppTokenCostsResponse)
}

export const updateAppModelConfig = (): Promise<UpdateAppModelConfigResponse> => {
  return Promise.resolve({ result: 'success' })
}

// For temp testing
export const fetchAppListNoMock = (): Promise<AppListResponse> => {
  return Promise.resolve({ data: [] } as unknown as AppListResponse)
}

export const fetchApiKeysList = (): Promise<ApiKeysListResponse> => {
  return Promise.resolve({ data: [] } as unknown as ApiKeysListResponse)
}

export const delApikey = (): Promise<CommonResponse> => {
  return Promise.resolve({ result: 'success' })
}

export const createApikey = (): Promise<CreateApiKeyResponse> => {
  return Promise.resolve({} as CreateApiKeyResponse)
}

export const validateOpenAIKey = (): Promise<ValidateOpenAIKeyResponse> => {
  return Promise.resolve({ result: 'success' })
}

export const updateOpenAIKey = (): Promise<UpdateOpenAIKeyResponse> => {
  return Promise.resolve({ result: 'success' })
}

export const generationIntroduction = (): Promise<GenerationIntroductionResponse> => {
  return Promise.resolve({ introduction: '' } as GenerationIntroductionResponse)
}

export const fetchAppVoices = ({ appId, language }: { appId: string; language?: string }): Promise<AppVoicesListResponse> => {
  return Promise.resolve([] as unknown as AppVoicesListResponse)
}

// Tracing
export const fetchTracingStatus = ({ appId }: { appId: string }): Promise<TracingStatus> => {
  return Promise.resolve({ enabled: false, tracing_provider: null } as unknown as TracingStatus)
}

export const updateTracingStatus = ({ appId, body }: { appId: string; body: Record<string, any> }): Promise<CommonResponse> => {
  return Promise.resolve({ result: 'success' })
}

// Webhook Trigger
export const fetchWebhookUrl = ({ appId, nodeId }: { appId: string; nodeId: string }): Promise<WebhookTriggerResponse> => {
  return Promise.resolve({ webhook_url: '' } as WebhookTriggerResponse)
}

export const fetchTracingConfig = ({ appId, provider }: { appId: string; provider: TracingProvider }): Promise<TracingConfig & { has_not_configured: true }> => {
  return Promise.resolve({ has_not_configured: true } as unknown as TracingConfig & { has_not_configured: true })
}

export const addTracingConfig = ({ appId, body }: { appId: string; body: TracingConfig }): Promise<CommonResponse> => {
  return Promise.resolve({ result: 'success' })
}

export const updateTracingConfig = ({ appId, body }: { appId: string; body: TracingConfig }): Promise<CommonResponse> => {
  return Promise.resolve({ result: 'success' })
}

export const removeTracingConfig = ({ appId, provider }: { appId: string; provider: TracingProvider }): Promise<CommonResponse> => {
  return Promise.resolve({ result: 'success' })
}
