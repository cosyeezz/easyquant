import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Loader2, Plus, Trash2, GripVertical, X, Settings, UploadCloud, AlertCircle } from 'lucide-react'
import api from '../services/api'
import Select from './ui/Select'
import CategoryManagerModal from './CategoryManagerModal'
import Modal from './Modal'

const COLUMN_TYPES = [
  { value: 'VARCHAR(20)', label: 'VARCHAR(20)', hint: '短代码 (如 symbol)' },
  { value: 'VARCHAR(100)', label: 'VARCHAR(100)', hint: '名称/标题' },
  { value: 'TEXT', label: 'TEXT', hint: '长文本/备注' },
  { value: 'CHAR(10)', label: 'CHAR(10)', hint: '定长字符' },
  { value: 'TIMESTAMPTZ', label: 'TIMESTAMPTZ', hint: '带时区时间 (推荐)' },
  { value: 'DATE', label: 'DATE', hint: '仅日期 (无时间)' },
  { value: 'TIME', label: 'TIME', hint: '仅时间' },
  { value: 'DOUBLE PRECISION', label: 'DOUBLE PRECISION', hint: '浮点数 (价格/计算)' },
  { value: 'NUMERIC(20,4)', label: 'NUMERIC(20,4)', hint: '高精度财务金额' },
  { value: 'INT', label: 'INT', hint: '整数 (4字节)' },
  { value: 'BIGINT', label: 'BIGINT', hint: '大整数 (8字节/成交量)' },
  { value: 'BOOLEAN', label: 'BOOLEAN', hint: '布尔值 (True/False)' },
  { value: 'JSONB', label: 'JSONB', hint: 'JSON 对象 (高效查询)' },
  { value: 'UUID', label: 'UUID', hint: '全局唯一ID' },
  { value: 'VARCHAR[]', label: 'VARCHAR[]', hint: '文本数组' },
  { value: 'INT[]', label: 'INT[]', hint: '整数数组' },
]

const RESERVED_KEYWORDS = new Set([
  "ALL", "ANALYSE", "ANALYZE", "AND", "ANY", "ARRAY", "AS", "ASC", "ASYMMETRIC", "AUTHORIZATION",
  "BINARY", "BOTH", "CASE", "CAST", "CHECK", "COLLATE", "COLUMN", "CONSTRAINT", "CREATE", "CROSS",
  "CURRENT_DATE", "CURRENT_ROLE", "CURRENT_TIME", "CURRENT_TIMESTAMP", "CURRENT_USER", "DEFAULT",
  "DEFERRABLE", "DESC", "DISTINCT", "DO", "ELSE", "END", "EXCEPT", "FALSE", "FOR", "FOREIGN",
  "FREEZE", "FROM", "FULL", "GRANT", "GROUP", "HAVING", "ILIKE", "IN", "INITIALLY", "INNER",
  "INTERSECT", "INTO", "IS", "ISNULL", "JOIN", "LATERAL", "LEADING", "LEFT", "LIKE", "LIMIT",
  "LOCALTIME", "LOCALTIMESTAMP", "NATURAL", "NEW", "NOT", "NOTNULL", "NULL", "OFF", "OFFSET",
  "OLD", "ON", "ONLY", "OR", "ORDER", "OUTER", "OVERLAPS", "PLACING", "PRIMARY", "REFERENCES",
  "RIGHT", "SELECT", "SESSION_USER", "SIMILAR", "SOME", "SYMMETRIC", "TABLE", "THEN", "TO",
  "TRAILING", "TRUE", "UNION", "UNIQUE", "USER", "USING", "VERBOSE", "WHEN", "WHERE", "WINDOW", "WITH"
])
const NAME_REGEX = /^[a-z_][a-z0-9_]*$/

