import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import VersionHistory from './index'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockVersions = [
  {
    id: 'v2',
    version: '1.0.1',
    timestamp: 1703581200000,
    author: 'Alice',
    message: 'Fixed bug',
    current: true,
  },
  {
    id: 'v1',
    version: '1.0.0',
    timestamp: 1703577600000,
    author: 'Bob',
    message: 'Initial commit',
    current: false,
  },
]

describe('VersionHistory Component', () => {
  it('renders version list correctly', () => {
    const onRestore = vi.fn()
    render(<VersionHistory versions={mockVersions} onRestore={onRestore} />)

    expect(screen.getByText('1.0.1')).toBeInTheDocument()
    expect(screen.getByText('1.0.0')).toBeInTheDocument()
    expect(screen.getByText('Fixed bug')).toBeInTheDocument()
    expect(screen.getByText('Initial commit')).toBeInTheDocument()
  })

  it('shows current badge for the current version', () => {
    const onRestore = vi.fn()
    render(<VersionHistory versions={mockVersions} onRestore={onRestore} />)

    const currentBadge = screen.getByText('Current')
    expect(currentBadge).toBeInTheDocument()
  })

  it('calls onRestore when restore button is clicked', () => {
    const onRestore = vi.fn()
    render(<VersionHistory versions={mockVersions} onRestore={onRestore} />)

    const restoreButtons = screen.getAllByText('Restore')
    fireEvent.click(restoreButtons[0])

    expect(onRestore).toHaveBeenCalledWith('v1')
  })
})