import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Database, Play, AlertTriangle, Copy, X } from 'lucide-react'
import api from '../services/api'
import Modal from './Modal'

function DataTableList({ onNavigate }) {
  const [tables, setTables] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Modals
  const [deleteModal, setDeleteModal] = useState({ open: false, table: null, error: null })
  const [publishModal, setPublishModal] = useState({ open: false, table: null, error: null })
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setError(null)
      const [tablesData, categoriesData] = await Promise.all([
        api.getDataTables(),
        api.getTableCategories()
      ])
      setTables(tablesData)
      setCategories(categoriesData)
    } catch (err) {
      setError(err.message || '加载失败，请检查后端服务是否启动')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.table) return
    setDeleting(true)
    setDeleteModal(prev => ({ ...prev, error: null }))
    try {
      await api.deleteDataTable(deleteModal.table.id)
      setTables(tables.filter(t => t.id !== deleteModal.table.id))
      setDeleteModal({ open: false, table: null, error: null })
    } catch (error) {
      console.error('Failed to delete:', error)
      setDeleteModal(prev => ({ ...prev, error: error.response?.data?.detail || '删除失败' }))
    } finally {
      setDeleting(false)
    }
  }

  const handlePublish = async () => {
    if (!publishModal.table) return
    setPublishing(true)
    setPublishModal(prev => ({ ...prev, error: null }))
    try {
      await api.publishDataTable(publishModal.table.id)
      // Refresh list to update status
      const updatedTables = await api.getDataTables()
      setTables(updatedTables)
      setPublishModal({ open: false, table: null, error: null })
    } catch (err) {
      setPublishModal(prev => ({ ...prev, error: err.response?.data?.detail || '发布失败' }))
    } finally {
      setPublishing(false)
    }
  }

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id)
    return cat ? cat.name : '-'
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
        <button onClick={fetchData} className="btn-primary">重试</button>
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
              {tables.map((table) => {
                const isPublished = table.status === 'created' || table.status === 'CREATED';
                return (
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
                      <span className="badge bg-primary-50 text-primary-700 border border-primary-100">
                        {getCategoryName(table.category_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isPublished ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                          已发布
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium border border-amber-200">
                          草稿
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!isPublished && (
                          <button 
                            onClick={() => setPublishModal({ open: true, table, error: null })} 
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 active:scale-95 transition-all shadow-sm shadow-primary-500/20"
                            title="发布并创建物理表"
                          >
                            <Play className="w-3 h-3" />
                            发布
                          </button>
                        )}
                        <button onClick={() => onNavigate('table-new', table.id)} className="btn-icon" title="复制表结构">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => onNavigate('table-edit', table.id)} className="btn-icon" title="编辑内容">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteModal({ open: true, table, error: null })} className="btn-icon-danger" title="删除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Modal - Reimplemented using Custom Modal component won't allow showing error inside easily unless modified. 
          So we'll use a custom inline implementation similar to Publish Modal for better control.
      */}
      {deleteModal.open && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl animate-slideUp">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-slate-800">
                  {(deleteModal.table?.status === 'CREATED' || deleteModal.table?.status === 'created') ? "高危操作警告" : "确认删除"}
                </h3>
                
                <div className="mt-2 text-slate-600 text-sm">
                  {(deleteModal.table?.status === 'CREATED' || deleteModal.table?.status === 'created') ? (
                    <div className="space-y-2">
                      <p>您正在删除已发布的表 <span className="font-bold">{deleteModal.table?.name}</span>。</p>
                      <p className="bg-red-50 border border-red-100 p-2 rounded text-red-700">
                        警告：这将永久删除数据库中的物理表 <code className="font-mono bg-red-100 px-1 rounded">{deleteModal.table?.table_name}</code> 及其所有数据！
                      </p>
                      <p>此操作极度危险且不可恢复！</p>
                    </div>
                  ) : (
                    <p>确定要删除数据表 "{deleteModal.table?.name}" 吗？此操作不可恢复。</p>
                  )}
                </div>

                {deleteModal.error && (
                   <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                     {deleteModal.error}
                   </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setDeleteModal({ open: false, table: null, error: null })} 
                className="btn-secondary"
                disabled={deleting}
              >
                取消
              </button>
              <button 
                onClick={handleDelete} 
                disabled={deleting} 
                className="btn-danger flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {publishModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl animate-slideUp">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-slate-800">确认发布</h3>
                
                <div className="mt-2 text-slate-600 text-sm">
                  <p className="mb-2">您即将发布表 <span className="font-semibold text-slate-800">{publishModal.table?.name}</span>。</p>
                  <p>此操作将：</p>
                  <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                    <li>在数据库中创建物理表 <code className="bg-slate-100 px-1 rounded">{publishModal.table?.table_name}</code></li>
                    <li>锁定表结构（不可再修改字段定义）</li>
                  </ul>
                </div>

                {publishModal.error && (
                   <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm break-words">
                     <div className="font-semibold mb-1">发布失败:</div>
                     {publishModal.error}
                   </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setPublishModal({ open: false, table: null, error: null })} 
                className="btn-secondary"
                disabled={publishing}
              >
                取消
              </button>
              <button 
                onClick={handlePublish} 
                disabled={publishing} 
                className="btn-primary flex items-center gap-2"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {publishing ? '执行中...' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTableList