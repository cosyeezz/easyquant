'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useState } from 'react'
import { createContext, useContext, useContextSelector } from 'use-context-selector'

export type ModalContextState = {
  setShowAccountSettingModal: (payload: any) => void
  setShowModerationSettingModal: (payload: any) => void
  setShowExternalDataToolModal: (payload: any) => void
  setShowPricingModal: () => void
  setShowAnnotationFullModal: () => void
  setShowModelModal: (payload: any) => void
  setShowExternalKnowledgeAPIModal: (payload: any) => void
  setShowModelLoadBalancingModal: (payload: any) => void
  setShowOpeningSettingModal: (payload: any) => void
  setShowUpdatePluginModal: (payload: any) => void
  setShowApiBasedExtensionModal: (payload: any) => void
  setShowExpireNoticeModal: (payload: any) => void
  setShowTriggerEventsLimitModal: (payload: any) => void
}

const ModalContext = createContext<ModalContextState>({
  setShowAccountSettingModal: () => {},
  setShowModerationSettingModal: () => {},
  setShowExternalDataToolModal: () => {},
  setShowPricingModal: () => {},
  setShowAnnotationFullModal: () => {},
  setShowModelModal: () => {},
  setShowExternalKnowledgeAPIModal: () => {},
  setShowModelLoadBalancingModal: () => {},
  setShowOpeningSettingModal: () => {},
  setShowUpdatePluginModal: () => {},
  setShowApiBasedExtensionModal: () => {},
  setShowExpireNoticeModal: () => {},
  setShowTriggerEventsLimitModal: () => {},
})

export const useModalContext = () => useContext(ModalContext)

export const ModalContextProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  // Mock implementations that do nothing
  const setShowAccountSettingModal = useCallback(() => {}, [])
  const setShowModerationSettingModal = useCallback(() => {}, [])
  const setShowExternalDataToolModal = useCallback(() => {}, [])
  const setShowPricingModal = useCallback(() => {}, [])
  const setShowAnnotationFullModal = useCallback(() => {}, [])
  const setShowModelModal = useCallback(() => {}, [])
  const setShowExternalKnowledgeAPIModal = useCallback(() => {}, [])
  const setShowModelLoadBalancingModal = useCallback(() => {}, [])
  const setShowOpeningSettingModal = useCallback(() => {}, [])
  const setShowUpdatePluginModal = useCallback(() => {}, [])
  const setShowApiBasedExtensionModal = useCallback(() => {}, [])
  const setShowExpireNoticeModal = useCallback(() => {}, [])
  const setShowTriggerEventsLimitModal = useCallback(() => {}, [])

  return (
    <ModalContext.Provider
      value={{
        setShowAccountSettingModal,
        setShowModerationSettingModal,
        setShowExternalDataToolModal,
        setShowPricingModal,
        setShowAnnotationFullModal,
        setShowModelModal,
        setShowExternalKnowledgeAPIModal,
        setShowModelLoadBalancingModal,
        setShowOpeningSettingModal,
        setShowUpdatePluginModal,
        setShowApiBasedExtensionModal,
        setShowExpireNoticeModal,
        setShowTriggerEventsLimitModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export default ModalContext