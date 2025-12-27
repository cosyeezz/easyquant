import React, { useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Clock, Tag, Package, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

export type VersionHistoryProps = {
  versions: Array<{
    id: string
    version: string
    versionType: 'SNAPSHOT' | 'RELEASE'
    timestamp: number
    author: string
    message: string
    current: boolean
  }>
  onRestore: (versionId: string) => void
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, onRestore }) => {
  const { t } = useTranslation()
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  const [releasesExpanded, setReleasesExpanded] = useState(true)
  const [snapshotsExpanded, setSnapshotsExpanded] = useState(true)

  const releases = versions.filter(v => v.versionType === 'RELEASE')
  const snapshots = versions.filter(v => v.versionType === 'SNAPSHOT')

  const handleRestoreClick = (versionId: string) => {
    setConfirmRestore(versionId)
  }

  const handleConfirmRestore = () => {
    if (confirmRestore) {
      onRestore(confirmRestore)
      setConfirmRestore(null)
    }
  }

  const VersionItem = ({ v }: { v: typeof versions[0] }) => (
    <div className="p-3 hover:bg-eq-bg-elevated/50 transition-colors group border-b border-eq-border-subtle/50 last:border-b-0">
      <div className="flex items-center justify-between mb-1">
        <span className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded ${
          v.versionType === 'RELEASE'
            ? 'text-eq-success-text bg-eq-success-bg border border-eq-success-border'
            : 'text-eq-warning-text bg-eq-warning-bg border border-eq-warning-border'
        }`}>
          {v.version}
        </span>
        <span className="text-[10px] text-eq-text-muted">
          {dayjs(v.timestamp).format('MM/DD HH:mm')}
        </span>
      </div>

      <div className="text-xs text-eq-text-secondary mb-1 truncate">
        {v.message}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-eq-text-muted">
          {v.author}
        </span>

        <button
          onClick={() => handleRestoreClick(v.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-eq-primary-500 hover:text-eq-primary-600 px-2 py-0.5 rounded hover:bg-eq-primary-500/10"
        >
          {t('workflow.nodeList.restoreToDraft')}
        </button>
      </div>
    </div>
  )

  return (
    <section className="mt-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-eq-border-subtle">
        <Clock className="w-3.5 h-3.5 text-eq-text-muted" />
        <span className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">
          {t('workflow.nodeList.versionHistory')}
        </span>
        <span className="text-[10px] text-eq-text-muted font-mono bg-eq-bg-elevated px-1.5 py-0.5 rounded">
          {versions.length}
        </span>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-6 text-eq-text-muted text-xs">
          {t('workflow.nodeList.noVersions')}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Releases Section */}
          {releases.length > 0 && (
            <div className="border border-eq-border-subtle rounded-lg overflow-hidden">
              <button
                onClick={() => setReleasesExpanded(!releasesExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-eq-success-bg/30 hover:bg-eq-success-bg/50 transition-colors"
              >
                {releasesExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Tag className="w-3 h-3 text-eq-success-text" />
                <span className="text-[11px] font-semibold text-eq-success-text">{t('workflow.nodeList.releaseVersion')}</span>
                <span className="text-[10px] text-eq-text-muted ml-auto">{releases.length}</span>
              </button>
              {releasesExpanded && (
                <div className="bg-eq-bg-surface">
                  {releases.map(v => <VersionItem key={v.id} v={v} />)}
                </div>
              )}
            </div>
          )}

          {/* Snapshots Section */}
          {snapshots.length > 0 && (
            <div className="border border-eq-border-subtle rounded-lg overflow-hidden">
              <button
                onClick={() => setSnapshotsExpanded(!snapshotsExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-eq-warning-bg/30 hover:bg-eq-warning-bg/50 transition-colors"
              >
                {snapshotsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Package className="w-3 h-3 text-eq-warning-text" />
                <span className="text-[11px] font-semibold text-eq-warning-text">{t('workflow.nodeList.snapshotVersion')}</span>
                <span className="text-[10px] text-eq-text-muted ml-auto">{snapshots.length}</span>
              </button>
              {snapshotsExpanded && (
                <div className="bg-eq-bg-surface">
                  {snapshots.map(v => <VersionItem key={v.id} v={v} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmRestore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1a1a1c] rounded-xl p-5 max-w-sm w-full mx-4 border border-eq-border-subtle shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-eq-warning-bg rounded-full">
                <AlertTriangle className="w-5 h-5 text-eq-warning-text" />
              </div>
              <div>
                <h3 className="font-semibold text-eq-text-primary">{t('workflow.nodeList.restoreConfirmTitle')}</h3>
                <p className="text-xs text-eq-text-secondary mt-1">
                  {t('workflow.nodeList.restoreConfirmDesc')}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRestore(null)}
                className="px-3 py-1.5 text-xs font-medium text-eq-text-secondary hover:text-eq-text-primary rounded transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-3 py-1.5 text-xs font-medium text-white bg-eq-warning-text hover:bg-orange-600 rounded transition-colors"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default VersionHistory
