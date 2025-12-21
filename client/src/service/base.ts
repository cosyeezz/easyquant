/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Mocked Base Service for Frontend-only Canvas.
 * This file replaces the original base.ts which had heavy dependencies on 
 * authentication, SSE, and complex fetch logic.
 */

export type IOtherOptions = {
  isPublicAPI?: boolean
  isMarketplaceAPI?: boolean
  bodyStringify?: boolean
  needAllResponseContent?: boolean
  deleteContentType?: boolean
  silent?: boolean
  onData?: any
  onError?: any
  onCompleted?: any
  getAbortController?: (abortController: AbortController) => void
}

// Dummy request function that always resolves or rejects as needed for mocks
export const request = async <T>(url: string, options = {}, _otherOptions?: IOtherOptions): Promise<T> => {
  console.log(`[Mock Request] ${url}`, options)
  return Promise.resolve({} as T)
}

export const get = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, { ...options, method: 'GET' }, otherOptions)
}

export const post = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, { ...options, method: 'POST' }, otherOptions)
}

export const put = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, { ...options, method: 'PUT' }, otherOptions)
}

export const del = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, { ...options, method: 'DELETE' }, otherOptions)
}

export const patch = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, { ...options, method: 'PATCH' }, otherOptions)
}

// Public and Marketplace aliases
export const getPublic = get
export const getMarketplace = get
export const postPublic = post
export const postMarketplace = post
export const putPublic = put
export const delPublic = del
export const patchPublic = patch

// SSE Mock
export const ssePost = async (url: string, options: any, otherOptions: any) => {
  console.log(`[Mock SSE Post] ${url}`)
  otherOptions?.onCompleted?.()
}

// Upload Mock
export const upload = async (options: any): Promise<any> => {
  console.log('[Mock Upload]', options)
  return Promise.resolve({ id: 'mock-file-id' })
}

export const handleStream = () => {}