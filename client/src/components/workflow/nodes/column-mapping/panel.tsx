import React, { FC, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNodeDataUpdate, useWorkflowHistory, WorkflowHistoryEvent } from '../../hooks'
import { ColumnPicker } from '../_base/components/column-picker'
import { RiDeleteBinLine, RiAddLine } from '@remixicon/react'

const ColumnMappingPanel: FC<any> = ({ id, data }) => {
  const { t } = useTranslation()
  const { handleNodeDataUpdateWithSyncDraft } = useNodeDataUpdate()
  const { saveStateToHistory } = useWorkflowHistory()
  
  const inputsSchema = data.inputs_schema || { columns: [] }
  const mapping = data.mapping || {}

  const handleUpdateMapping = useCallback((newMapping: Record<string, string>) => {
    handleNodeDataUpdateWithSyncDraft({
      id,
      data: { mapping: newMapping }
    })
    saveStateToHistory(WorkflowHistoryEvent.NodeFormChange, { nodeId: id })
  }, [handleNodeDataUpdateWithSyncDraft, id, saveStateToHistory])

  const handleAddRow = () => {
    const newMapping = { ...mapping, "": "" }
    handleUpdateMapping(newMapping)
  }

  const handleRemoveRow = (oldKey: string) => {
    const newMapping = { ...mapping }
    delete newMapping[oldKey]
    handleUpdateMapping(newMapping)
  }

  const handleUpdateRow = (oldKey: string, newKey: string, newValue: string) => {
    const newMapping = { ...mapping }
    if (oldKey !== newKey) {
        delete newMapping[oldKey]
    }
    newMapping[newKey] = newValue
    handleUpdateMapping(newMapping)
  }

  return (
    <div className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          列名映射配置
        </h3>
        <button
          onClick={handleAddRow}
          className="flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <RiAddLine className="w-3.5 h-3.5 mr-0.5" />
          添加映射
        </button>
      </div>

      <div className="space-y-2">
        {Object.entries(mapping).map(([oldCol, newCol], index) => (
          <div key={index} className="flex items-center gap-2 group">
            <div className="flex-1 min-w-0">
              <ColumnPicker
                value={oldCol}
                options={inputsSchema.columns}
                onSelect={(val) => handleUpdateRow(oldCol, val, newCol as string)}
              />
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={newCol as string}
                onChange={(e) => handleUpdateRow(oldCol, oldCol, e.target.value)}
                placeholder="新名称"
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <button
              onClick={() => handleRemoveRow(oldCol)}
              className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <RiDeleteBinLine className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {Object.keys(mapping).length === 0 && (
          <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
            <p className="text-sm text-gray-400">暂无映射规则</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs text-blue-700">
          提示：上游节点的输出字段会自动显示在下拉列表中。连接上游节点后即可开始配置。
        </p>
      </div>
    </div>
  )
}

export default ColumnMappingPanel
