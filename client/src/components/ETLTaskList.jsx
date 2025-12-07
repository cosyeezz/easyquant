import { useState, useEffect } from 'react'
import { Plus, Play, Pencil, Trash2, Loader2, FolderOpen } from 'lucide-react'
import api from '../services/api'
import Modal from './Modal'

function ETLTaskList({ onNavigate }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ open: false, task: null })
  const [runningId, setRunningId] = useState(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      setError(null)
      const data = await api.getETLConfigs()
      setTasks(data)
    } catch (err) {
      setError(err.message || '加载失败，请检查后端服务是否启动')
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
        <p className="text-slate-500">ETL 任务加载中，请稍候...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <div className="text-red-500 text-lg font-medium mb-2">加载失败</div>
        <p className="text-slate-500 mb-4">{error}</p>
        <button onClick={fetchTasks} className="btn-primary">重试</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">ETL 任务配置</h2>
          <p className="mt-1 text-slate-600">管理数据加载和处理流程</p>
        </div>
        <button onClick={() => onNavigate('etl-new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          新建任务
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="card text-center py-12">
          <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">暂无任务配置</h3>
          <p className="text-slate-500 mb-4">点击"新建任务"创建第一个 ETL 配置</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{task.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{task.description || '无描述'}</p>
                </div>
                <span className="badge bg-primary-100 text-primary-700">{task.source_type}</span>
              </div>

              <div className="text-xs text-slate-500 mb-4">
                Pipeline: {task.pipeline_config?.length || 0} 个处理器
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleRun(task)}
                  disabled={runningId === task.id}
                  className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  {runningId === task.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  运行
                </button>
                <button
                  onClick={() => onNavigate('etl-edit', task.id)}
                  className="btn-icon"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteModal({ open: true, task })}
                  className="btn-icon-danger"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, task: null })}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除任务 "${deleteModal.task?.name}" 吗？此操作不可恢复。`}
        type="warning"
      />
    </div>
  )
}

export default ETLTaskList
