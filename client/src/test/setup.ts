import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Shim jest with vi for compatibility
globalThis.jest = {
  ...vi,
  fn: vi.fn,
  mock: vi.mock,
  spyOn: vi.spyOn,
  useFakeTimers: vi.useFakeTimers,
  setSystemTime: vi.setSystemTime,
  useRealTimers: vi.useRealTimers,
  clearAllMocks: vi.clearAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  requireActual: vi.importActual, // vi.importActual is async, jest.requireActual is sync. This might be tricky.
} as any

// Some tests might rely on sync requireActual which Vitest doesn't fully support in the same way. 
// For now, we'll try basic shimming.