import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  Search, 
  Settings, 
  Info,
  Code,
  FileJson,
  Box,
  ChevronRight,
  ShieldCheck,
  Zap,
  Boxes
} from 'lucide-react'

const WorkflowNodeList = () => {
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})

  const fetchNodes = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:8000/api/v1/workflow/nodes')
      const data = await response.json()
      setNodes(data)
    } catch (error) {
      console.error('Failed to fetch nodes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    const newNode = {
      name: `custom_node_${Date.now()}`,
      title: '新自定义节点',
      category: 'transform',
      type: 'generic',
      icon: 'box',
      description: '',
      parameters_schema: {
        type: 'object',
        properties: {},
        required: []
      },
      ui_config: {
        width: 240,
        handles: {
          source: ['input'],
          target: ['output']
        }
      },
      handler_path: 'server.nodes.custom.MyHandler',
      is_active: true
    }
    setSelectedNode(newNode)
    setEditForm(newNode)
    setIsEditing(true)
  }

  const startEditing = () => {
    setEditForm({ ...selectedNode })
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      const isNew = !selectedNode.id
      const url = isNew 
        ? 'http://localhost:8000/api/v1/workflow/nodes' 
        : `http://localhost:8000/api/v1/workflow/nodes/${selectedNode.id}`
      
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      
      if (response.ok) {
        setIsEditing(false)
        await fetchNodes()
        const data = await response.json()
        setSelectedNode(isNew ? data : { ...editForm })
      }
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      await fetch('http://localhost:8000/api/v1/workflow/nodes/sync', { method: 'POST' })
      await fetchNodes()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个节点定义吗？')) return
    try {
      await fetch(`http://localhost:8000/api/v1/workflow/nodes/${id}`, { method: 'DELETE' })
      await fetchNodes()
      if (selectedNode?.id === id) setSelectedNode(null)
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  useEffect(() => {
    fetchNodes()
  }, [])

  const filteredNodes = nodes.filter(node => 
    node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'input': return <Box className="w-5 h-5 text-eq-info-text" />
      case 'transform': return <Zap className="w-5 h-5 text-eq-warning-text" />
      case 'output': return <ShieldCheck className="w-5 h-5 text-eq-success-text" />
      default: return <Code className="w-5 h-5 text-eq-text-muted" />
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-eq-text-primary">节点能力管理</h2>
          <p className="text-eq-text-muted text-sm mt-1">管理系统中所有可用于工作流的原子节点</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-eq-elevated border border-eq-border-subtle hover:border-eq-primary-500 text-eq-text-primary transition-all ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中...' : '从代码同步'}
          </button>
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-eq-primary-500 hover:bg-eq-primary-600 text-white font-medium transition-all shadow-lg shadow-eq-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            新增自定义节点
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Node List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-eq-text-muted" />
            <input 
              type="text"
              placeholder="搜索节点..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-eq-surface border border-eq-border-subtle rounded-xl focus:ring-2 focus:ring-eq-primary-500/20 focus:border-eq-primary-500 transition-all outline-none"
            />
          </div>

          <div className="bg-eq-surface rounded-2xl border border-eq-border-subtle overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-eq-text-muted">加载中...</div>
              ) : filteredNodes.length === 0 ? (
                <div className="p-8 text-center text-eq-text-muted">未找到匹配节点</div>
              ) : (
                <div className="divide-y divide-eq-border-subtle">
                  {filteredNodes.map(node => (
                    <button
                      key={node.id}
                      onClick={() => {
                        setSelectedNode(node);
                        setIsEditing(false);
                      }}
                      className={`w-full flex items-center gap-3 p-4 transition-all hover:bg-eq-elevated group ${selectedNode?.id === node.id ? 'bg-eq-elevated border-l-4 border-l-eq-primary-500' : 'border-l-4 border-l-transparent'}`}
                    >
                      <div className="p-2 bg-eq-surface rounded-lg border border-eq-border-subtle group-hover:border-eq-primary-500/30">
                        {getCategoryIcon(node.category)}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-semibold text-eq-text-primary truncate">{node.title}</div>
                        <div className="text-xs text-eq-text-muted truncate font-mono">{node.name}</div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-eq-text-muted transition-transform ${selectedNode?.id === node.id ? 'translate-x-1 text-eq-primary-500' : ''}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Detail View */}
        <div className="lg:col-span-8">
          {selectedNode ? (
            <div className="bg-eq-surface rounded-2xl border border-eq-border-subtle overflow-hidden flex flex-col h-full min-h-[600px]">
              {/* Detail Header */}
              <div className="p-6 border-b border-eq-border-subtle bg-eq-elevated/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-eq-surface rounded-xl border border-eq-border-subtle shadow-sm">
                      {getCategoryIcon(selectedNode.category)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-eq-text-primary">{selectedNode.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-eq-primary-500/10 text-eq-primary-400 border border-eq-primary-500/20">
                          {selectedNode.category}
                        </span>
                        <span className="text-xs text-eq-text-muted font-mono">{selectedNode.handler_path}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={handleSave}
                          className="px-4 py-2 bg-eq-success-solid text-white rounded-lg text-sm font-bold shadow-lg shadow-eq-success-solid/20 hover:scale-[1.02] transition-all"
                        >
                          保存修改
                        </button>
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 bg-eq-elevated border border-eq-border-subtle text-eq-text-primary rounded-lg text-sm font-medium"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={startEditing}
                          className="p-2 text-eq-text-secondary hover:text-eq-primary-500 hover:bg-eq-primary-500/10 rounded-lg transition-all"
                          title="编辑节点定义"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(selectedNode.id)}
                          className="p-2 text-eq-text-secondary hover:text-eq-danger-text hover:bg-eq-danger-bg rounded-lg transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <textarea 
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    className="mt-4 w-full p-3 bg-eq-surface border border-eq-primary-500/50 rounded-xl text-eq-text-primary text-sm outline-none focus:ring-2 focus:ring-eq-primary-500/20"
                    rows={2}
                    placeholder="请输入节点描述..."
                  />
                ) : (
                  <p className="mt-4 text-eq-text-secondary leading-relaxed">
                    {selectedNode.description || '暂无描述信息'}
                  </p>
                )}
              </div>

              {/* Detail Content */}
              <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                {isEditing && (
                  <section className="p-4 bg-eq-primary-500/5 rounded-2xl border border-eq-primary-500/20 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest pl-1">显示名称</label>
                        <input 
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                          className="w-full px-3 py-2 bg-eq-surface border border-eq-border-subtle rounded-lg text-sm text-eq-text-primary focus:border-eq-primary-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest pl-1">分类</label>
                        <select 
                          value={editForm.category}
                          onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                          className="w-full px-3 py-2 bg-eq-surface border border-eq-border-subtle rounded-lg text-sm text-eq-text-primary focus:border-eq-primary-500 outline-none"
                        >
                          <option value="input">数据加载 (Input)</option>
                          <option value="transform">数据处理 (Transform)</option>
                          <option value="quant">量化指标 (Quant)</option>
                          <option value="output">数据输出 (Output)</option>
                          <option value="logic">逻辑控制 (Logic)</option>
                        </select>
                      </div>
                    </div>
                  </section>
                )}

                {/* Parameters Editor/Preview */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-eq-text-primary font-bold">
                      <Settings className="w-4 h-4 text-eq-primary-500" />
                      配置参数 (Parameters)
                    </div>
                    {isEditing && (
                      <button 
                        onClick={() => {
                          const newKey = `param_${Object.keys(editForm.parameters_schema.properties || {}).length + 1}`;
                          const updatedProps = {
                            ...(editForm.parameters_schema.properties || {}),
                            [newKey]: { type: 'string', title: '新参数', description: '' }
                          };
                          setEditForm({
                            ...editForm,
                            parameters_schema: {
                              ...editForm.parameters_schema,
                              properties: updatedProps,
                              required: [...(editForm.parameters_schema.required || []), newKey]
                            }
                          });
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-eq-primary-500/10 text-eq-primary-400 text-[10px] font-bold rounded border border-eq-primary-500/20 hover:bg-eq-primary-500 hover:text-white transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        添加参数
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      {Object.entries(editForm.parameters_schema.properties || {}).map(([key, prop]) => (
                        <div key={key} className="p-4 bg-eq-elevated rounded-xl border border-eq-border-subtle space-y-4 relative group">
                          <button 
                            onClick={() => {
                              const updatedProps = { ...editForm.parameters_schema.properties };
                              delete updatedProps[key];
                              setEditForm({
                                ...editForm,
                                parameters_schema: {
                                  ...editForm.parameters_schema,
                                  properties: updatedProps,
                                  required: (editForm.parameters_schema.required || []).filter(rk => rk !== key)
                                }
                              });
                            }}
                            className="absolute top-2 right-2 p-1 text-eq-text-muted hover:text-eq-danger-text opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">字段 ID (Key)</label>
                              <input 
                                type="text"
                                value={key}
                                onChange={(e) => {
                                  const newKey = e.target.value;
                                  if (!newKey) return;
                                  const updatedProps = { ...editForm.parameters_schema.properties };
                                  updatedProps[newKey] = updatedProps[key];
                                  delete updatedProps[key];
                                  setEditForm({
                                    ...editForm,
                                    parameters_schema: { ...editForm.parameters_schema, properties: updatedProps }
                                  });
                                }}
                                className="w-full px-2 py-1.5 bg-eq-surface border border-eq-border-subtle rounded text-xs text-eq-text-primary outline-none focus:border-eq-primary-500 font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">显示名称 (Title)</label>
                              <input 
                                type="text"
                                value={prop.title || ''}
                                onChange={(e) => {
                                  const updatedProps = { ...editForm.parameters_schema.properties };
                                  updatedProps[key] = { ...prop, title: e.target.value };
                                  setEditForm({
                                    ...editForm,
                                    parameters_schema: { ...editForm.parameters_schema, properties: updatedProps }
                                  });
                                }}
                                className="w-full px-2 py-1.5 bg-eq-surface border border-eq-border-subtle rounded text-xs text-eq-text-primary outline-none focus:border-eq-primary-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">数据类型 (Type)</label>
                              <select 
                                value={prop.type}
                                onChange={(e) => {
                                  const updatedProps = { ...editForm.parameters_schema.properties };
                                  updatedProps[key] = { ...prop, type: e.target.value };
                                  setEditForm({
                                    ...editForm,
                                    parameters_schema: { ...editForm.parameters_schema, properties: updatedProps }
                                  });
                                }}
                                className="w-full px-2 py-1.5 bg-eq-surface border border-eq-border-subtle rounded text-xs text-eq-text-primary outline-none"
                              >
                                <option value="string">字符串 (String)</option>
                                <option value="number">数字 (Number)</option>
                                <option value="boolean">布尔 (Boolean)</option>
                                <option value="object">对象 (Object)</option>
                                <option value="array">列表 (Array)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">UI 格式 (Format)</label>
                              <select 
                                value={prop.format || ''}
                                onChange={(e) => {
                                  const updatedProps = { ...editForm.parameters_schema.properties };
                                  updatedProps[key] = { ...prop, format: e.target.value || undefined };
                                  setEditForm({
                                    ...editForm,
                                    parameters_schema: { ...editForm.parameters_schema, properties: updatedProps }
                                  });
                                }}
                                className="w-full px-2 py-1.5 bg-eq-surface border border-eq-border-subtle rounded text-xs text-eq-text-primary outline-none"
                              >
                                <option value="">无 (Default)</option>
                                <option value="path">路径选择 (Path)</option>
                                <option value="textarea">长文本 (Textarea)</option>
                                <option value="column-map">列名映射 (Column Map)</option>
                                <option value="password">密码 (Password)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">默认值 (Default)</label>
                              <input 
                                type="text"
                                value={prop.default || ''}
                                onChange={(e) => {
                                  const updatedProps = { ...editForm.parameters_schema.properties };
                                  updatedProps[key] = { ...prop, default: e.target.value };
                                  setEditForm({
                                    ...editForm,
                                    parameters_schema: { ...editForm.parameters_schema, properties: updatedProps }
                                  });
                                }}
                                className="w-full px-2 py-1.5 bg-eq-surface border border-eq-border-subtle rounded text-xs text-eq-text-primary outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(selectedNode.parameters_schema.properties || {}).map(([key, prop]) => (
                        <div key={key} className="p-4 bg-eq-elevated rounded-xl border border-eq-border-subtle group hover:border-eq-primary-500/30 transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-eq-text-primary">{prop.title || key}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-eq-surface border border-eq-border-subtle text-eq-text-muted font-mono uppercase">
                              {prop.type} {prop.format ? `(${prop.format})` : ''}
                            </span>
                          </div>
                          <p className="text-xs text-eq-text-secondary">{prop.description || '无描述'}</p>
                          <div className="mt-3">
                            {prop.type === 'string' && prop.format === 'path' ? (
                              <div className="flex gap-2">
                                <div className="flex-1 px-3 py-1.5 bg-eq-surface border border-eq-border-subtle rounded text-xs text-eq-text-muted">/Users/data/...</div>
                                <button className="px-3 py-1 bg-eq-primary-500 text-white text-[10px] rounded font-bold uppercase">浏览</button>
                              </div>
                            ) : (
                              <div className="px-3 py-1.5 bg-eq-surface border border-eq-border-subtle rounded text-xs text-eq-text-muted">
                                {prop.default || '请输入...'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Ports Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4 text-eq-text-primary font-bold">
                    <RefreshCw className="w-4 h-4 text-eq-success-text" />
                    数据端口与连线 (Ports)
                  </div>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest pl-1">输入端口 (Inputs)</label>
                        <div className="space-y-2">
                          {(editForm.ui_config?.handles?.source || []).map((h, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input 
                                type="text"
                                value={h}
                                onChange={(e) => {
                                  const newHandles = [...editForm.ui_config.handles.source];
                                  newHandles[idx] = e.target.value;
                                  setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, source: newHandles}}});
                                }}
                                className="flex-1 px-3 py-1.5 bg-eq-surface border border-eq-border-subtle rounded text-xs text-eq-text-primary outline-none"
                              />
                              <button onClick={() => {
                                const newHandles = editForm.ui_config.handles.source.filter((_, i) => i !== idx);
                                setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, source: newHandles}}});
                              }} className="p-1.5 text-eq-text-muted hover:text-eq-danger-text">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => {
                            const source = editForm.ui_config?.handles?.source || [];
                            setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, source: [...source, `in_${source.length + 1}`]}}});
                          }} className="w-full py-1.5 border border-dashed border-eq-border-subtle rounded text-[10px] text-eq-text-muted hover:border-eq-primary-500 hover:text-eq-primary-500">+ 添加输入端口</button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest pl-1">输出端口 (Outputs)</label>
                        <div className="space-y-2">
                          {(editForm.ui_config?.handles?.target || []).map((h, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input 
                                type="text"
                                value={h}
                                onChange={(e) => {
                                  const newHandles = [...editForm.ui_config.handles.target];
                                  newHandles[idx] = e.target.value;
                                  setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, target: newHandles}}});
                                }}
                                className="flex-1 px-3 py-1.5 bg-eq-surface border border-eq-border-subtle rounded text-xs text-eq-text-primary outline-none"
                              />
                              <button onClick={() => {
                                const newHandles = editForm.ui_config.handles.target.filter((_, i) => i !== idx);
                                setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, target: newHandles}}});
                              }} className="p-1.5 text-eq-text-muted hover:text-eq-danger-text">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => {
                            const target = editForm.ui_config?.handles?.target || [];
                            setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, target: [...target, `out_${target.length + 1}`]}}});
                          }} className="w-full py-1.5 border border-dashed border-eq-border-subtle rounded text-[10px] text-eq-text-muted hover:border-eq-primary-500 hover:text-eq-primary-500">+ 添加输出端口</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        {selectedNode.ui_config?.handles?.source?.map(h => (
                          <div key={h} className="flex items-center gap-2 p-2 bg-eq-danger-bg/20 border border-eq-danger-border/30 rounded-lg text-xs text-eq-danger-text">
                            <div className="w-2 h-2 rounded-full bg-eq-danger-solid"></div>{h}
                          </div>
                        )) || <div className="text-xs text-eq-text-muted italic">无输入</div>}
                      </div>
                      <div className="space-y-2">
                        {selectedNode.ui_config?.handles?.target?.map(h => (
                          <div key={h} className="flex items-center gap-2 p-2 bg-eq-success-bg/20 border border-eq-border-subtle rounded-lg text-xs text-eq-success-text">
                            <div className="w-2 h-2 rounded-full bg-eq-success-solid"></div>{h}
                          </div>
                        )) || <div className="text-xs text-eq-text-muted italic">无输出</div>}
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer text-eq-text-muted hover:text-eq-text-primary transition-all font-bold text-sm">
                      <FileJson className="w-4 h-4" />查看原始 JSON 定义
                    </summary>
                    <div className="mt-4 bg-eq-elevated rounded-xl border border-eq-border-subtle p-4 font-mono text-[10px] overflow-x-auto text-eq-text-secondary">
                      <pre>{JSON.stringify(selectedNode, null, 2)}</pre>
                    </div>
                  </details>
                </section>
              </div>

              <div className="p-4 border-t border-eq-border-subtle bg-eq-elevated/10 flex justify-end gap-3">
                <button className="px-4 py-2 text-sm font-medium text-eq-text-secondary hover:text-eq-text-primary transition-all">查看运行日志</button>
                <button className="px-4 py-2 bg-eq-primary-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-eq-primary-500/20 hover:scale-[1.02] transition-all active:scale-[0.98]">运行单元测试</button>
              </div>
            </div>
          ) : (
            <div className="bg-eq-surface rounded-2xl border border-eq-border-subtle border-dashed h-full min-h-[600px] flex flex-col items-center justify-center text-eq-text-muted animate-in zoom-in-95 duration-500">
              <div className="p-4 bg-eq-elevated rounded-full mb-4"><Info className="w-12 h-12 opacity-20" /></div>
              <p className="text-lg font-medium">请在左侧选择一个节点查看详细能力</p>
              <p className="text-sm mt-1">同步代码定义的节点或手动创建自定义逻辑</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkflowNodeList