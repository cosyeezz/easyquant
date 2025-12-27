import React, { useState, useEffect, useCallback } from 'react'
import VersionHistory from './index'

type VersionHistoryContainerProps = {
  nodeId: string
  onRollback: () => void
}

type ApiVersion = {
  id: string
  node_id: string
  version: string
  version_type: 'SNAPSHOT' | 'RELEASE'
  changelog: string
  published_at: string
  created_by: string
}

const VersionHistoryContainer: React.FC<VersionHistoryContainerProps> = ({ nodeId, onRollback }) => {
  const [versions, setVersions] = useState<ApiVersion[]>([])
  const [loading, setLoading] = useState(false)

  const fetchVersions = useCallback(async () => {
    if (!nodeId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/workflow/nodes/${nodeId}/versions`)
      if (res.ok) {
        const data = await res.json()
        setVersions(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch versions:', err)
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  const handleRollback = async (versionId: string) => {
    const version = versions.find(v => v.id === versionId)
    if (!version) return

    try {
      const res = await fetch(`/api/v1/workflow/nodes/${nodeId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: version.version })
      })
      if (res.ok) {
        onRollback?.()
        fetchVersions() 
      }
    } catch (err) {
      console.error('Rollback failed:', err)
    }
  }

  // Map API data to component props
  const mappedVersions = (versions || []).map(v => ({
    id: v.id,
    version: v.version,
    timestamp: new Date(v.published_at).getTime(),
    author: v.created_by || 'Unknown',
    message: v.changelog || (v.version_type === 'RELEASE' ? 'Release' : 'Snapshot'),
    current: false 
  }))

  return (
    <VersionHistory
      versions={mappedVersions}
      onRestore={handleRollback}
    />
  )
}

export default VersionHistoryContainer
