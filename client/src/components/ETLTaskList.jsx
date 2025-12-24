import { useState, useEffect } from 'react'
import { Plus, Play, Pencil, Trash2, Loader2, FolderOpen, Search, X, Activity, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import Modal from './Modal'
import Select from './ui/Select'

function ETLTaskList({ onNavigate }) {
  const { t } = useTranslation('translation', { keyPrefix: 'easyquant' })
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modals
  const [deleteModal, setDeleteModal] = useState({ open: false, task: null })
  const [createModal, setCreateModal] = useState({ open: false, name: '', description: '', type: 'etl' })
  const [editModal, setEditModal] = useState({ open: false, task: null, name: '', description: '', type: '' })
  
  const [runningId, setRunningId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  
  // Toolbar State
  const [search, setSearch] = useState('')
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all')

  const TASK_TYPES = [
    { value: 'etl', label: 'ETL Pipeline', color: 'bg-eq-primary-500', text: 'text-white' },
    { value: 'backtest', label: 'Backtest', color: 'bg-purple-500', text: 'text-white' },
    { value: 'live', label: 'Live Trading', color: 'bg-green-500', text: 'text-white' },
  ]

  const getTypeStyle = (type) => {
      const t = TASK_TYPES.find(t => t.value === type)
      return t ? `${t.color} ${t.text}` : 'bg-gray-500 text-white'
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      setError(null)
      const data = await api.getETLConfigs()
      setTasks(data)
    } catch (err) {
      setError(err.message || 'Failed to load configurations.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async () => {
    if (!createModal.name.trim()) return
    setCreating(true)
    try {
      const newTask = await api.createETLConfig({
        name: createModal.name,
        description: createModal.description,
        type: createModal.type,
        source_type: 'workflow', 
        source_config: { path: '/' },
        pipeline_config: [],
        graph_config: { nodes: [], edges: [] }
      })
      if (newTask && newTask.id) {
          onNavigate('etl-edit', newTask.id)
      } else {
          alert('Task created but returned invalid data (missing ID). Check console.')
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('Failed to create task: ' + (error.response?.data?.detail || error.message))
    } finally {
      setCreating(false)
      setCreateModal({ open: false, name: '', description: '', type: 'etl' })
    }
  }

  const handleUpdateTask = async () => {
      if (!editModal.task || !editModal.name.trim()) return
      setUpdating(true)
      try {
          // We need to fetch the full task first to avoid overwriting other fields with nulls if the update endpoint expects a full object, 
          // OR if the update endpoint supports partial updates (which it seems to do via PATCH/PUT typically, but let's check `api.js` or assume standard PUT).
          // Looking at previous `ETLTaskEditor`, it calls `updateETLConfig` with the full form.
          // Let's assume we merge the existing task with new fields.
          const updatedTask = {
              ...editModal.task,
              name: editModal.name,
              description: editModal.description,
              type: editModal.type
          }
          await api.updateETLConfig(editModal.task.id, updatedTask)
          setTasks(tasks.map(t => t.id === editModal.task.id ? updatedTask : t))
          setEditModal({ open: false, task: null, name: '', description: '', type: '' })
      } catch (error) {
          console.error('Update failed:', error)
          alert('Failed to update task')
      } finally {
          setUpdating(false)
      }
  }

  const openEditModal = (task, e) => {
      e.stopPropagation()
      setEditModal({
          open: true,
          task,
          name: task.name,
          description: task.description || '',
          type: task.type || 'etl'
      })
  }

  const handleDelete = async () => {
    if (!deleteModal.task) return
    try {
      await api.deleteETLConfig(deleteModal.task.id)
      setTasks(tasks.filter(t => t.id !== deleteModal.task.id))
    } catch (error) {
      console.error('Failed to delete:', error)
    }
    setDeleteModal({ open: false, task: null })
  }

  const handleRun = async (task) => {
    setRunningId(task.id)
    try {
      await api.runETLConfig(task.id)
    } catch (error) {
      console.error('Failed to run:', error)
    } finally {
      setRunningId(null)
    }
  }

  // Client-side filtering
  const filteredTasks = tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(search.toLowerCase()) || 
                            (task.description && task.description.toLowerCase().includes(search.toLowerCase()));
      // const matchesType = sourceTypeFilter === 'all' || task.source_type === sourceTypeFilter; // Source Type is less relevant now
      return matchesSearch; 
  });

  const handleReset = () => {
      setSearch('')
      setSourceTypeFilter('all')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-8 h-8 text-eq-primary-500 animate-spin" />
        <p className="text-eq-text-secondary text-sm">Loading Pipelines...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-eq-danger-text text-lg font-medium">Load Failed</div>
        <p className="text-eq-text-secondary">{error}</p>
        <button onClick={fetchTasks} className="btn-primary">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-fadeIn h-full flex flex-col">
       {/* Linear-Style Toolbar */}
       <div className="flex items-center justify-between px-1 py-2 mb-2 border-b border-eq-border-subtle/50">
        
        {/* Left: Unified Filter Bar */}
        <div className="flex items-center gap-2">
            
            {/* Search - Ghost Style */}
            <div className="group flex items-center gap-2 px-2 py-1 rounded-md transition-colors hover:bg-eq-bg-elevated/50">
                <Search className="w-3.5 h-3.5 text-eq-text-muted group-hover:text-eq-text-secondary" />
                <input
                    type="text"
                    placeholder="Search pipelines..."
                    className="bg-transparent border-none p-0 text-xs w-32 focus:w-48 transition-all duration-300 text-eq-text-primary placeholder:text-eq-text-muted focus:ring-0"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Actions */}
            {(search) && (
                <>
                    <div className="w-px h-3.5 bg-eq-border-subtle mx-1"></div>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-eq-text-muted hover:text-eq-text-primary hover:bg-eq-bg-elevated rounded transition-colors"
                    >
                        <X className="w-3 h-3" />
                        <span className="font-medium">Reset</span>
                    </button>
                </>
            )}
        </div>

        {/* Right: Primary Action */}
        <div className="flex items-center gap-4">
             <span className="text-[10px] text-eq-text-muted font-mono tracking-wider">
                {filteredTasks.length} {t('nav.pipelines').toUpperCase()}
             </span>
             <div className="w-px h-3.5 bg-eq-border-subtle"></div>
            <button 
                onClick={() => setCreateModal({ ...createModal, open: true })} 
                className="btn-primary !py-1 !px-3 !text-[11px] font-semibold flex items-center gap-1.5 shadow-sm"
            >
                <Plus className="w-3.5 h-3.5" />
                {t('common.create')}
            </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12 bg-eq-bg-elevated/20 rounded-xl m-4 border border-dashed border-eq-border-subtle">
          <FolderOpen className="w-12 h-12 text-eq-text-muted/50 mb-4" />
          <h3 className="text-sm font-medium text-eq-text-primary mb-2">No Pipelines Found</h3>
          <p className="text-xs text-eq-text-secondary mb-4">Create your first configuration to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto p-1">
          {filteredTasks.map((task) => (
            <div key={task.id} className="group bg-eq-bg-surface border border-eq-border-subtle rounded-lg p-4 hover:border-eq-primary-500/50 hover:shadow-md transition-all duration-200 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1 mr-2">
                  <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider ${getTypeStyle(task.type || 'etl')}`}>
                        {(task.type || 'etl').toUpperCase()}
                      </span>
                  </div>
                  <h3 className="font-semibold text-eq-text-primary text-sm truncate" title={task.name}>{task.name}</h3>
                  <p className="text-xs text-eq-text-secondary mt-1 line-clamp-2 min-h-[2.5em]">{task.description || 'No description provided.'}</p>
                </div>
                <button
                    onClick={(e) => openEditModal(task, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-eq-text-muted hover:text-eq-primary-500 hover:bg-eq-bg-elevated rounded transition-all"
                    title="Edit Metadata"
                >
                    <Settings className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4 text-[10px] text-eq-text-muted font-mono">
                 <Activity className="w-3 h-3" />
                 <span>Pipeline: {task.pipeline_config?.length || task.graph_config?.nodes?.length || 0} Nodes</span>
              </div>

              <div className="mt-auto pt-3 border-t border-eq-border-subtle flex items-center gap-2">
                <button
                  onClick={() => handleRun(task)}
                  disabled={runningId === task.id}
                  className="flex-1 btn-primary !py-1.5 !text-xs flex items-center justify-center gap-1.5"
                >
                  {runningId === task.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Run
                </button>
                <button
                  onClick={() => onNavigate('etl-edit', task.id)}
                  className="flex-1 btn-secondary !py-1.5 !text-xs flex items-center justify-center gap-1.5"
                  title={t('common.editWorkflow')}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('common.editWorkflow')}
                </button>
                <button
                  onClick={() => setDeleteModal({ open: true, task })}
                  className="p-1.5 text-eq-text-muted hover:text-eq-danger-text hover:bg-eq-danger-bg rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal
        isOpen={createModal.open}
        onClose={() => setCreateModal({ ...createModal, open: false })}
        onConfirm={handleCreateTask}
        title={t('common.create')}
        confirmText={creating ? t('common.saving') : t('common.confirm')}
        confirmDisabled={!createModal.name.trim() || creating}
      >
        <div className="space-y-4 py-2">
            <div>
                <label className="block text-xs font-medium text-eq-text-secondary mb-1.5">Task Type</label>
                <div className="grid grid-cols-3 gap-2">
                    {TASK_TYPES.map(type => (
                        <button
                            key={type.value}
                            onClick={() => setCreateModal({...createModal, type: type.value})}
                            className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                                createModal.type === type.value
                                    ? 'bg-eq-primary-500/10 border-eq-primary-500 text-eq-primary-500'
                                    : 'bg-eq-bg-elevated border-eq-border-subtle text-eq-text-secondary hover:border-eq-border-default'
                            }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-eq-text-secondary mb-1.5">{t('common.name')}</label>
                <input 
                    type="text" 
                    className="input-field w-full"
                    placeholder="e.g. Daily Data Backtest"
                    value={createModal.name}
                    onChange={(e) => setCreateModal({ ...createModal, name: e.target.value })}
                    autoFocus
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-eq-text-secondary mb-1.5">{t('common.description')}</label>
                <textarea 
                    className="input-field w-full min-h-[80px] py-2"
                    placeholder="Describe the purpose of this workflow..."
                    value={createModal.description}
                    onChange={(e) => setCreateModal({ ...createModal, description: e.target.value })}
                />
            </div>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={editModal.open}
        onClose={() => setEditModal({ ...editModal, open: false })}
        onConfirm={handleUpdateTask}
        title="Edit Task Settings"
        confirmText={updating ? "Saving..." : "Save Changes"}
        confirmDisabled={!editModal.name.trim() || updating}
      >
        <div className="space-y-4 py-2">
            <div>
                <label className="block text-xs font-medium text-eq-text-secondary mb-1.5">Task Type</label>
                <div className="grid grid-cols-3 gap-2">
                    {TASK_TYPES.map(type => (
                        <button
                            key={type.value}
                            onClick={() => setEditModal({...editModal, type: type.value})}
                            className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                                editModal.type === type.value
                                    ? 'bg-eq-primary-500/10 border-eq-primary-500 text-eq-primary-500'
                                    : 'bg-eq-bg-elevated border-eq-border-subtle text-eq-text-secondary hover:border-eq-border-default'
                            }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-eq-text-secondary mb-1.5">{t('common.name')}</label>
                <input 
                    type="text" 
                    className="input-field w-full"
                    value={editModal.name}
                    onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-eq-text-secondary mb-1.5">{t('common.description')}</label>
                <textarea 
                    className="input-field w-full min-h-[80px] py-2"
                    value={editModal.description}
                    onChange={(e) => setEditModal({ ...editModal, description: e.target.value })}
                />
            </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, task: null })}
        onConfirm={handleDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete pipeline "${deleteModal.task?.name}"? This action cannot be undone.`}
        type="warning"
      />
    </div>
  )
}

export default ETLTaskList
