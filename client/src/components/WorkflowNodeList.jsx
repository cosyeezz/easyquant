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
  X
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
      title: 'New Custom Node',
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
    if (!window.confirm('Are you sure you want to delete this node definition?')) return
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
      case 'input': return <Box className="w-4 h-4 text-eq-info-text" />
      case 'transform': return <Zap className="w-4 h-4 text-eq-warning-text" />
      case 'output': return <ShieldCheck className="w-4 h-4 text-eq-success-text" />
      default: return <Code className="w-4 h-4 text-eq-text-muted" />
    }
  }

  return (
    <div className="h-full flex flex-col animate-fadeIn space-y-3">
      {/* Linear-Style Toolbar */}
      <div className="flex items-center justify-between px-1 py-2 mb-2 border-b border-eq-border-subtle/50 flex-shrink-0">
        
        {/* Left: Search & Filters */}
        <div className="flex items-center gap-2">
             {/* Search - Ghost Style */}
             <div className="group flex items-center gap-2 px-2 py-1 rounded-md transition-colors hover:bg-eq-bg-elevated/50">
                <Search className="w-3.5 h-3.5 text-eq-text-muted group-hover:text-eq-text-secondary" />
                <input
                    type="text"
                    placeholder="Search nodes..."
                    className="bg-transparent border-none p-0 text-xs w-32 focus:w-48 transition-all duration-300 text-eq-text-primary placeholder:text-eq-text-muted focus:ring-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
             {/* Divider */}
             <div className="w-px h-3.5 bg-eq-border-subtle mx-1"></div>
             
             {searchTerm && (
                <button
                    onClick={() => setSearchTerm('')}
                    className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-eq-text-muted hover:text-eq-text-primary hover:bg-eq-bg-elevated rounded transition-colors"
                >
                    <X className="w-3 h-3" />
                    <span className="font-medium">Reset</span>
                </button>
             )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
            <span className="text-[10px] text-eq-text-muted font-mono tracking-wider">
                {filteredNodes.length} NODES
             </span>
             <div className="w-px h-3.5 bg-eq-border-subtle"></div>
            
            <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-eq-text-secondary hover:text-eq-text-primary hover:bg-eq-bg-elevated rounded transition-colors"
            >
                 <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                 {syncing ? 'Syncing...' : 'Sync Code'}
            </button>

            <button 
                onClick={handleAddNew}
                className="btn-primary !py-1 !px-3 !text-[11px] font-semibold flex items-center gap-1.5 shadow-sm"
            >
                <Plus className="w-3.5 h-3.5" />
                New Node
            </button>
        </div>
      </div>

      {/* Main Content Split View */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 overflow-hidden">
        
        {/* Left: Node List */}
        <div className="col-span-4 flex flex-col min-h-0 bg-eq-bg-surface border border-eq-border-subtle rounded-lg overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-eq-border-subtle">
              {loading ? (
                <div className="p-8 text-center text-xs text-eq-text-muted">Loading Nodes...</div>
              ) : filteredNodes.length === 0 ? (
                <div className="p-8 text-center text-xs text-eq-text-muted">No nodes found.</div>
              ) : (
                  filteredNodes.map(node => (
                    <button
                      key={node.id}
                      onClick={() => {
                        setSelectedNode(node);
                        setIsEditing(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 transition-colors text-left group
                         ${selectedNode?.id === node.id 
                            ? 'bg-eq-bg-elevated border-l-2 border-l-eq-primary-500' 
                            : 'hover:bg-eq-bg-elevated/50 border-l-2 border-l-transparent'}`}
                    >
                      <div className={`p-1.5 rounded-md border border-eq-border-subtle ${selectedNode?.id === node.id ? 'bg-eq-bg-surface' : 'bg-eq-bg-elevated'}`}>
                        {getCategoryIcon(node.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate ${selectedNode?.id === node.id ? 'text-eq-text-primary' : 'text-eq-text-secondary'}`}>{node.title}</div>
                        <div className="text-[10px] text-eq-text-muted truncate font-mono mt-0.5">{node.name}</div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 text-eq-text-muted transition-transform ${selectedNode?.id === node.id ? 'translate-x-0.5 text-eq-primary-500' : 'opacity-0 group-hover:opacity-100'}`} />
                    </button>
                  ))
              )}
            </div>
        </div>

        {/* Right: Detail View */}
        <div className="col-span-8 flex flex-col min-h-0 bg-eq-bg-surface border border-eq-border-subtle rounded-lg overflow-hidden">
          {selectedNode ? (
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="px-5 py-4 border-b border-eq-border-subtle bg-eq-bg-elevated/20 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-eq-bg-surface rounded-lg border border-eq-border-subtle shadow-sm">
                      {getCategoryIcon(selectedNode.category)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-eq-text-primary tracking-tight">{selectedNode.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-eq-bg-elevated border border-eq-border-subtle text-eq-text-secondary">
                          {selectedNode.category}
                        </span>
                        <code className="text-[10px] text-eq-text-muted font-mono bg-eq-bg-elevated px-1 rounded">{selectedNode.handler_path}</code>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1 bg-eq-bg-elevated border border-eq-border-subtle text-eq-text-primary rounded text-xs font-medium hover:bg-eq-bg-overlay transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSave}
                          className="btn-primary !py-1 !px-3 !text-xs"
                        >
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={startEditing}
                          className="p-1.5 text-eq-text-secondary hover:text-eq-primary-500 hover:bg-eq-bg-elevated rounded transition-colors"
                          title="Edit Node Definition"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(selectedNode.id)}
                          className="p-1.5 text-eq-text-secondary hover:text-eq-danger-text hover:bg-eq-danger-bg rounded transition-colors"
                          title="Delete Node"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <textarea 
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    className="mt-3 w-full p-2 bg-eq-bg-surface border border-eq-border-subtle rounded text-sm text-eq-text-primary outline-none focus:border-eq-primary-500"
                    rows={2}
                    placeholder="Enter node description..."
                  />
                ) : (
                  <p className="mt-3 text-sm text-eq-text-secondary leading-relaxed">
                    {selectedNode.description || 'No description available.'}
                  </p>
                )}
              </div>

              {/* Detail Content */}
              <div className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar">
                {isEditing && (
                  <section className="p-4 bg-eq-bg-elevated/50 rounded-lg border border-eq-border-subtle space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest pl-1">Display Name</label>
                        <input 
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                          className="w-full px-2.5 py-1.5 bg-eq-bg-surface border border-eq-border-subtle rounded text-xs text-eq-text-primary focus:border-eq-primary-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest pl-1">Category</label>
                        <select 
                          value={editForm.category}
                          onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                          className="w-full px-2.5 py-1.5 bg-eq-bg-surface border border-eq-border-subtle rounded text-xs text-eq-text-primary focus:border-eq-primary-500 outline-none"
                        >
                          <option value="input">Data Loading (Input)</option>
                          <option value="transform">Transformation</option>
                          <option value="quant">Quantitative (Quant)</option>
                          <option value="output">Output</option>
                          <option value="logic">Logic Control</option>
                        </select>
                      </div>
                    </div>
                  </section>
                )}

                {/* Parameters Editor/Preview */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-eq-text-primary font-bold text-xs uppercase tracking-wider">
                      <Settings className="w-3.5 h-3.5 text-eq-primary-500" />
                      Parameters
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => {
                          const newKey = `param_${Object.keys(editForm.parameters_schema.properties || {}).length + 1}`;
                          const stableId = `_id_${Date.now()}`;
                          const updatedProps = {
                            ...(editForm.parameters_schema.properties || {}),
                            [newKey]: { type: 'string', title: 'New Param', description: '', _stableId: stableId }
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
                        className="flex items-center gap-1 px-2 py-1 bg-eq-bg-elevated text-eq-primary-500 text-[10px] font-bold rounded border border-eq-border-subtle hover:border-eq-primary-500 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Parameter
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      {Object.entries(editForm.parameters_schema.properties || {}).map(([key, prop], idx) => (
                        <div key={prop._stableId || `fallback_${idx}`} className="p-3 bg-eq-bg-elevated/30 rounded border border-eq-border-subtle relative group">
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
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">Key ID</label>
                              <input
                                type="text"
                                value={key}
                                onChange={(e) => {
                                  const newKey = e.target.value;
                                  if (!newKey) return;
                                  const updatedProps = {};
                                  // Rebuild props with new key while preserving order
                                  Object.entries(editForm.parameters_schema.properties).forEach(([k, v]) => {
                                    if (k === key) {
                                      updatedProps[newKey] = { ...v, _stableId: v._stableId || `_id_${Date.now()}` };
                                    } else {
                                      updatedProps[k] = v;
                                    }
                                  });
                                  setEditForm({
                                    ...editForm,
                                    parameters_schema: { ...editForm.parameters_schema, properties: updatedProps }
                                  });
                                }}
                                className="w-full px-2 py-1 bg-eq-bg-surface border border-eq-border-subtle rounded text-[11px] text-eq-text-primary outline-none focus:border-eq-primary-500 font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">Title</label>
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
                                className="w-full px-2 py-1 bg-eq-bg-surface border border-eq-border-subtle rounded text-[11px] text-eq-text-primary outline-none focus:border-eq-primary-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">Type</label>
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
                                className="w-full px-2 py-1 bg-eq-bg-surface border border-eq-border-subtle rounded text-[11px] text-eq-text-primary outline-none"
                              >
                                <option value="string">String</option>
                                <option value="number">Number</option>
                                <option value="boolean">Boolean</option>
                                <option value="object">Object</option>
                                <option value="array">Array</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">Format</label>
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
                                className="w-full px-2 py-1 bg-eq-bg-surface border border-eq-border-subtle rounded text-[11px] text-eq-text-primary outline-none"
                              >
                                <option value="">Default</option>
                                <option value="path">File Path</option>
                                <option value="textarea">Long Text</option>
                                <option value="column-map">Column Map</option>
                                <option value="password">Password</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest">Default</label>
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
                                className="w-full px-2 py-1 bg-eq-bg-surface border border-eq-border-subtle rounded text-[11px] text-eq-text-primary outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(selectedNode.parameters_schema.properties || {}).map(([key, prop]) => (
                        <div key={key} className="p-3 bg-eq-bg-surface rounded-lg border border-eq-border-subtle/60 group hover:border-eq-border-subtle transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-xs text-eq-text-primary">{prop.title || key}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-eq-bg-elevated text-eq-text-muted font-mono uppercase">
                              {prop.type} {prop.format ? `(${prop.format})` : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-eq-text-secondary">{prop.description || 'No description.'}</p>
                        </div>
                      ))}
                      {Object.keys(selectedNode.parameters_schema.properties || {}).length === 0 && (
                          <div className="text-xs text-eq-text-muted italic">No parameters defined.</div>
                      )}
                    </div>
                  )}
                </section>

                {/* Ports Section */}
                <section>
                  <div className="flex items-center gap-2 mb-3 text-eq-text-primary font-bold text-xs uppercase tracking-wider">
                    <RefreshCw className="w-3.5 h-3.5 text-eq-success-text" />
                    Ports & Wiring
                  </div>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest pl-1">Inputs</label>
                        <div className="space-y-1.5">
                          {(editForm.ui_config?.handles?.source || []).map((h, idx) => (
                            <div key={idx} className="flex gap-1.5">
                              <input 
                                type="text"
                                value={h}
                                onChange={(e) => {
                                  const newHandles = [...editForm.ui_config.handles.source];
                                  newHandles[idx] = e.target.value;
                                  setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, source: newHandles}}});
                                }}
                                className="flex-1 px-2 py-1 bg-eq-bg-surface border border-eq-border-subtle rounded text-[11px] text-eq-text-primary outline-none"
                              />
                              <button onClick={() => {
                                const newHandles = editForm.ui_config.handles.source.filter((_, i) => i !== idx);
                                setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, source: newHandles}}});
                              }} className="p-1 text-eq-text-muted hover:text-eq-danger-text">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => {
                            const source = editForm.ui_config?.handles?.source || [];
                            setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, source: [...source, `in_${source.length + 1}`]}}});
                          }} className="w-full py-1 border border-dashed border-eq-border-subtle rounded text-[10px] text-eq-text-muted hover:border-eq-primary-500 hover:text-eq-primary-500">+ Add Input</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-eq-text-muted uppercase tracking-widest pl-1">Outputs</label>
                        <div className="space-y-1.5">
                          {(editForm.ui_config?.handles?.target || []).map((h, idx) => (
                            <div key={idx} className="flex gap-1.5">
                              <input 
                                type="text"
                                value={h}
                                onChange={(e) => {
                                  const newHandles = [...editForm.ui_config.handles.target];
                                  newHandles[idx] = e.target.value;
                                  setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, target: newHandles}}});
                                }}
                                className="flex-1 px-2 py-1 bg-eq-bg-surface border border-eq-border-subtle rounded text-[11px] text-eq-text-primary outline-none"
                              />
                              <button onClick={() => {
                                const newHandles = editForm.ui_config.handles.target.filter((_, i) => i !== idx);
                                setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, target: newHandles}}});
                              }} className="p-1 text-eq-text-muted hover:text-eq-danger-text">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => {
                            const target = editForm.ui_config?.handles?.target || [];
                            setEditForm({...editForm, ui_config: {...editForm.ui_config, handles: {...editForm.ui_config.handles, target: [...target, `out_${target.length + 1}`]}}});
                          }} className="w-full py-1 border border-dashed border-eq-border-subtle rounded text-[10px] text-eq-text-muted hover:border-eq-primary-500 hover:text-eq-primary-500">+ Add Output</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        {selectedNode.ui_config?.handles?.source?.map(h => (
                          <div key={h} className="flex items-center gap-2 p-1.5 bg-eq-bg-elevated/50 border border-eq-border-subtle rounded text-[11px] text-eq-text-secondary">
                            <div className="w-1.5 h-1.5 rounded-full bg-eq-danger-solid"></div>{h}
                          </div>
                        )) || <div className="text-[10px] text-eq-text-muted italic">No Inputs</div>}
                      </div>
                      <div className="space-y-1.5">
                        {selectedNode.ui_config?.handles?.target?.map(h => (
                          <div key={h} className="flex items-center gap-2 p-1.5 bg-eq-bg-elevated/50 border border-eq-border-subtle rounded text-[11px] text-eq-text-secondary">
                            <div className="w-1.5 h-1.5 rounded-full bg-eq-success-solid"></div>{h}
                          </div>
                        )) || <div className="text-[10px] text-eq-text-muted italic">No Outputs</div>}
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <details className="group">
                    <summary className="flex items-center gap-1.5 cursor-pointer text-eq-text-muted hover:text-eq-text-primary transition-all font-bold text-xs">
                      <FileJson className="w-3.5 h-3.5" /> View Raw JSON
                    </summary>
                    <div className="mt-2 bg-eq-bg-base/50 rounded-lg border border-eq-border-subtle p-3 font-mono text-[10px] overflow-x-auto text-eq-text-secondary">
                      <pre>{JSON.stringify(selectedNode, null, 2)}</pre>
                    </div>
                  </details>
                </section>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-eq-text-muted">
              <div className="p-3 bg-eq-bg-elevated rounded-full mb-3"><Info className="w-8 h-8 opacity-20" /></div>
              <p className="text-sm font-medium">Select a node to view details</p>
              <p className="text-xs mt-1 text-eq-text-secondary">Sync code definitions or create custom nodes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkflowNodeList