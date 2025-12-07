import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Loader2, Plus, Trash2, GripVertical, AlertTriangle } from 'lucide-react'
import api from '../services/api'

const COLUMN_TYPES = [
  { value: 'VARCHAR(20)', label: 'VARCHAR(20)', hint: '短文本 (代码)' },
  { value: 'VARCHAR(100)', label: 'VARCHAR(100)', hint: '中等文本 (名称)' },
  { value: 'TIMESTAMPTZ', label: 'TIMESTAMPTZ', hint: '带时区时间' },
  { value: 'DOUBLE PRECISION', label: 'DOUBLE PRECISION', hint: '双精度浮点 (价格)' },
  { value: 'NUMERIC', label: 'NUMERIC', hint: '高精度小数 (财务)' },
  { value: 'INT', label: 'INT', hint: '整数' },
  { value: 'BIGINT', label: 'BIGINT', hint: '大整数 (成交量)' },
  { value: 'BOOLEAN', label: 'BOOLEAN', hint: '布尔值' },
  { value: 'JSONB', label: 'JSONB', hint: '非结构化数据' },
]

function DataTableEditor({ tableId, onNavigate }) {
  const [loading, setLoading] = useState(!!tableId)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    name: '',
    table_name: '',
    category: 'market_data',
    description: '',
    status: 'DRAFT',
    columns_schema: [],
    indexes_schema: [],
  })

  useEffect(() => {
    if (tableId) {
      api.getDataTable(tableId).then(data => {
        setForm(data)
        setLoading(false)
      }).catch(console.error)
    }
  }, [tableId])

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isPublished = form.status === 'CREATED'

  // Column operations
  const addColumn = () => {
    updateForm('columns_schema', [...form.columns_schema, { name: '', type: 'VARCHAR(20)', is_pk: false, comment: '' }])
  }

  const updateColumn = (index, field, value) => {
    const cols = [...form.columns_schema]
    cols[index] = { ...cols[index], [field]: value }
    updateForm('columns_schema', cols)
  }

  const removeColumn = (index) => {
    updateForm('columns_schema', form.columns_schema.filter((_, i) => i !== index))
  }

  // Index operations
  const addIndex = () => {
    updateForm('indexes_schema', [...form.indexes_schema, { name: '', columns: [], unique: false }])
  }

  const updateIndex = (index, field, value) => {
    const idxs = [...form.indexes_schema]
    idxs[index] = { ...idxs[index], [field]: value }
    updateForm('indexes_schema', idxs)
  }

  const removeIndex = (index) => {
    updateForm('indexes_schema', form.indexes_schema.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!form.name || !form.table_name || !form.description) {
      setError('请填写所有必填项')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (tableId) {
        await api.updateDataTable(tableId, form)
      } else {
        await api.createDataTable(form)
      }
      onNavigate('tables')
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    setError(null)
    try {
      await api.publishDataTable(tableId)
      onNavigate('tables')
    } catch (err) {
      setError(err.response?.data?.detail || '发布失败')
    } finally {
      setPublishing(false)
      setShowPublishConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
      </div>
    )
  }

  const columnNames = form.columns_schema.map(c => c.name).filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('tables')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-slate-800">{tableId ? '编辑数据表' : '新建数据表'}</h2>
          <p className="mt-1 text-slate-600">配置数据表元数据信息</p>
        </div>
        {isPublished && (
          <span className="px-3 py-1 bg-success-100 text-success-700 rounded-full text-sm font-medium">已发布</span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* Section A: 基础信息 */}
      <div className="card space-y-5">
        <h3 className="font-semibold text-slate-800 border-b pb-2">基础信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="form-label">显示名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              className="input-field"
              placeholder="例如：A股日线行情"
              disabled={isPublished}
            />
          </div>
          <div>
            <label className="form-label">物理表名 *</label>
            <input
              type="text"
              value={form.table_name}
              onChange={(e) => updateForm('table_name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="input-field"
              placeholder="例如：daily_bars"
              disabled={isPublished}
            />
            <p className="form-hint">只能包含小写字母、数字和下划线</p>
          </div>
        </div>

        <div>
          <label className="form-label">分类 *</label>
          <select
            value={form.category}
            onChange={(e) => updateForm('category', e.target.value)}
            className="input-field"
            disabled={isPublished}
          >
            <option value="market_data">行情数据</option>
            <option value="feature">特征数据</option>
            <option value="system">系统数据</option>
          </select>
        </div>

        <div>
          <label className="form-label">描述 *</label>
          <textarea
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            className="input-field resize-none"
            rows={2}
            placeholder="数据表描述（必填）"
          />
        </div>
      </div>

      {/* Section B: 字段定义 */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-slate-800">字段定义</h3>
          {!isPublished && (
            <button onClick={addColumn} className="btn-secondary flex items-center gap-1 text-sm">
              <Plus className="w-4 h-4" /> 添加字段
            </button>
          )}
        </div>

        {form.columns_schema.length === 0 ? (
          <div className="text-center py-8 text-slate-400">暂无字段，点击上方按钮添加</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 w-8"></th>
                  <th className="text-left py-2 px-2">列名</th>
                  <th className="text-left py-2 px-2">类型</th>
                  <th className="text-center py-2 px-2 w-16">主键</th>
                  <th className="text-left py-2 px-2">描述</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {form.columns_schema.map((col, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-2 text-slate-300"><GripVertical className="w-4 h-4" /></td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColumn(i, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="input-field !py-1"
                        placeholder="column_name"
                        disabled={isPublished}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={col.type}
                        onChange={(e) => updateColumn(i, 'type', e.target.value)}
                        className="input-field !py-1"
                        disabled={isPublished}
                      >
                        {COLUMN_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={col.is_pk}
                        onChange={(e) => updateColumn(i, 'is_pk', e.target.checked)}
                        className="w-4 h-4"
                        disabled={isPublished}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={col.comment}
                        onChange={(e) => updateColumn(i, 'comment', e.target.value)}
                        className="input-field !py-1"
                        placeholder="字段描述"
                      />
                    </td>
                    <td className="py-2 px-2">
                      {!isPublished && (
                        <button onClick={() => removeColumn(i)} className="btn-icon-danger !p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section C: 索引定义 */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-slate-800">索引定义</h3>
          {!isPublished && (
            <button onClick={addIndex} className="btn-secondary flex items-center gap-1 text-sm">
              <Plus className="w-4 h-4" /> 添加索引
            </button>
          )}
        </div>

        {form.indexes_schema.length === 0 ? (
          <div className="text-center py-8 text-slate-400">暂无索引</div>
        ) : (
          <div className="space-y-3">
            {form.indexes_schema.map((idx, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <input
                  type="text"
                  value={idx.name}
                  onChange={(e) => updateIndex(i, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="input-field !py-1 w-40"
                  placeholder="idx_name"
                  disabled={isPublished}
                />
                <select
                  multiple
                  value={idx.columns}
                  onChange={(e) => updateIndex(i, 'columns', Array.from(e.target.selectedOptions, o => o.value))}
                  className="input-field !py-1 flex-1 min-h-[60px]"
                  disabled={isPublished}
                >
                  {columnNames.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={idx.unique}
                    onChange={(e) => updateIndex(i, 'unique', e.target.checked)}
                    disabled={isPublished}
                  />
                  唯一
                </label>
                {!isPublished && (
                  <button onClick={() => removeIndex(i)} className="btn-icon-danger !p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <button onClick={() => onNavigate('tables')} className="btn-secondary">取消</button>
        <button
          onClick={handleSave}
          disabled={saving || !form.name || !form.table_name || !form.description}
          className="btn-secondary flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存草稿
        </button>
        {tableId && !isPublished && (
          <button
            onClick={() => setShowPublishConfirm(true)}
            className="btn-primary flex items-center gap-2"
          >
            发布并创建
          </button>
        )}
      </div>

      {/* Publish Confirm Modal */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center gap-3 text-warning-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-semibold text-lg">确认发布</h3>
            </div>
            <p className="text-slate-600">
              发布后将在数据库中创建物理表 <code className="bg-slate-100 px-1 rounded">{form.table_name}</code>，
              表结构将无法修改。确定继续？
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPublishConfirm(false)} className="btn-secondary">取消</button>
              <button onClick={handlePublish} disabled={publishing} className="btn-primary">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTableEditor
