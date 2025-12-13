import { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Settings, Trash2 } from 'lucide-react';
import { FlowProvider, useFlowContext } from './FlowContext';
import ConfigPanel from './ConfigPanel';

// --- Custom Node Components (Keep as is) ---
const BaseNode = ({ data, isConnectable, children, label, icon, inputs = [], outputs = [] }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 min-w-[180px] group hover:border-primary-400 transition-colors">
      {/* Inputs (Handles) */}
      {inputs.map((input, i) => (
        <div key={input.id} className="relative">
             <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                isConnectable={isConnectable}
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white hover:!bg-primary-500"
                style={{ top: '50%' }}
            />
        </div>
      ))}

      {/* Header */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 rounded-t-lg flex items-center justify-between handle-drag">
        <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="font-semibold text-sm text-slate-700">{label}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            {/* Direct delete button on node */}
            <button className="p-1 hover:bg-red-100 rounded text-red-500" onClick={(e) => { e.stopPropagation(); data.onDelete(); }}>
                <Trash2 className="w-3 h-3" />
            </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 text-xs text-slate-500">
        {children || <div className="italic">无配置参数</div>}
      </div>

      {/* Outputs (Handles) */}
      {outputs.map((output, i) => (
        <div key={output.id} className="relative">
             <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                isConnectable={isConnectable}
                className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-white hover:!bg-primary-500"
                style={{ top: '50%' }}
            />
        </div>
      ))}
    </div>
  );
};

const SourceNode = (props) => (
  <BaseNode {...props} label="CSV Source" icon="📄" outputs={[{id: 'out'}]}>
     路径: {props.data.path ? props.data.path.split('/').pop() : '未选择'}
     {props.data.previewColumns && <div className="mt-1 text-[10px] text-emerald-600">已加载 {props.data.previewColumns.length} 列</div>}
  </BaseNode>
);

const ProcessNode = (props) => (
  <BaseNode {...props} label={props.data.label || 'Processor'} icon="⚡" inputs={[{id: 'in'}]} outputs={[{id: 'out'}]}>
      类型: {props.data.handler === 'ColumnMappingHandler' ? '字段映射' : props.data.handler === 'DropNaHandler' ? '清洗' : '转换'}
  </BaseNode>
);

const SinkNode = (props) => (
  <BaseNode {...props} label="Database Save" icon="💾" inputs={[{id: 'in'}]}>
      Table ID: {props.data.target_table_id || 'None'}
  </BaseNode>
);

const nodeTypes = {
  source: SourceNode,
  processor: ProcessNode,
  sink: SinkNode,
};

// --- Inner Editor Component (Where Context is available) ---

const FlowEditorInner = ({ onSave }) => {
  const reactFlowWrapper = useRef(null);
  const { setNodes, setEdges, setSelectedNodeId, selectedNodeId } = useFlowContext();
  const [nodes, setNodesLocal, onNodesChange] = useNodesState([]);
  const [edges, setEdgesLocal, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Sync React Flow state to Context
  // In a real app, we might merge these, but for now we pass setters to context provider wrapper
  // Wait, useNodesState manages local state. We need to expose it.
  
  // Let's rely on React Flow's internal state management but hook into events.

  const onConnect = useCallback((params) => setEdgesLocal((eds) => addEdge(params, eds)), [setEdgesLocal]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: { 
            label: `${type} node`, 
            onDelete: () => {
                setNodesLocal((nds) => nds.filter((n) => n.id !== newNode.id));
                setSelectedNodeId(null);
            } 
        },
      };

      setNodesLocal((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodesLocal, setSelectedNodeId]
  );

  // Expose nodes/edges to context whenever they change (for downstream components like ConfigPanel to access latest graph)
  // We can use a simpler approach: Pass the state setters to the Provider in the Parent component.
  
  return (
    <div className="w-full h-full flex flex-col relative">
       {/* Toolbar */}
       <div className="h-12 border-b border-slate-200 bg-white flex items-center px-4 gap-4 shadow-sm z-10 shrink-0">
           <span className="font-bold text-slate-700">Canvas</span>
           <div className="h-6 w-px bg-slate-200"></div>
           <div className="flex gap-2">
               <div className="draggable-node px-3 py-1 bg-slate-100 border border-slate-300 rounded cursor-grab text-xs font-medium hover:bg-slate-200" onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'source')} draggable>
                  📄 Source
               </div>
               <div className="draggable-node px-3 py-1 bg-slate-100 border border-slate-300 rounded cursor-grab text-xs font-medium hover:bg-slate-200" onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'processor')} draggable>
                  ⚡ Processor
               </div>
               <div className="draggable-node px-3 py-1 bg-slate-100 border border-slate-300 rounded cursor-grab text-xs font-medium hover:bg-slate-200" onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'sink')} draggable>
                  💾 Sink
               </div>
           </div>
           <div className="ml-auto">
               <button onClick={() => onSave(nodes, edges)} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded hover:bg-primary-700">Save Graph</button>
           </div>
       </div>

       {/* Canvas */}
       <div className="flex-1 bg-slate-50 relative" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                nodeTypes={nodeTypes}
                fitView
            >
                <Controls />
                <MiniMap />
                <Background variant="dots" gap={12} size={1} />
            </ReactFlow>
            
            {/* Config Panel Drawer */}
            {selectedNodeId && <ConfigPanel />}
       </div>
    </div>
  );
};

// --- Wrapper Component ---

export default function FlowEditor({ initialNodes, initialEdges, onSave }) {
    // We lift the state up here or let FlowProvider manage it?
    // Actually, React Flow manages its own state via hooks.
    // The Context needs access to nodes to calculate schema.
    
    // To make things simple: We render FlowProvider, and inside it we render ReactFlowProvider and our Editor.
    // But `useNodesState` must be inside ReactFlowProvider usually? No, it's a standalone hook.
    
    // The issue: ConfigPanel needs access to `nodes`. 
    // `useNodes()` hook only works inside <ReactFlowProvider>.
    
    return (
        <ReactFlowProvider>
            <FlowContextWrapper initialNodes={initialNodes} initialEdges={initialEdges} onSave={onSave}>
                <FlowEditorInner onSave={onSave} />
            </FlowContextWrapper>
        </ReactFlowProvider>
    );
}

// Helper to bridge Context and React Flow state
const FlowContextWrapper = ({ children, initialNodes, initialEdges }) => {
    // We can't access React Flow state here easily without using useNodes() which works inside ReactFlowProvider
    const nodes = useNodesState(initialNodes || [])[0]; // Just initial? No.
    
    // Better approach: FlowEditorInner manages state and renders ContextProvider passing the state down?
    // No, FlowProvider is the parent.
    
    // Correct Architecture:
    // FlowEditor (Component)
    //   -> ReactFlowProvider
    //      -> FlowProvider (Our Custom Context)
    //         -> FlowEditorInner (Contains ReactFlow + ConfigPanel)
    
    // But how does FlowProvider get `nodes`? 
    // It can use `useNodes()` from ReactFlow!
    
    const nodesFromRF = useNodes(); // This works because we are inside ReactFlowProvider
    const edgesFromRF = useEdges();
    
    // However, `useNodes()` only returns nodes if they are managed by React Flow internal store.
    // When using `useNodesState` (controlled mode), we are responsible for the state.
    
    // Let's keep it simple: FlowEditorInner uses `useNodesState`.
    // We pass `nodes` and `edges` to FlowProvider as props.
    // But `nodes` change.
    
    return <>{children}</>; 
}

