import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Settings, Layers, Zap, ArrowRight } from 'lucide-react'
import { MappingEditor, SubsetEditor, TypeConversionEditor, DatabaseSaveEditor } from './HandlerEditors'

export default function PipelineEditor({ 
  pipeline, 
  availableHandlers, 
  columns, 
  dataTables, 
  onChange,
  parentMode = 'sequential' // 新增: 知道父级是并行还是串行
}) {
  
  const handleAdd = (handlerName) => {
    if (!handlerName) return
    const handlerDef = availableHandlers.find(h => h.name === handlerName)
    if (!handlerDef) return

    let params = {}
    // 初始化默认参数
    if (handlerName === 'ColumnMappingHandler') params = { mapping: {} }
    else if (handlerName === 'DropNaHandler') params = { subset: [] }
    else if (handlerName === 'TypeConversionHandler') params = {}
    else if (handlerName === 'DatabaseSaveHandler') params = { target_table_id: null, conflict_mode: 'upsert' }
    else if (handlerName === 'GroupHandler') params = { mode: 'sequential', handlers: [] }

    const newHandler = { name: handlerName, params }
    onChange([...pipeline, newHandler])
  }

  const handleRemove = (index) => {
    onChange(pipeline.filter((_, i) => i !== index))
  }

  const handleMove = (index, direction) => {
    const newPipeline = [...pipeline]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= newPipeline.length) return
    ;[newPipeline[index], newPipeline[newIndex]] = [newPipeline[newIndex], newPipeline[index]]
    onChange(newPipeline)
  }

  const handleUpdate = (index, newParams) => {
    const newPipeline = [...pipeline]
    newPipeline[index] = { ...newPipeline[index], params: newParams }
    onChange(newPipeline)
  }

  return (
    <div className="space-y-4">
      {/* 列表渲染 */}
      {pipeline.map((handler, index) => (
        <HandlerItem
          key={index}
          index={index}
          handler={handler}
          isFirst={index === 0}
          isLast={index === pipeline.length - 1}
          availableHandlers={availableHandlers}
          columns={columns}
          dataTables={dataTables}
          onUpdate={(params) => handleUpdate(index, params)}
          onRemove={() => handleRemove(index)}
          onMove={(dir) => handleMove(index, dir)}
          parentMode={parentMode}
        />
      ))}

      {/* 添加按钮区 */}
      <div className="flex items-center gap-2 mt-4">
        <select
          className="input-field w-auto min-w-[200px] !py-2"
          value=""
          onChange={(e) => handleAdd(e.target.value)}
        >
          <option value="" disabled>+ 添加步骤 (Add Step)</option>
          <optgroup label="基础处理">
            {availableHandlers.filter(h => h.name !== 'GroupHandler').map(h => (
              <option key={h.name} value={h.name}>{h.label || h.name}</option>
            ))}
          </optgroup>
          <optgroup label="高级流程控制">
             {availableHandlers.filter(h => h.name === 'GroupHandler').map(h => (
              <option key={h.name} value={h.name}>🔀 {h.label || h.name}</option>
            ))}
          </optgroup>
        </select>
        
        {pipeline.length === 0 && (
          <span className="text-slate-400 text-sm">暂无步骤，请添加</span>
        )}
      </div>
    </div>
  )
}

