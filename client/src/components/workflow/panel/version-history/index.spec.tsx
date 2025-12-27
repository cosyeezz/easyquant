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

const mockVersions: any[] = [
  {
    id: 'v2',
    version: '1.0.1',
    versionType: 'RELEASE',
    timestamp: 1703581200000,
    author: 'Alice',
    message: 'Fixed bug',
    current: true,
  },
  {
    id: 'v1',
    version: '1.0.0',
    versionType: 'RELEASE',
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

  it('calls onRestore when restore button is clicked', () => {
    const onRestore = vi.fn()
    render(<VersionHistory versions={mockVersions} onRestore={onRestore} />)

    const restoreButtons = screen.getAllByText('workflow.nodeList.restoreToDraft')
    fireEvent.click(restoreButtons[0])

    // Wait for modal and confirm
    const confirmBtn = screen.getByText('common.confirm')
    fireEvent.click(confirmBtn)

    expect(onRestore).toHaveBeenCalledWith('v2') // First one in mock is v2
  })
})