function DataTableEditor({ tableId, cloneFromId, onNavigate }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [categories, setCategories] = useState([])
  const [showCatModal, setShowCatModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    table_name: '',
    category_id: '', 
    description: '',
    status: 'DRAFT',
    columns_schema: [],
    indexes_schema: [],
  })

  useEffect(() => {
    loadData()
  }, [tableId, cloneFromId])

  const refreshCategories = async () => {
    const cats = await api.getTableCategories()
    setCategories(cats)
    return cats
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const cats = await refreshCategories()
      
      let initialCategoryId = cats.length > 0 ? cats[0].id : ''

      if (tableId) {
        const data = await api.getDataTable(tableId)
        // Ensure arrays exist
        data.columns_schema = data.columns_schema || []
        data.indexes_schema = data.indexes_schema || []
        data.indexes_schema.forEach(idx => {
          idx.columns = idx.columns || []
        })
        setForm(data)
      } else if (cloneFromId) {
        const data = await api.getDataTable(cloneFromId)
        // Ensure arrays exist
        data.columns_schema = data.columns_schema || []
        data.indexes_schema = data.indexes_schema || []
        data.indexes_schema.forEach(idx => {
          idx.columns = idx.columns || []
        })
        setForm({
          ...data,
          id: undefined, // Clear ID to create new
          name: `${data.name} (副本)`,
          table_name: `${data.table_name}_copy`,
          status: 'DRAFT',
          // Keep other fields like columns, indexes, category, description
        })
      } else {
        setForm(prev => ({ ...prev, category_id: initialCategoryId }))
      }
    } catch (err) {
      console.error(err)
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear global error when user edits
    if (error) setError(null)
  }

  const handleCategoryChange = (val) => {
    updateForm('category_id', val)
  }

  const isPublished = form.status === 'created' || form.status === 'CREATED'

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

  const validateForm = () => {
    const errors = {}
    let isValid = true

    // 1. Table Name
    if (!form.table_name) {
      errors.table_name = '物理表名不能为空'
    } else if (!NAME_REGEX.test(form.table_name)) {
      errors.table_name = '格式错误 (仅小写字母/数字/下划线)'
    } else if (RESERVED_KEYWORDS.has(form.table_name.toUpperCase())) {
      errors.table_name = '使用了保留关键字'
    }

    // 2. Columns
    if (form.columns_schema.length === 0) {
      errors.general = '请至少添加一个字段'
    }
    
    const colNames = new Set()
    let hasPk = false
    
    form.columns_schema.forEach((col, index) => {
      if (!col.name) {
        errors[`columns.${index}.name`] = '必填'
      } else if (!NAME_REGEX.test(col.name)) {
        errors[`columns.${index}.name`] = '格式错误'
      } else if (RESERVED_KEYWORDS.has(col.name.toUpperCase())) {
        errors[`columns.${index}.name`] = '保留字'
      } else if (colNames.has(col.name)) {
        errors[`columns.${index}.name`] = '重复'
      }
      colNames.add(col.name)
      
      if (col.is_pk) hasPk = true
    })

    if (!hasPk && form.columns_schema.length > 0) {
      errors.general = errors.general || '必须指定主键'
    }

    if (Object.keys(errors).length > 0) {
      isValid = false
    }
    
    setValidationErrors(errors)
    return isValid
  }

  const handleSave = async () => {
    console.log('Validating form...')
    if (!validateForm()) {
      setError('校验失败：请检查红色标记字段')
      console.log('Validation failed')
      return
    }
    
    if (!form.name || !form.table_name || !form.description || !form.category_id) {
      setError('校验失败：请填写所有必填项')
      console.log('Required fields missing')
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

  const handlePublishClick = () => {
    if (!validateForm()) {
      setError('校验失败：请检查红色标记字段')
      return
    }
    setShowPublishConfirm(true)
  }

  const executePublish = async () => {
    setPublishing(true)
    setError(null)
    try {
      await api.publishDataTable(tableId)
      await loadData() 
      setShowPublishConfirm(false)
    } catch (err) {
      setError(err.response?.data?.detail || '发布失败')
    } finally {
      setPublishing(false)
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
  
  // Transform options for Select components
  const categoryOptions = categories.map(cat => ({ value: cat.id, label: `${cat.name} (${cat.code})` }))
  
  // For index column adder
  const getAvailableColumnOptions = (currentColumns) => {
    return columnNames
      .filter(c => !currentColumns.includes(c))
      .map(c => ({ value: c, label: c }))
  }

  return (
    <div className="space-y-6 pb-20"> {/* pb-20 for bottom actions space */}
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

      {/* Top error removed */}

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
            />
          </div>
          <div>
            <label className="form-label">物理表名 *</label>
            <input
              type="text"
              value={form.table_name}
              onChange={(e) => updateForm('table_name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className={`input-field ${validationErrors.table_name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`}
              placeholder="例如：daily_bars"
            />
            {validationErrors.table_name && <p className="text-xs text-red-500 mt-1">{validationErrors.table_name}</p>}
            <p className="form-hint">只能包含小写字母、数字和下划线</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0">分类 *</label>
            <button 
              onClick={() => setShowCatModal(true)}
              className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700 hover:underline"
            >
              <Settings className="w-3 h-3" /> 管理分类
            </button>
          </div>
          <Select
            value={form.category_id}
            onChange={handleCategoryChange}
            options={categoryOptions}
            placeholder="选择分类"
          />
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
          <button onClick={addColumn} className="btn-secondary flex items-center gap-1 text-sm">
            <Plus className="w-4 h-4" /> 添加字段
          </button>
        </div>

        {form.columns_schema.length === 0 ? (
          <div className="text-center py-8 text-slate-400">暂无字段，点击上方按钮添加</div>
        ) : (
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 w-8"></th>
                  <th className="text-left py-2 px-2 w-48">列名</th>
                  <th className="text-left py-2 px-2 w-48">类型</th>
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
                      <div className="relative">
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => updateColumn(i, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          className={`input-field !py-1 ${validationErrors[`columns.${i}.name`] ? '!border-red-500' : ''}`}
                          placeholder="column_name"
                          title={validationErrors[`columns.${i}.name`]}
                        />
                        {validationErrors[`columns.${i}.name`] && (
                          <span className="absolute -bottom-3 left-0 text-[10px] text-red-500 whitespace-nowrap">
                            {validationErrors[`columns.${i}.name`]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <Select
                        value={col.type}
                        onChange={(val) => updateColumn(i, 'type', val)}
                        options={COLUMN_TYPES}
                        className="!py-0" 
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={col.is_pk}
                        onChange={(e) => updateColumn(i, 'is_pk', e.target.checked)}
                        className="w-4 h-4"
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
                      <button onClick={() => removeColumn(i)} className="btn-icon-danger !p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">索引定义</h3>
            <p className="text-xs text-slate-500">支持联合索引，通过添加多个列来组合</p>
          </div>
          <button onClick={addIndex} className="btn-secondary flex items-center gap-1 text-sm">
             <Plus className="w-4 h-4" /> 添加索引
          </button>
        </div>

        {form.indexes_schema.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            暂无索引配置
          </div>
        ) : (
          <div className="space-y-3">
            {form.indexes_schema.map((idx, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-primary-200 transition-colors">
                
                {/* 索引名称 */}
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-medium text-slate-500 mb-1">索引名称</label>
                  <input
                    type="text"
                    value={idx.name}
                    onChange={(e) => updateIndex(i, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="input-field !py-1.5 w-full"
                    placeholder="例如: idx_symbol_date"
                  />
                </div>

                {/* 索引列 (Tag Editor) */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">索引列组合 (联合索引)</label>
                  <div className="flex flex-wrap gap-2 min-h-[38px] p-1.5 bg-slate-50 rounded border border-slate-200">
                    {idx.columns.map((colName, colIdx) => (
                      <span key={colIdx} className="inline-flex items-center px-2 py-1 rounded bg-white border border-slate-200 text-sm text-slate-700 shadow-sm">
                        {colName}
                        <button
                          onClick={() => {
                            const newCols = idx.columns.filter((_, ci) => ci !== colIdx)
                            updateIndex(i, 'columns', newCols)
                          }}
                          className="ml-1.5 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    
                    <div className="w-32">
                      <Select 
                        value=""
                        placeholder="添加列..."
                        options={getAvailableColumnOptions(idx.columns)}
                        onChange={(val) => {
                           if (val) updateIndex(i, 'columns', [...idx.columns, val])
                        }}
                        className="!border-dashed !bg-transparent hover:!bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 唯一性开关 */}
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={idx.unique}
                        onChange={(e) => updateIndex(i, 'unique', e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                    </div>
                    <span className="text-sm text-slate-600">唯一索引</span>
                  </label>
                </div>

                {/* 删除按钮 */}
                <div className="pt-5">
                  <button onClick={() => removeIndex(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="删除索引">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions with Bottom Error Display */}
      <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-200">
        
        {/* Left Side: Error Feedback */}
        <div className="flex-1 min-w-0 mr-4">
          {(error || validationErrors.general) && (
            <div role="alert" className="flex items-center gap-2 text-red-700 animate-pulse bg-red-100 px-3 py-2 rounded-lg border border-red-200 max-w-full">
               <AlertCircle className="w-5 h-5 flex-shrink-0" />
               <span className="text-sm font-medium" title={error || validationErrors.general}>
                 {error || validationErrors.general}
               </span>
            </div>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={() => onNavigate('tables')} className="btn-secondary">取消</button>
          
          {tableId && !isPublished && (
            <button
              onClick={handlePublishClick}
              disabled={saving || publishing}
              className="btn-primary bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-200 flex items-center gap-2"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              发布上线
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || publishing}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {tableId ? '更新配置' : '创建数据表'}
          </button>
        </div>
      </div>
      
      <CategoryManagerModal 
        isOpen={showCatModal} 
        onClose={() => setShowCatModal(false)}
        onChange={refreshCategories}
      />

      <Modal 
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        onConfirm={executePublish}
        type="warning"
        title="确定要发布数据表吗？"
        message={
          <div className="text-left space-y-2 text-sm text-slate-600">
            <p className="font-medium text-slate-800">您即将发布表 "{form.name}" ({form.table_name})。</p>
            <p>发布操作将会：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>严格校验 Schema 定义的合法性。</li>
              <li>在数据库中创建物理表 (CREATE TABLE)。</li>
              <li>创建所有定义的索引。</li>
            </ul>
            <p className="mt-3 p-3 bg-warning-50 text-warning-800 rounded-lg border border-warning-200">
              <span className="font-bold">⚠️ 注意：</span> 发布后，表的物理名将锁定，无法再重命名。
            </p>
          </div>
        }
      />
    </div>
  )
}

export default DataTableEditor