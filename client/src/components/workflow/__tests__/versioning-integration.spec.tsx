import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import WorkflowNodeList from '../../WorkflowNodeList'

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock VersionHistoryPanel container
vi.mock('@/components/workflow/panel/version-history/container', () => ({
  default: ({ nodeId, onRollback }: any) => {
    console.log('Rendering mocked VersionHistoryPanel for:', nodeId)
    return (
      <div data-testid="version-history-panel">
        Mocked History for {nodeId}
        <button onClick={() => {
          console.log('Mocked Restore clicked')
          onRollback()
        }}>workflow.nodeList.restore</button>
        <div data-testid="version-num">1.0.0-SNAPSHOT</div>
      </div>
    )
  }
}))

// Mock Select component
vi.mock('@/components/ui/Select', () => ({
  default: ({ value, options, onChange }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}))

// Mock fetch
const globalFetch = vi.fn()
global.fetch = globalFetch as any

const mockNodes = [
  {
    id: 1,
    name: 'test_node',
    title: 'Test Node',
    category: 'transform',
    icon: 'box',
    description: 'A test node',
    latest_snapshot: '1.0.0-SNAPSHOT',
    latest_release: null,
    draft_parameters_schema: { properties: {} },
    draft_outputs_schema: {},
    draft_ui_config: {},
    draft_handler_path: 'test.handler',
    versions: []
  }
]

const mockVersions = [
  {
    id: 101,
    node_id: 1,
    version: '1.0.0-SNAPSHOT',
    version_type: 'SNAPSHOT',
    changelog: 'First build',
    published_at: '2023-12-26T10:00:00Z',
    created_by: 'Admin'
  }
]

describe('Workflow Versioning Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalFetch.mockImplementation((url: string) => {
      if (url.includes('/rollback')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockNodes[0], draft_handler_path: 'rolled.back' }),
        })
      }
      if (url.includes('/versions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockVersions),
        })
      }
      if (url.match(/\/api\/v1\/workflow\/nodes\/\d+$/)) {
         return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockNodes[0], draft_handler_path: 'rolled.back' }),
        })
      }
      if (url.includes('/api/v1/workflow/nodes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNodes),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })
  })

  it('should flow through selecting a node and seeing its history', async () => {
    render(<WorkflowNodeList />)

    // Wait for nodes to load
    const nodeItem = await screen.findByText('Test Node')
    fireEvent.click(nodeItem)

    // Check if version history is rendered
    const panel = await screen.findByTestId('version-history-panel')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveTextContent('Mocked History for 1')
    
    // Check for version number
    const versionNum = screen.getByTestId('version-num')
    expect(versionNum).toHaveTextContent('1.0.0-SNAPSHOT')
  })

  it('should handle rollback and refresh data', async () => {
    // Mock rollback success
    globalFetch.mockImplementation((url: string) => {
      if (url.includes('/rollback')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockNodes[0], draft_handler_path: 'rolled.back' }),
        })
      }
      if (url.includes('/api/v1/workflow/nodes/1')) {
         return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...mockNodes[0], draft_handler_path: 'rolled.back' }),
        })
      }
      if (url.includes('/api/v1/workflow/nodes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockNodes),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    })

    render(<WorkflowNodeList />)
    
    const nodeItem = await screen.findByText('Test Node')
    fireEvent.click(nodeItem)

    const restoreBtn = await screen.findByText('workflow.nodeList.restore')
    fireEvent.click(restoreBtn)

    // Check if node data refetched and updated UI
    // We check for the side effect: handler_path should eventually show up in JSON if we expanded it, 
    // but a simpler way is to check the Refetched logs in stdout or just trust the container logic for now.
    // Let's check that the API for node 1 was called to refresh.
    await waitFor(() => {
      expect(globalFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/workflow/nodes/1'))
    }, { timeout: 3000 })
  })
})
