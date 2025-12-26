import React, { FC, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNodeDataUpdate, useWorkflowHistory, WorkflowHistoryEvent } from '../../hooks'
import TypeSelector from '../_base/components/selector'
import Field from '../_base/components/field'
import { RiDeleteBinLine, RiAddLine, RiArrowRightLine } from '@remixicon/react'
import cn from '@/utils/classnames'

const ColumnMappingPanel: FC<any> = ({ id, data }) => {
  const { t } = useTranslation()
  const { handleNodeDataUpdateWithSyncDraft } = useNodeDataUpdate()
  const { saveStateToHistory } = useWorkflowHistory()
  
  const inputsSchema = data.inputs_schema || { columns: [] }
  const mapping = data.mapping || {}

  // Convert schema columns to selector options
  const columnOptions = inputsSchema.columns.map((col: any) => ({
    value: col.name,
    label: `${col.name} (${col.type})`
  }))

  const handleUpdateMapping = useCallback((newMapping: Record<string, string>) => {
    handleNodeDataUpdateWithSyncDraft({
      id,
      data: { mapping: newMapping }
    })
    saveStateToHistory(WorkflowHistoryEvent.NodeFormChange, { nodeId: id })
  }, [handleNodeDataUpdateWithSyncDraft, id, saveStateToHistory])

  const handleAddRow = () => {
    // Find a unique default name
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
    <div className="pt-2">
      <div className="px-4 pb-4">
        <Field
          title="列名映射 (Column Mapping)"
          required
          operations={
            <button
              onClick={handleAddRow}
              className="flex items-center text-xs text-primary-600 hover:text-primary-700 font-bold transition-colors"
            >
              <RiAddLine className="w-3.5 h-3.5 mr-0.5" />
              ADD
            </button>
          }
        >
          <div className="space-y-2 mt-2">
            {Object.entries(mapping).map(([oldCol, newCol], index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 p-2 bg-workflow-block-bg rounded-xl border border-workflow-block-border group transition-all hover:border-primary-300 hover:shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <TypeSelector
                    value={oldCol}
                    options={columnOptions}
                    placeholder="选择原始列"
                    onChange={(val) => handleUpdateRow(oldCol, val, newCol as string)}
                    triggerClassName="font-medium text-text-primary"
                    noLeft
                  />
                </div>
                
                <RiArrowRightLine className="w-4 h-4 text-text-quaternary shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={newCol as string}
                    onChange={(e) => handleUpdateRow(oldCol, oldCol, e.target.value)}
                    placeholder="目标名称"
                    className="w-full px-2 py-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-text-secondary placeholder:text-text-quaternary"
                  />
                </div>
                
                <button
                  onClick={() => handleRemoveRow(oldCol)}
                  className="p-1 text-text-quaternary hover:text-state-destructive group-hover:opacity-100 opacity-0 transition-all"
                >
                  <RiDeleteBinLine className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {Object.keys(mapping).length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-divider-subtle rounded-2xl bg-workflow-block-bg/50">
                <div className="text-text-quaternary text-sm mb-1">未配置任何映射</div>
                <div className="text-text-placeholder text-xs text-center">连接上游节点后，点击右上角 ADD 开始配置</div>
              </div>
            )}
          </div>
        </Field>
      </div>
      
      <div className="mx-4 p-3 bg-primary-50/50 rounded-xl border border-primary-100 mb-4">
        <div className="flex gap-2">
          <div className="mt-0.5 text-primary-600">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-xs text-primary-700 leading-relaxed">
            Schema Propagation 已启用。下游节点将自动获得此处映射后的新字段名。
          </p>
        </div>
      </div>
    </div>
  )
}

export default React.memo(ColumnMappingPanel)
