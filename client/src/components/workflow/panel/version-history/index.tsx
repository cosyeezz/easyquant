import React from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import cn from 'classnames'

export type VersionHistoryProps = {
  versions: Array<{
    id: string
    version: string
    timestamp: number
    author: string
    message: string
    current: boolean
  }>
  onRestore: (versionId: string) => void
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, onRestore }) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-[300px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 font-medium text-gray-900">
          <Clock className="w-4 h-4" />
          <span>Version History</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {versions.map((v) => (
            <div key={v.id} className="p-4 hover:bg-gray-50 transition-colors group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                    {v.version}
                  </span>
                  {v.current && (
                    <span className="text-[10px] uppercase font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100">
                      Current
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {dayjs(v.timestamp).format('MM/DD HH:mm')}
                </span>
              </div>
              
              <div className="text-sm text-gray-900 mb-1 font-medium truncate">
                {v.message}
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  by {v.author}
                </span>
                
                {!v.current && (
                  <button
                    onClick={() => onRestore(v.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VersionHistory
