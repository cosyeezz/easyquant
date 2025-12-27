import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Blocks from '../blocks'
import { BlockEnum, VarType } from '../../types'
import { BlockClassificationEnum } from '../types'

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('reactflow', () => ({
  useStoreApi: () => ({
    getState: () => ({
      getNodes: () => [],
    }),
  }),
}))

vi.mock('../hooks', () => ({
  useBlocks: () => [],
}))

// Mock icons
vi.mock('@remixicon/react', () => ({
  RiAppsLine: () => <div data-testid="icon-apps" />,
  RiDatabase2Line: () => <div data-testid="icon-data" />,
  RiStockLine: () => <div data-testid="icon-quant" />,
  RiBrainLine: () => <div data-testid="icon-brain" />,
  RiGitMergeLine: () => <div data-testid="icon-logic" />,
  RiCodeSSlashLine: () => <div data-testid="icon-transform" />,
  RiToolsLine: () => <div data-testid="icon-tools" />,
  RiArrowRightSLine: () => <div data-testid="icon-arrow-right" />,
  RiArrowDownSLine: () => <div data-testid="icon-arrow-down" />,
  RiHistoryLine: () => <div data-testid="icon-history" />,
}))

// Mock BlockIcon
vi.mock('../block-icon', () => ({
  default: () => <div data-testid="block-icon" />,
}))

const mockBlocks: any[] = [
  {
    metaData: {
      classification: BlockClassificationEnum.Default, // Use default to match initial state
      type: BlockEnum.LLM,
      title: 'LLM Node',
      description: 'Run LLM',
      versions: [
        { version: '1.1.0', version_type: 'RELEASE', published_at: '2023-12-26' },
        { version: '1.0.0', version_type: 'RELEASE', published_at: '2023-12-25' },
      ],
      recommendedVersion: '1.1.0',
      dbId: 12,
    },
    defaultValue: {},
    checkValid: () => ({ isValid: true }),
  }
]

describe('Blocks Component - Versioning', () => {
  it('renders node item and shows version info if available', () => {
    const onSelect = vi.fn()
    render(
      <Blocks
        searchText=""
        onSelect={onSelect}
        availableBlocksTypes={[BlockEnum.LLM]}
        blocks={mockBlocks}
      />
    )

    expect(screen.getByText('LLM Node')).toBeInTheDocument()
    expect(screen.getByText('1.1.0')).toBeInTheDocument()
  })

  it('expands version list when node is clicked', () => {
    const onSelect = vi.fn()
    render(
      <Blocks
        searchText=""
        onSelect={onSelect}
        availableBlocksTypes={[BlockEnum.LLM]}
        blocks={mockBlocks}
      />
    )

    const nodeItem = screen.getByText('LLM Node')
    fireEvent.click(nodeItem)

    expect(screen.getByText('1.0.0')).toBeInTheDocument()
    expect(screen.getAllByText('RELEASE')).toHaveLength(2) // One in tooltip (hidden), one in list. Or just 2 in list? Actually 2 versions have RELEASE
  })

  it('calls onSelect with version info when a version is clicked', () => {
    const onSelect = vi.fn()
    render(
      <Blocks
        searchText=""
        onSelect={onSelect}
        availableBlocksTypes={[BlockEnum.LLM]}
        blocks={mockBlocks}
      />
    )

    // Expand
    fireEvent.click(screen.getByText('LLM Node'))

    // Click version 1.0.0
    const versionItem = screen.getByText('1.0.0')
    fireEvent.click(versionItem)

    expect(onSelect).toHaveBeenCalledWith(BlockEnum.LLM, {
      node_id: 12,
      version: '1.0.0'
    })
  })
})
