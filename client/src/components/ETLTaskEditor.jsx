import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Save, Loader2, Eye } from 'lucide-react'
import api from '../services/api'
import FilePathPicker from './FilePathPicker'
import PipelineEditor from './PipelineEditor'

function ETLTaskEditor({ taskId, onNavigate }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(!!taskId)
  const [saving, setSaving] = useState(false)
  const [handlers, setHandlers] = useState([])
  const [columns, setColumns] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [dataTables, setDataTables] = useState([])

  const [form, setForm] = useState({
    name: '',
    description: '',
    source_type: 'csv_dir',
    source_config: { path: '' },
    batch_size: 1000,
    workers: 1,
    pipeline_config: [],
  })

  useEffect(() => {
    api.getHandlers().then(setHandlers).catch(console.error)
    api.getDataTables().then(setDataTables).catch(console.error)
    if (taskId) {
      api.getETLConfig(taskId).then(data => {
        setForm(data)
        setLoading(false)
      }).catch(console.error)
    }
  }, [taskId])

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handlePreview = async () => {
    if (!form.source_config.path) return
    setPreviewLoading(true)
    try {
      const data = await api.previewSource(form.source_type, form.source_config)
      setColumns(data.columns || [])
    } catch (error) {
      console.error('Preview failed:', error)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (taskId) {
        await api.updateETLConfig(taskId, form)
      } else {
        await api.createETLConfig(form)
      }
      onNavigate('etl')
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('etl')} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{taskId ? '编辑任务' : '新建任务'}</h2>
          <p className="mt-1 text-slate-600">配置 ETL 数据处理流程</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`stepper-dot ${step > s ? 'completed' : step === s ? 'active' : 'inactive'}`}>
              {step > s ? '✓' : s}
            </div>
            <span className={`ml-2 font-medium ${step >= s ? 'text-slate-800' : 'text-slate-400'}`}>
              {s === 1 ? '数据源' : s === 2 ? 'Pipeline' : '运行参数'}
            </span>
            {s < 3 && (
              <div className={`w-12 h-1 mx-4 rounded-full transition-colors duration-300 ${step > s ? 'bg-success-500' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: 数据源 */}
      {step === 1 && (
        <div className="card space-y-5">
          <div>
            <label className="form-label">任务名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              className="input-field"
              placeholder="例如：导入 A 股日线数据"
            />
          </div>
          <div>
            <label className="form-label">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              className="input-field resize-none"
              rows={2}
              placeholder="任务描述（可选）"
            />
          </div>
          <div>
            <label className="form-label">数据源类型</label>
            <select
              value={form.source_type}
              onChange={(e) => updateForm('source_type', e.target.value)}
              className="input-field"
            >
              <option value="csv_dir">CSV 文件夹</option>
            </select>
          </div>
          <div>
            <label className="form-label">数据源路径</label>
            <FilePathPicker
              value={form.source_config}
              onChange={(config) => updateForm('source_config', config)}
              placeholder="选择或输入数据源路径"
            />
            <div className="mt-3">
              <button
                onClick={handlePreview}
                disabled={previewLoading || !form.source_config.path}
                className="btn-secondary flex items-center gap-2"
              >
                {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                预览数据
              </button>
            </div>
          </div>
          {columns.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-success-50 to-emerald-50 rounded-xl border border-success-200">
              <p className="text-sm font-medium text-success-700 mb-3">✓ 检测到 {columns.length} 个字段：</p>
              <div className="flex flex-wrap gap-2">
                {columns.map((col) => (
                  <span key={col} className="px-3 py-1.5 bg-white rounded-lg text-sm text-slate-700 shadow-sm border border-slate-100">{col}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Pipeline */}
      {step === 2 && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">处理链路 (Pipeline)</h3>
              <p className="text-sm text-slate-500 mt-1">
                支持嵌套逻辑。使用 "Group Node" 来创建并行或分组逻辑。
              </p>
            </div>
          </div>

          <PipelineEditor
            pipeline={form.pipeline_config}
            onChange={(newPipeline) => updateForm('pipeline_config', newPipeline)}
            availableHandlers={handlers}
            columns={columns}
            dataTables={dataTables}
          />
          
        </div>
      )}

      {/* Step 3: 运行参数 */}
      {step === 3 && (
        <div className="card space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">批次大小</label>
              <input
                type="number"
                value={form.batch_size}
                onChange={(e) => updateForm('batch_size', parseInt(e.target.value) || 1000)}
                className="input-field"
                min={100}
                max={10000}
              />
              <p className="form-hint">每批处理的记录数，建议 1000-5000</p>
            </div>
            <div>
              <label className="form-label">并行进程数</label>
              <input
                type="number"
                value={form.workers}
                onChange={(e) => updateForm('workers', parseInt(e.target.value) || 1)}
                className="input-field"
                min={1}
                max={16}
              />
              <p className="form-hint">并行执行的进程数量，建议 1-4</p>
            </div>
          </div>

          <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
            <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 text-sm">📋</span>
              配置预览
            </h4>
            <pre className="text-xs text-slate-600 overflow-auto max-h-48 bg-white p-4 rounded-lg border border-slate-200">
              {JSON.stringify(form, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          上一步
        </button>
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} className="btn-primary flex items-center gap-2">
            下一步
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        )}
      </div>
    </div>
  )
}

export default ETLTaskEditor