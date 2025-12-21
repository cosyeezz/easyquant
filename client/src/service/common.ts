import { defaultSystemFeatures } from '@/types/feature'

export const getSystemFeatures = async () => defaultSystemFeatures
export const fetchUserProfile = async () => ({})
export const fetchCurrentWorkspace = async () => ({})
export const fetchModelProviders = async () => ({ data: [] })
export const fetchModelList = async () => ({ data: [] })
export const fetchDefaultModal = async () => ({ data: {} })
export const fetchModelParameterRules = async () => ({ data: [] })
export const uploadRemoteFileInfo = async () => ({})
export const uploadFile = async () => ({})
