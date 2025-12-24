import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ArrowLeft, Save, Loader2, Play, Settings, MoreHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
// --- New Workflow Integration ---
import { WorkflowWithInnerContext } from './workflow/index'
import { availableNodesMetaData } from './workflow/node-defaults'
import { EventEmitterContextProvider } from '../context/event-emitter'
import { CUSTOM_NODE } from './workflow/constants'
import { BlockEnum } from './workflow/types'
import Modal from './Modal'

function ETLTaskEditor({ taskId, onNavigate }) {
  const { t } = useTranslation('translation', { keyPrefix: 'easyquant' })
  const [loading, setLoading] = useState(!!taskId)
  const [loadError, setLoadError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  
  const workflowRef = useRef(null) // Ref to access workflow state directly

  const [form, setForm] = useState({
    name: '',
    description: '',
    source_type: 'workflow',
    source_config: {},
    batch_size: 1000,
    workers: 1,
    pipeline_config: [],
    graph_config: { nodes: [], edges: [] }
  })

  useEffect(() => {
    if (taskId) {
      setLoading(true)
      setLoadError(null)
      api.getETLConfig(taskId).then(data => {
        setForm(data)
      }).catch(err => {
        console.error('Failed to load task:', err)
        setLoadError(err.message || 'Failed to load task')
      }).finally(() => {
        setLoading(false)
      })
    }
  }, [taskId])

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    
    // Get latest graph data directly from the workflow component
    let graphData = form.graph_config
    if (workflowRef.current) {
        graphData = workflowRef.current.getGraphData()
        console.log('Retrieved latest graph data from ref:', graphData)
    } else {
        console.warn('Workflow ref is null, using stale form state')
    }

    const payload = {
        ...form,
        graph_config: graphData
    }

    console.log('Saving task with payload:', payload) 

    try {
      if (taskId) {
        await api.updateETLConfig(taskId, payload)
      } else {
        const newTask = await api.createETLConfig(payload)
        onNavigate('etl-edit', newTask.id)
      }
      // Update local state to reflect what was saved
      setForm(prev => ({ ...prev, graph_config: graphData }))
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async () => {
    setRunning(true)
    try {
      await api.runETLConfig(taskId)
    } catch (error) {
      console.error('Run failed:', error)
    } finally {
      setRunning(false)
    }
  }

  // --- Workflow Handlers ---
  const initialWorkflowData = useMemo(() => {
    if (form.graph_config?.nodes?.length > 0) {
      return form.graph_config
    }
    // Default nodes for new task
    return {
      nodes: [
        {
          id: 'start',
          type: CUSTOM_NODE,
          data: { title: 'Start', type: BlockEnum.Start, desc: 'Start Node', variables: [] },
          position: { x: 100, y: 200 },
        },
        {
          id: 'end',
          type: CUSTOM_NODE,
          data: { title: 'End', type: BlockEnum.End, desc: 'End Node', outputs: [] },
          position: { x: 600, y: 200 },
        },
      ],
      edges: []
    }
  }, [form.graph_config, taskId])

  const handleWorkflowUpdate = useCallback((payload) => {
    setForm(prev => ({
      ...prev,
      graph_config: payload
    }))
  }, [])

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-eq-danger-text font-medium">Error loading task</p>
        <p className="text-sm text-eq-text-secondary">{loadError}</p>
        <button onClick={() => onNavigate('etl')} className="btn-secondary text-xs">Go Back</button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-eq-primary-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] -mx-4 -mb-4 bg-eq-bg-base overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-eq-border-subtle bg-eq-bg-surface shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={() => onNavigate('etl')} 
            className="p-1.5 hover:bg-eq-bg-elevated rounded-md text-eq-text-secondary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-eq-text-primary truncate">{form.name || 'Untitled Workflow'}</h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-eq-bg-elevated text-eq-text-muted border border-eq-border-subtle">
                    {taskId ? `#${String(taskId).substring(0, 6)}` : 'DRAFT'}
                </span>
            </div>
            <p className="text-[11px] text-eq-text-muted truncate">{form.description || 'No description'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-eq-text-secondary hover:text-eq-text-primary hover:bg-eq-bg-elevated rounded-md transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <div className="w-px h-4 bg-eq-border-subtle mx-1"></div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-secondary !py-1.5 !px-3 !text-xs flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {t('common.save')}
          </button>

          <button
            onClick={handleRun}
            disabled={running || !taskId}
            className="btn-primary !py-1.5 !px-4 !text-xs flex items-center gap-2 shadow-sm"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {t('common.run')}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative min-h-0 bg-[#f8fafc] dark:bg-[#0f172a]"> 
         <EventEmitterContextProvider>
            <WorkflowWithInnerContext
              ref={workflowRef}
              nodes={initialWorkflowData.nodes}
              edges={initialWorkflowData.edges}
              onWorkflowDataUpdate={handleWorkflowUpdate}
              hooksStore={{
                availableNodesMetaData,
                readOnly: false,
              }}
            />
         </EventEmitterContextProvider>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={t('nav.pipelines') + ' ' + t('nav.nodes')}
        showConfirm={false}
      >
        <div className="space-y-4 py-2">
            <div>
                <label className="block text-xs font-medium text-eq-text-secondary mb-1.5">{t('common.name')}</label>
                <input 
                    type="text" 
                    className="input-field w-full"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-eq-text-secondary mb-1.5">{t('common.description')}</label>
                <textarea 
                    className="input-field w-full min-h-[80px] py-2"
                    value={form.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-eq-text-secondary mb-1.5">{t('workflow.config.batchSize') || 'Batch Size'}</label>
                    <input 
                        type="number" 
                        className="input-field w-full font-mono"
                        value={form.batch_size}
                        onChange={(e) => updateForm('batch_size', parseInt(e.target.value))}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-eq-text-secondary mb-1.5">{t('workflow.config.workers') || 'Workers'}</label>
                    <input 
                        type="number" 
                        className="input-field w-full font-mono"
                        value={form.workers}
                        onChange={(e) => updateForm('workers', parseInt(e.target.value))}
                    />
                </div>
            </div>
        </div>
      </Modal>
    </div>
  )
}

export default ETLTaskEditor