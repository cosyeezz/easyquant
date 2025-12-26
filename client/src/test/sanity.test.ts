import { describe, it, expect } from 'vitest'

describe('Environment Sanity Check', () => {
  it('should support vitest globals', () => {
    expect(true).toBe(true)
  })

  it('should support jest shim', () => {
    const mockFn = jest.fn()
    mockFn()
    expect(mockFn).toHaveBeenCalled()
  })
})
