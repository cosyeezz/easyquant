import { useEffect, useState } from 'react';
import { useFlowContext } from './FlowContext';
import { useNodes } from 'reactflow';
import { X, Save } from 'lucide-react';
import { MappingEditor, SubsetEditor, TypeConversionEditor, DatabaseSaveEditor } from '../HandlerEditors';
import FilePathPicker from '../FilePathPicker';
import api from '../../services/api';

export default function ConfigPanel() {
  const { selectedNodeId, setSelectedNodeId, getUpstreamInfo, updateNodeSchema } = useFlowContext();
  const nodes = useNodes();
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const [dataTables, setDataTables] = useState([]);

  // Load dependency data
  useEffect(() => {
     api.getDataTables({ page_size: 1000 }).then(res => setDataTables(res.items || [])).catch(console.error);
  }, []);

  if (!selectedNode) return null;

  // 获取上游 Schema (这是关键！)
  // 假设主输入端口 id 都是 'in' (除了 Source 节点没有输入)
  const upstreamInfo = getUpstreamInfo(selectedNodeId);
  const inputColumns = upstreamInfo['in']?.columns || []; // 获取上游传过来的列名列表

  const handleUpdate = (newParams) => {
    // 更新 Node Data
    selectedNode.data = { ...selectedNode.data, ...newParams };
    // Force update? React Flow nodes state is managed internally, 
    // we need to use setNodes from context to trigger re-render if we want to reflect changes immediately
    // But usually data mutation works if we don't need immediate UI repaint of the node itself.
    // For schema propagation, we need to recalculate schema here.
    
    // RE-CALCULATE SCHEMA based on new params
    if (selectedNode.type === 'source') {
        if (newParams.previewColumns) {
            updateNodeSchema(selectedNodeId, { out: newParams.previewColumns });
        }
    } else if (selectedNode.type === 'processor') {
        // Example: ColumnMapping
        // If it's a mapping node, calculate output columns
        if (newParams.handler === 'ColumnMappingHandler' && newParams.mapping) {
            const newCols = [...inputColumns]; // Start with input
            // Apply mapping logic... (simplified)
            // For now, just pass through or use mapping keys
        }
    }
  };

  // Close handler
  const close = () => setSelectedNodeId(null);

  return (
    <div className="absolute top-0 right-0 bottom-0 w-96 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col animate-slideInRight">
      {/* Header */}
      <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50">
         <span className="font-bold text-slate-700">{selectedNode.data.label || 'Configuration'}</span>
         <button onClick={close} className="p-1 hover:bg-slate-200 rounded text-slate-500">
             <X className="w-5 h-5" />
         </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
          <NodeSpecificEditor 
              node={selectedNode} 
              inputColumns={inputColumns} 
              onUpdate={handleUpdate}
              dataTables={dataTables}
          />
      </div>
    </div>
  );
}

function NodeSpecificEditor({ node, inputColumns, onUpdate, dataTables }) {
    const [localData, setLocalData] = useState(node.data);
    
    // Sync local state when node changes
    useEffect(() => setLocalData(node.data), [node]);

    const handleChange = (key, value) => {
        const newData = { ...localData, [key]: value };
        setLocalData(newData);
        onUpdate(newData); // Propagate up
    };

    // --- Source Node ---
    if (node.type === 'source') {
        const handlePathChange = async (config) => {
            handleChange('path', config.path);
            // Auto preview
            if (config.path) {
                try {
                    const res = await api.previewSource('csv_dir', { path: config.path }); // simplify source_type
                    const cols = res.columns || [];
                    handleChange('previewColumns', cols); // Save columns to node data
                } catch (e) {
                    console.error(e);
                }
            }
        };

        return (
            <div className="space-y-4">
                <div>
                    <label className="form-label">文件路径</label>
                    <FilePathPicker 
                        value={{ path: localData.path }} 
                        onChange={handlePathChange}
                    />
                </div>
                {localData.previewColumns && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border">
                        <strong>输出列 ({localData.previewColumns.length}):</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {localData.previewColumns.map(c => (
                                <span key={c} className="px-1 bg-white border rounded">{c}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- Processor Node ---
    if (node.type === 'processor') {
        const handlerType = localData.handler || 'ColumnMappingHandler';

        return (
            <div className="space-y-4">
                <div>
                    <label className="form-label">处理器类型</label>
                    <select 
                        value={handlerType} 
                        onChange={e => handleChange('handler', e.target.value)}
                        className="input-field"
                    >
                        <option value="ColumnMappingHandler">字段映射 (Rename)</option>
                        <option value="DropNaHandler">缺失值处理 (Drop NA)</option>
                        <option value="TypeConversionHandler">类型转换 (Cast)</option>
                    </select>
                </div>

                {/* Sub-Editors */}
                <div className="pt-2 border-t border-slate-100">
                    {handlerType === 'ColumnMappingHandler' && (
                        <MappingEditor 
                            mapping={localData.mapping || {}} 
                            columns={inputColumns} // Pass upstream columns!
                            onChange={m => handleChange('mapping', m)} 
                        />
                    )}
                    {handlerType === 'DropNaHandler' && (
                        <SubsetEditor 
                            subset={localData.subset || []} 
                            columns={inputColumns}
                            onChange={s => handleChange('subset', s)} 
                        />
                    )}
                    {handlerType === 'TypeConversionHandler' && (
                        <TypeConversionEditor 
                            conversions={localData.conversions || {}} 
                            columns={inputColumns}
                            onChange={c => handleChange('conversions', c)} 
                        />
                    )}
                </div>
            </div>
        );
    }

    // --- Sink Node ---
    if (node.type === 'sink') {
        return (
            <DatabaseSaveEditor 
                targetTableId={localData.target_table_id} 
                conflictMode={localData.conflict_mode}
                dataTables={dataTables} 
                onChange={p => {
                    handleChange('target_table_id', p.target_table_id);
                    handleChange('conflict_mode', p.conflict_mode);
                }} 
            />
        );
    }

    return <div>Unknown Node Type</div>;
}
