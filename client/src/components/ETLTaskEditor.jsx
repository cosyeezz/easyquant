import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Save, Loader2, Eye } from 'lucide-react'
import api from '../services/api'
import FilePathPicker from './FilePathPicker'
import FlowEditor from './FlowEditor'

function ETLTaskEditor({ taskId, onNavigate }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(!!taskId)
  const [saving, setSaving] = useState(false)
  const [handlers, setHandlers] = useState([])
  const [columns, setColumns] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [dataTables, setDataTables] = useState([])
  
  const [error, setError] = useState(null)

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
    // Fetch all tables (large page_size) for dropdown
    api.getDataTables({ page_size: 1000 }).then(res => {
        setDataTables(res.items || [])
    }).catch(console.error)
    
    if (taskId) {
      api.getETLConfig(taskId).then(data => {
        setForm(data)
        setLoading(false)
      }).catch(console.error)
    }
  }, [taskId])

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
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

  const handleNext = () => {
    setError(null)
    
    if (step === 1) {
      if (!form.name.trim()) {
        setError("请输入任务名称")
        return
      }
      if (!form.description.trim()) {
        setError("请输入任务描述")
        return
      }
      if (!form.source_config.path) {
        setError("请配置数据源路径")
        return
      }
    }
    
    setStep(step + 1)
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
    <div className="flex flex-col h-[calc(100vh-100px)] gap-4 overflow-hidden">
      {/* Header & Stepper */}
      <div className="flex items-center justify-between shrink-0 px-1">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('etl')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{taskId ? '编辑任务' : '新建任务'}</h2>
          </div>
        </div>

        {/* Classic Stepper (Compact) */}
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all shadow-sm ${
                 step > s ? 'bg-emerald-500 text-white shadow-emerald-200' : 
                 step === s ? 'bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-primary-200 ring-2 ring-primary-100' : 
                 'bg-white text-slate-400 border border-slate-200'
              }`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`ml-2 text-sm font-medium ${step >= s ? 'text-slate-700' : 'text-slate-400'}`}>
                {s === 1 ? '数据源' : s === 2 ? 'Pipeline' : '运行参数'}
              </span>
              {s < 3 && (
                <div className={`w-8 h-0.5 mx-3 rounded-full transition-colors duration-300 ${step > s ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 pb-2"> 
        {/* Step 1: 数据源 */}
        {step === 1 && (
          <div className="card h-full flex flex-col p-6 gap-6 shadow-sm border-slate-200">
            {error && (
              <div className="px-4 py-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 font-medium animate-fadeIn flex items-center gap-2 shrink-0">
                 <span className="text-red-500 text-lg">⚠️</span> {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-0">
              {/* Left Column */}
              <div className="space-y-5 flex flex-col">
                <div>
                  <label className="form-label text-base">任务名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    className={`input-field !py-3 ${error && !form.name.trim() ? 'border-red-300 focus:ring-red-200' : ''}`}
                    placeholder="例如：导入 A 股日线数据"
                  />
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <label className="form-label text-base">描述 <span className="text-red-500">*</span></label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    className={`input-field resize-none flex-1 min-h-[100px] ${error && !form.description.trim() ? 'border-red-300 focus:ring-red-200' : ''}`}
                    placeholder="任务描述..."
                  />
                </div>
                <div>
                  <label className="form-label text-base">数据源类型</label>
                  <select
                    value={form.source_type}
                    onChange={(e) => updateForm('source_type', e.target.value)}
                    className="input-field !py-3"
                  >
                    <option value="csv_dir">CSV 文件夹</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-5 flex flex-col h-full min-h-0">
                <div>
                  <label className="form-label text-base">数据源路径 <span className="text-red-500">*</span></label>
                  <FilePathPicker
                    value={form.source_config}
                    onChange={(config) => updateForm('source_config', config)}
                    placeholder="选择或输入路径"
                  />
                </div>
                
                <div className="flex items-center justify-between mt-1">
                   <span className="text-sm text-slate-500">验证并查看列信息</span>
                   <button
                    onClick={handlePreview}
                    disabled={previewLoading || !form.source_config.path}
                    className="btn-secondary px-4 py-2 text-sm flex items-center gap-2 h-auto hover:bg-white hover:border-primary-200 hover:text-primary-600"
                  >
                    {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    预览数据
                  </button>
                </div>

                {/* Preview Box */}
                <div className="flex-1 bg-slate-50/50 rounded-xl border border-slate-200/60 p-4 overflow-auto min-h-[150px] relative transition-colors hover:bg-slate-50 hover:border-slate-300">
                   {columns.length > 0 ? (
                      <>
                        <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm pb-2 border-b border-slate-100 w-full mb-3 flex items-center gap-2 z-10">
                           <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                           <p className="text-sm font-semibold text-slate-700">检测到 {columns.length} 个字段</p>
                        </div>
                        <div className="flex flex-wrap gap-2 content-start">
                          {columns.map((col) => (
                            <span key={col} className="px-2.5 py-1 bg-white rounded-md text-sm text-slate-600 shadow-sm border border-slate-200/80 font-mono">
                              {col}
                            </span>
                          ))}
                        </div>
                      </>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                           <Eye className="w-6 h-6 opacity-40" />
                        </div>
                        <p className="text-sm">点击预览查看字段信息</p>
                      </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Pipeline */}
        {step === 2 && (
          <div className="card h-full flex flex-col p-0 gap-0 overflow-hidden shadow-sm border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-lg text-slate-800">处理链路 (Pipeline)</h3>
                <p className="text-sm text-slate-500">
                  构建数据清洗与转换流程
                </p>
              </div>
            </div>
            
            <div className="flex-1 min-h-0 bg-slate-100">
                <FlowEditor 
                    initialNodes={[]} 
                    initialEdges={[]}
                    onSave={(nodes, edges) => console.log('Save Graph:', nodes, edges)}
                />
            </div>
          </div>
        )}

        {/* Step 3: 运行参数 */}
        {step === 3 && (
          <div className="card h-full flex flex-col p-6 gap-8 shadow-sm border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="form-label text-base">批次大小 (Batch Size)</label>
                <div className="relative mt-2">
                   <input
                    type="number"
                    value={form.batch_size}
                    onChange={(e) => updateForm('batch_size', parseInt(e.target.value) || 1000)}
                    className="input-field !pl-4 !py-3 text-lg font-mono"
                    min={100}
                    max={10000}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">rows</span>
                </div>
                <p className="form-hint mt-2">每次从磁盘读取并处理的行数。建议 1000-5000，过大可能导致内存溢出。</p>
              </div>
              <div>
                <label className="form-label text-base">并行进程数 (Workers)</label>
                <div className="relative mt-2">
                  <input
                    type="number"
                    value={form.workers}
                    onChange={(e) => updateForm('workers', parseInt(e.target.value) || 1)}
                    className="input-field !pl-4 !py-3 text-lg font-mono"
                    min={1}
                    max={16}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">procs</span>
                </div>
                <p className="form-hint mt-2">并发执行的 Worker 数量。建议设置为 CPU 核心数的 50%-80%。</p>
              </div>
            </div>

            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-inner">
              <div className="px-4 py-2 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">JSON Config Preview</span>
              </div>
              <div className="flex-1 overflow-auto bg-white p-4">
                 <pre className="text-xs font-mono text-slate-600 leading-relaxed">{JSON.stringify(form, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation - Fixed Bottom */}
      <div className="flex items-center justify-between shrink-0 pt-3 border-t border-slate-200/60 mt-1">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="btn-secondary px-5 py-2.5 flex items-center gap-2 transition-transform active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">上一步</span>
        </button>
        {step < 3 ? (
          <button onClick={handleNext} className="btn-primary px-8 py-2.5 flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-transform active:scale-95">
            <span className="font-medium">下一步</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-2.5 flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-transform active:scale-95">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="font-medium">保存配置</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default ETLTaskEditor