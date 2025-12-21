import { create } from 'zustand'

export const useStore = create<any>((set) => ({
  appDetail: { id: 'mock-app-id' },
  appSidebarExpand: 'expand',
}))
