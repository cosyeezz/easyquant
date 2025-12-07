import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Database } from 'lucide-react'
import api from '../services/api'
import Modal from './Modal'

function DataTableList({ onNavigate }) {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ open: false, table: null })

  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    try {
      setError(null)
      const data = await api.getDataTables()
      setTables(data)
    } catch (err) {
      setError(err.message || '加载失败，请检查后端服务是否启动')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.table) return
    try {
      await api.deleteDataTable(deleteModal.table.id)
      setTables(tables.filter(t => t.id !== deleteModal.table.id))
    } catch (error) {
      console.error('Failed to delete:', error)
    }
    setDeleteModal({ open: false, table: null })
  }

  const categoryLabels = {
    market_data: '行情数据',
    feature: '特征数据',
    system: '系统数据',
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
        <p className="text-slate-500">数据表加载中，请稍候...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <div className="text-red-500 text-lg font-medium mb-2">加载失败</div>
        <p className="text-slate-500 mb-4">{error}</p>
        <button onClick={fetchTables} className="btn-primary">重试</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">数据表管理</h2>
          <p className="mt-1 text-slate-600">管理系统中的数据库表元数据</p>
        </div>
        <button onClick={() => onNavigate('table-new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          新建数据表
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="card text-center py-12">
          <Database className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">暂无数据表</h3>
          <p className="text-slate-500 mb-4">点击"新建数据表"注册第一个数据表</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">显示名称</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">物理表名</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">分类</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-700">状态</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tables.map((table) => (
                <tr key={table.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-800">{table.name}</span>
                    {table.description && (
                      <p className="text-xs text-slate-500 mt-1">{table.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-slate-100 rounded text-sm text-slate-700">{table.table_name}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge bg-primary-100 text-primary-700">
                      {categoryLabels[table.category] || table.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {table.status === 'CREATED' ? (
                      <span className="px-2 py-1 bg-success-100 text-success-700 rounded-full text-xs font-medium">已发布</span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">草稿</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onNavigate('table-edit', table.id)} className="btn-icon">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteModal({ open: true, table })} className="btn-icon-danger">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, table: null })}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除数据表 "${deleteModal.table?.name}" 吗？此操作不可恢复。`}
        type="warning"
      />
    </div>
  )
}

export default DataTableList
