import React, { FC, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNodeDataUpdate, useWorkflowHistory, WorkflowHistoryEvent } from '../../hooks'
import Field from '../_base/components/field'
import { RiDeleteBinLine, RiAddLine, RiFileCopyLine, RiEditLine } from '@remixicon/react'
import SubWorkflowEditor from './sub-workflow-editor'

interface ProcessGroup {
  id: string
  name: string
  replicas: number
  threads: number
  input_queue: string
  output_queue: string
  workflow: any[]
}

const ProcessSchedulerPanel: FC<any> = ({ id, data }) => {
  const { handleNodeDataUpdateWithSyncDraft } = useNodeDataUpdate()
  const { saveStateToHistory } = useWorkflowHistory()
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null)

  const processGroups: ProcessGroup[] = data.process_groups || []
  const mqType = data.mq_type || 'redis'
  const mqConfig = data.mq_config || { redis_url: 'redis://localhost:6379' }

  const handleUpdate = useCallback((updates: any) => {
    handleNodeDataUpdateWithSyncDraft({ id, data: updates })
    saveStateToHistory(WorkflowHistoryEvent.NodeFormChange, { nodeId: id })
  }, [handleNodeDataUpdateWithSyncDraft, id, saveStateToHistory])

  const handleAddGroup = () => {
    const newGroup: ProcessGroup = {
      id: `group_${Date.now()}`,
      name: `进程组 ${processGroups.length + 1}`,
      replicas: 1,
      threads: 1,
      input_queue: '',
      output_queue: '',
      workflow: [],
    }
    handleUpdate({ process_groups: [...processGroups, newGroup] })
  }

  const handleCopyGroup = (index: number) => {
    const group = processGroups[index]
    const newGroup: ProcessGroup = {
      ...group,
      id: `group_${Date.now()}`,
      name: `${group.name} (副本)`,
      workflow: [...group.workflow],
    }
    handleUpdate({ process_groups: [...processGroups, newGroup] })
  }

  const handleRemoveGroup = (index: number) => {
    const newGroups = processGroups.filter((_, i) => i !== index)
    handleUpdate({ process_groups: newGroups })
  }

  const handleUpdateGroup = (index: number, field: string, value: any) => {
    const newGroups = [...processGroups]
    newGroups[index] = { ...newGroups[index], [field]: value }
    handleUpdate({ process_groups: newGroups })
  }

  const handleSaveWorkflow = (index: number, workflow: any[]) => {
    handleUpdateGroup(index, 'workflow', workflow)
  }

  return (
    <div className="pt-2">
      <div className="px-4 pb-4">
        <Field title="MQ 类型">
          <select
            value={mqType}
            onChange={(e) => handleUpdate({ mq_type: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-components-input-bg-normal border border-components-input-border-active rounded-lg"
          >
            <option value="redis">Redis Streams</option>
            <option value="rocketmq">RocketMQ</option>
          </select>
        </Field>

        <Field title="Redis URL" className="mt-4">
          <input
            type="text"
            value={mqConfig.redis_url || ''}
            onChange={(e) => handleUpdate({ mq_config: { ...mqConfig, redis_url: e.target.value } })}
            placeholder="redis://localhost:6379"
            className="w-full px-3 py-2 text-sm bg-components-input-bg-normal border border-components-input-border-active rounded-lg"
          />
        </Field>

        <Field
          title="进程组"
          className="mt-4"
          operations={
            <button
              onClick={handleAddGroup}
              className="flex items-center text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              <RiAddLine className="w-3.5 h-3.5 mr-0.5" />
              新增进程
            </button>
          }
        >
          <div className="space-y-2 mt-2">
            {processGroups.map((group, index) => (
              <div key={group.id} className="p-3 bg-workflow-block-bg rounded-xl border border-workflow-block-border">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => handleUpdateGroup(index, 'name', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm font-medium bg-transparent border-none focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingGroupIndex(index)}
                      className="p-1.5 text-text-tertiary hover:text-primary-600 hover:bg-primary-50 rounded"
                      title="编辑工作流"
                    >
                      <RiEditLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCopyGroup(index)}
                      className="p-1.5 text-text-tertiary hover:text-primary-600 hover:bg-primary-50 rounded"
                      title="复制"
                    >
                      <RiFileCopyLine className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveGroup(index)}
                      className="p-1.5 text-text-tertiary hover:text-state-destructive hover:bg-state-destructive-hover rounded"
                      title="删除"
                    >
                      <RiDeleteBinLine className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <label className="text-text-tertiary">进程数</label>
                    <input
                      type="number"
                      min={1}
                      max={32}
                      value={group.replicas}
                      onChange={(e) => handleUpdateGroup(index, 'replicas', parseInt(e.target.value) || 1)}
                      className="w-full mt-1 px-2 py-1 bg-components-input-bg-normal border border-components-input-border-active rounded"
                    />
                  </div>
                  <div>
                    <label className="text-text-tertiary">线程数</label>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={group.threads}
                      onChange={(e) => handleUpdateGroup(index, 'threads', parseInt(e.target.value) || 1)}
                      className="w-full mt-1 px-2 py-1 bg-components-input-bg-normal border border-components-input-border-active rounded"
                    />
                  </div>
                  <div>
                    <label className="text-text-tertiary">输入队列</label>
                    <input
                      type="text"
                      value={group.input_queue || ''}
                      onChange={(e) => handleUpdateGroup(index, 'input_queue', e.target.value)}
                      placeholder="可选"
                      className="w-full mt-1 px-2 py-1 bg-components-input-bg-normal border border-components-input-border-active rounded"
                    />
                  </div>
                  <div>
                    <label className="text-text-tertiary">输出队列</label>
                    <input
                      type="text"
                      value={group.output_queue || ''}
                      onChange={(e) => handleUpdateGroup(index, 'output_queue', e.target.value)}
                      placeholder="可选"
                      className="w-full mt-1 px-2 py-1 bg-components-input-bg-normal border border-components-input-border-active rounded"
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-text-quaternary">
                  工作流: {group.workflow?.length || 0} 个节点
                </div>
              </div>
            ))}
            {processGroups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-divider-subtle rounded-xl">
                <div className="text-text-quaternary text-sm">暂无进程组</div>
                <div className="text-text-placeholder text-xs mt-1">点击上方"新增进程"按钮创建</div>
              </div>
            )}
          </div>
        </Field>
      </div>

      {editingGroupIndex !== null && processGroups[editingGroupIndex] && (
        <SubWorkflowEditor
          groupId={processGroups[editingGroupIndex].id}
          groupName={processGroups[editingGroupIndex].name}
          workflow={processGroups[editingGroupIndex].workflow || []}
          onSave={(workflow) => handleSaveWorkflow(editingGroupIndex, workflow)}
          onClose={() => setEditingGroupIndex(null)}
        />
      )}
    </div>
  )
}

export default React.memo(ProcessSchedulerPanel)
