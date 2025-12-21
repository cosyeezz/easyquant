'use client'

import { useCallback, useMemo, useState } from 'react'
import { createContext, useContext, useContextSelector } from 'use-context-selector'
import type { FC, ReactNode } from 'react'
import type { ICurrentWorkspace, LangGeniusVersionResponse, UserProfileResponse } from '@/models/common'
import { noop } from 'lodash-es'

export type AppContextValue = {
  userProfile: UserProfileResponse
  mutateUserProfile: VoidFunction
  currentWorkspace: ICurrentWorkspace
  isCurrentWorkspaceManager: boolean
  isCurrentWorkspaceOwner: boolean
  isCurrentWorkspaceEditor: boolean
  isCurrentWorkspaceDatasetOperator: boolean
  mutateCurrentWorkspace: VoidFunction
  langGeniusVersionInfo: LangGeniusVersionResponse
  useSelector: typeof useSelector
  isLoadingCurrentWorkspace: boolean
}

const userProfilePlaceholder: UserProfileResponse = {
  id: 'standalone',
  name: 'Standalone User',
  email: 'user@example.com',
  avatar: '',
  avatar_url: '',
  is_password_set: true,
} as any

const initialLangGeniusVersionInfo: LangGeniusVersionResponse = {
  current_env: 'standalone',
  current_version: '1.0.0',
  latest_version: '1.0.0',
  release_date: '',
  release_notes: '',
  version: '1.0.0',
  can_auto_update: false,
}

const initialWorkspaceInfo: ICurrentWorkspace = {
  id: 'default',
  name: 'Default Workspace',
  plan: 'standalone',
  status: 'active',
  created_at: Date.now(),
  role: 'owner',
  providers: [],
}

const AppContext = createContext<AppContextValue>({
  userProfile: userProfilePlaceholder,
  currentWorkspace: initialWorkspaceInfo,
  isCurrentWorkspaceManager: true,
  isCurrentWorkspaceOwner: true,
  isCurrentWorkspaceEditor: true,
  isCurrentWorkspaceDatasetOperator: true,
  mutateUserProfile: noop,
  mutateCurrentWorkspace: noop,
  langGeniusVersionInfo: initialLangGeniusVersionInfo,
  useSelector,
  isLoadingCurrentWorkspace: false,
})

export function useSelector<T>(selector: (value: AppContextValue) => T): T {
  return useContextSelector(AppContext, selector)
}

export const useAppContext = () => useContext(AppContext)

export const AppContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AppContext.Provider
      value={{
        userProfile: userProfilePlaceholder,
        currentWorkspace: initialWorkspaceInfo,
        isCurrentWorkspaceManager: true,
        isCurrentWorkspaceOwner: true,
        isCurrentWorkspaceEditor: true,
        isCurrentWorkspaceDatasetOperator: true,
        mutateUserProfile: noop,
        mutateCurrentWorkspace: noop,
        langGeniusVersionInfo: initialLangGeniusVersionInfo,
        useSelector,
        isLoadingCurrentWorkspace: false,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export default AppContext