import { useState, useEffect } from 'react'
import { X, Plus, Pencil, Trash2, Save, Loader2 } from 'lucide-react'
import api from '../services/api'
import Modal from './Modal'

export default function CategoryManagerModal({ isOpen, onClose, onChange }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null) // null = create mode
  const [form, setForm] = useState({ code: '', name: '', description: '' })
  const [deleteId, setDeleteId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) loadData()
  }, [isOpen])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await api.getTableCategories()
      setCategories(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      if (editingId) {
        await api.updateCategory(editingId, { name: form.name, description: form.description })
      } else {
        await api.createCategory(form)
      }
      setForm({ code: '', name: '', description: '' })
      setEditingId(null)
      loadData()
      if (onChange) onChange()
    } catch (err) {
      setError(err.response?.data?.detail || '操作失败')
    }
  }

  const handleEdit = (cat) => {
    setEditingId(cat.id)
    setForm({ code: cat.code, name: cat.name, description: cat.description || '' })
    setError(null)
  }

  const handleDelete = async () => {
    try {
      await api.deleteCategory(deleteId)
      setDeleteId(null)
      loadData()
      if (onChange) onChange()
    } catch (err) {
      setDeleteId(null)
      setDeleteError(err.response?.data?.detail || '删除失败')
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({ code: '', name: '', description: '' })
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh] animate-slideUp">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg text-slate-800">分类管理</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: List */}
          <div className="w-1/2 border-r bg-slate-50 overflow-y-auto p-3 space-y-2">
            <button 
              onClick={resetForm}
              className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:bg-white hover:text-primary-600 transition-colors ${!editingId ? 'bg-white border-primary-300 text-primary-600 shadow-sm' : ''}`}
            >
              <Plus className="w-4 h-4" /> 新建分类
            </button>
            
            {loading ? (
              <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
            ) : (
              categories.map(cat => (
                <div 
                  key={cat.id}
                  className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${editingId === cat.id ? 'bg-white border-primary-500 shadow-md ring-1 ring-primary-100' : 'bg-white border-slate-200 hover:border-primary-300'}`}
                  onClick={() => handleEdit(cat)}
                >
                  <div className="overflow-hidden">
                    <div className="font-medium text-slate-700 truncate">{cat.name}</div>
                    <div className="text-xs text-slate-400 font-mono truncate">{cat.code}</div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteId(cat.id); }}
                    className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Right: Form */}
          <div className="w-1/2 p-5 overflow-y-auto">
            <h4 className="font-semibold text-slate-800 mb-4">{editingId ? '编辑分类' : '新建分类'}</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">分类代码 *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm({...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                  className="input-field"
                  placeholder="stock_data"
                  disabled={!!editingId} // Code is immutable
                  required
                />
                {!editingId && <p className="form-hint">唯一标识，创建后不可修改</p>}
              </div>
              <div>
                <label className="form-label">显示名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="input-field"
                  placeholder="股票数据"
                  required
                />
              </div>
              <div>
                <label className="form-label">描述</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="分类描述..."
                />
              </div>

              {error && <div className="text-xs text-red-500">{error}</div>}

              <div className="pt-2 flex justify-end gap-2">
                {editingId && <button type="button" onClick={resetForm} className="btn-secondary">取消</button>}
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" /> 保存
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="删除分类"
        message="确定要删除这个分类吗？如果该分类下还有数据表，删除将失败。"
        type="warning"
      />

      <Modal
        isOpen={!!deleteError}
        onClose={() => setDeleteError(null)}
        title="删除失败"
        message={deleteError}
        type="error"
      />
    </div>
  )
}