function HandlerItem(props) {
  const { handler, onUpdate, availableHandlers, parentMode, columns } = props
  const isGroup = handler.name === 'GroupHandler'
  const [showExecSettings, setShowExecSettings] = useState(false)

  // 样式区分：普通卡片 vs 组卡片
  const containerClass = isGroup
    ? "border-2 border-indigo-100 bg-indigo-50/30 rounded-xl p-4 transition-all"
    : "border border-slate-200 bg-white rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"

  // 并行模式下的执行配置
  const execOptions = handler.params._exec_options || {}
  const updateExecOptions = (opts) => {
    onUpdate({ ...handler.params, _exec_options: { ...execOptions, ...opts } })
  }

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <HandlerIcon name={handler.name} />
          <div>
            <div className="flex items-center gap-2">
               <span className="font-semibold text-slate-800">
                {getLabel(handler.name, availableHandlers)}
               </span>
               {isGroup && (
                 <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${
                   handler.params.mode === 'parallel' 
                   ? 'bg-purple-100 text-purple-700' 
                   : 'bg-blue-100 text-blue-700'
                 }`}>
                   {handler.params.mode === 'parallel' ? 'Parallel (并行)' : 'Sequential (顺序)'}
                 </span>
               )}
            </div>
            <span className="text-xs text-slate-400 font-mono">#{props.index + 1}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
          {parentMode === 'parallel' && (
            <button 
               onClick={() => setShowExecSettings(!showExecSettings)} 
               className={`btn-icon !p-1.5 mr-2 ${showExecSettings ? 'bg-purple-100 text-purple-600' : ''}`}
               title="设置输入列 (只处理特定列)"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button onClick={() => props.onMove(-1)} disabled={props.isFirst} className="btn-icon !p-1.5 disabled:opacity-20">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={() => props.onMove(1)} disabled={props.isLast} className="btn-icon !p-1.5 disabled:opacity-20">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={props.onRemove} className="btn-icon-danger !p-1.5 ml-2">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Execution Settings Panel (Only in Parallel Mode) */}
      {showExecSettings && parentMode === 'parallel' && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100 text-sm">
           <h5 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
             <Zap className="w-3 h-3" /> 输入数据范围 (Input Scope)
           </h5>
           <div className="grid gap-3">
             <div>
               <label className="block text-xs font-medium text-purple-700 mb-1">选择需要的列 (Select Columns)</label>
               <SubsetEditor 
                  subset={execOptions.select_columns || []} 
                  columns={columns} 
                  onChange={cols => updateExecOptions({ select_columns: cols })} 
               />
               <p className="text-[10px] text-purple-600 mt-1">
                 只将选中的列复制给该处理器。未选中的列会被忽略，能显著降低内存消耗并提高速度。
                 <br/>留空则复制所有列。
               </p>
             </div>
           </div>
        </div>
      )}

      {/* Body / Recursive Content */}
      <div className="pl-2">
        {isGroup ? (
          <GroupEditor {...props} />
        ) : (
          <StandardParamsEditor {...props} />
        )}
      </div>
    </div>
  )
}

function GroupEditor({ handler, onUpdate, availableHandlers, columns, dataTables }) {
  const { mode, handlers, merge_strategy } = handler.params

  return (
    <div className="space-y-4">
      {/* Group Configuration */}
      <div className="flex flex-col gap-3 bg-white/50 p-3 rounded-lg border border-indigo-100">
         <div className="flex items-start justify-between gap-4">
           <div className="flex-1">
              <label className="text-xs font-semibold text-indigo-600 uppercase mb-1 block">Execution Mode</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => onUpdate({...handler.params, mode: 'sequential'})}
                  className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                    mode === 'sequential' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3 h-3" /> 顺序执行
                </button>
                <button 
                  onClick={() => onUpdate({...handler.params, mode: 'parallel'})}
                  className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                    mode === 'parallel' 
                    ? 'bg-purple-600 text-white shadow-sm' 
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Zap className="w-3 h-3" /> 并行分发
                </button>
              </div>
           </div>
           
           {mode === 'parallel' && (
             <div className="flex-1">
               <label className="text-xs font-semibold text-purple-600 uppercase mb-1 block">Merge Strategy</label>
               <select 
                 value={merge_strategy || 'passthrough'}
                 onChange={(e) => onUpdate({...handler.params, merge_strategy: e.target.value})}
                 className="input-field text-sm !py-1.5 !bg-white"
               >
                 <option value="passthrough">忽略分支结果 (Passthrough)</option>
                 <option value="merge_columns">合并所有列 (Merge Columns)</option>
               </select>
             </div>
           )}
         </div>

         <div className="text-xs text-slate-500 leading-tight">
            {mode === 'sequential' 
              ? '按顺序依次执行子步骤。上一步的输出是下一步的输入。' 
              : merge_strategy === 'merge_columns'
                ? '同时执行所有步骤。最后将各分支产生的新列合并回主数据流 (注意列名冲突)。'
                : '同时执行所有步骤。通常用于入库或报警。主流程将忽略分支返回值，继续传递原始数据。'}
         </div>
      </div>

      {/* Recursive Pipeline Editor */}
      <div className="ml-4 border-l-2 border-indigo-200 pl-4 py-2">
        <PipelineEditor 
           pipeline={handlers || []}
           onChange={(newHandlers) => onUpdate({...handler.params, handlers: newHandlers})}
           availableHandlers={availableHandlers}
           columns={columns}
           dataTables={dataTables}
           parentMode={mode} // Pass current mode down
        />
      </div>
    </div>
  )
}

function StandardParamsEditor({ handler, onUpdate, columns, dataTables }) {
  // 简单的路由逻辑
  if (handler.name === 'ColumnMappingHandler') {
    return <MappingEditor mapping={handler.params.mapping} columns={columns} onChange={m => onUpdate({...handler.params, mapping: m})} />
  }
  if (handler.name === 'DropNaHandler') {
    return <SubsetEditor subset={handler.params.subset} columns={columns} onChange={s => onUpdate({...handler.params, subset: s})} />
  }
  if (handler.name === 'TypeConversionHandler') {
    return <TypeConversionEditor conversions={handler.params} columns={columns} onChange={c => onUpdate(c)} />
  }
  if (handler.name === 'DatabaseSaveHandler') {
    return <DatabaseSaveEditor 
      targetTableId={handler.params.target_table_id} 
      conflictMode={handler.params.conflict_mode}
      dataTables={dataTables} 
      onChange={p => onUpdate({...handler.params, ...p})} 
    />
  }
  return <div className="text-slate-400 italic text-sm">该处理器没有可配置的参数</div>
}

// Helpers
function HandlerIcon({ name }) {
  const icons = {
    ColumnMappingHandler: '🔄',
    DropNaHandler: '🧹',
    TypeConversionHandler: '🔧',
    DatabaseSaveHandler: '💾',
    GroupHandler: '🔀'
  }
  return <span className="text-xl">{icons[name] || '⚙️'}</span>
}

function getLabel(name, availableHandlers) {
  const h = availableHandlers.find(x => x.name === name)
  return h?.label || name
}
