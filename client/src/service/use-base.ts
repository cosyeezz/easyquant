import { useQueryClient } from '@tanstack/react-query'

/**
 * Mocked utility hooks for React Query cache management.
 */

export const useInvalid = (queryKey?: any[]) => {
  const queryClient = useQueryClient()
  return (customKey?: any[]) => {
    queryClient.invalidateQueries({
      queryKey: customKey || queryKey,
    })
  }
}

export const useReset = (queryKey?: any[]) => {
  const queryClient = useQueryClient()
  return (customKey?: any[]) => {
    queryClient.resetQueries({
      queryKey: customKey || queryKey,
    })
  }
}
