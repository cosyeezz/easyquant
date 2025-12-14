import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save } from 'lucide-react';
import { FlowProvider, useFlowContext } from './FlowContext';
import ConfigPanel from './ConfigPanel';

// Import Dify-style components
import { nodeTypes } from './CustomNode';
import CustomEdge from './CustomEdge';

const edgeTypes = {
  custom: CustomEdge,
};

// --- Inner Editor Component (Where Context is available) ---

const DraggableItem = ({ type, label, icon, color }) => (
    <div 
        className={`
            flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing 
            bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all
            select-none text-sm font-medium text-slate-700
        `}
        onDragStart={(event) => {
            event.dataTransfer.setData('application/reactflow', type);
            event.dataTransfer.effectAllowed = 'move';
        }} 
        draggable
    >
        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs ${color} bg-opacity-20`}>{icon}</span>
        {label}
    </div>
);

const FlowEditorInner = ({ onSave }) => {
  const reactFlowWrapper = useRef(null);
  
  // Consume state from Context
  const {
      nodes, edges, onNodesChange, onEdgesChange, setNodes, setEdges,
      setSelectedNodeId, selectedNodeId 
  } = useFlowContext();
  
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [menu, setMenu] = useState(null); // { top, left, visible, sourceNodeId, sourceHandleId }
  const connectSourceRef = useRef(null);
  const justConnectedRef = useRef(false); // Flag to prevent onPaneClick conflict

  // 1. Connection Logic (Standard)
  const onConnect = useCallback((params) => {
      setEdges((eds) => addEdge({
          ...params,
          type: 'custom', // Use our CustomEdge
          style: { stroke: '#cbd5e1' }, // Default color, CustomEdge handles overrides
          markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' },
      }, eds));
      setMenu(null); // Close menu if connected successfully
      connectSourceRef.current = null; // Reset source
  }, [setEdges]);

  // 2. Connect Start (Track source)
  const handleConnectStart = useCallback((_, params) => {
      connectSourceRef.current = params;
      justConnectedRef.current = false;
  }, []);

  // 3. Connect End (Handle drop on pane)
  const handleConnectEnd = useCallback((event) => {
      // Set flag to block potential subsequent click/paneClick events momentarily
      justConnectedRef.current = true;
      setTimeout(() => { justConnectedRef.current = false; }, 200);

      const target = event.target;
      const isHandle = target.classList.contains('react-flow__handle') || target.closest('.react-flow__handle');
      
      // If we dropped on a handle, do nothing (onConnect will handle it)
      if (isHandle) return;

      if (connectSourceRef.current) {
          // Calculate position
          const { top, left } = reactFlowWrapper.current.getBoundingClientRect();
          // Handle both Mouse and Touch events
          const clientX = event.clientX || event.changedTouches?.[0]?.clientX;
          const clientY = event.clientY || event.changedTouches?.[0]?.clientY;

          if (clientX && clientY) {
              setMenu({
                  top: clientY - top,
                  left: clientX - left,
                  sourceNodeId: connectSourceRef.current.nodeId,
                  sourceHandleId: connectSourceRef.current.handleId
              });
          }
      }
  }, []);

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
                setNodes((nds) => nds.filter((n) => n.id !== newNode.id));
                setSelectedNodeId(null);
            } 
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, setSelectedNodeId]
  );
  
  const addNodeFromMenu = (type) => {
      if (!menu) return;
      
      const position = reactFlowInstance.screenToFlowPosition({
          x: menu.left + reactFlowWrapper.current.getBoundingClientRect().left,
          y: menu.top + reactFlowWrapper.current.getBoundingClientRect().top
      });

      const newNodeId = `node_${Date.now()}`;
      const newNode = {
          id: newNodeId,
          type,
          position,
          data: { 
             label: `${type} node`,
             onDelete: () => setNodes((nds) => nds.filter((n) => n.id !== newNodeId))
          }
      };

      setNodes((nds) => nds.concat(newNode));
      
      // Auto Connect
      if (menu.sourceNodeId) {
          setEdges((eds) => addEdge({
              source: menu.sourceNodeId,
              sourceHandle: menu.sourceHandleId,
              target: newNodeId,
              targetHandle: 'in', // Assume 'in' is the default input handle
              type: 'custom',
              style: { stroke: '#cbd5e1' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' },
          }, eds));
      }

      setMenu(null);
      connectSourceRef.current = null;
  };
  
  // Close menu on click pane
  const onPaneClick = useCallback(() => {
      if (justConnectedRef.current) return; // Ignore click if it came from connection end
      setSelectedNodeId(null);
      setMenu(null);
  }, [setSelectedNodeId]);

  return (
    <div className="w-full h-full flex flex-col relative bg-slate-50/50">
       {/* Toolbar */}
       <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center px-6 gap-6 shadow-sm z-10 shrink-0">
           <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-lg tracking-tight">Pipeline Canvas</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Visual Editor</span>
           </div>
           
           <div className="h-8 w-px bg-slate-200 mx-2"></div>
           
           <div className="flex gap-3">
               <DraggableItem type="source" label="数据源" icon="📄" color="bg-blue-100 text-blue-600" />
               <DraggableItem type="processor" label="处理器" icon="⚡" color="bg-purple-100 text-purple-600" />
               <DraggableItem type="sink" label="存储" icon="💾" color="bg-rose-100 text-rose-600" />
           </div>
           
           <div className="ml-auto flex items-center gap-3">
                <div className="text-xs text-slate-400 mr-2 hidden lg:block">
                    提示: 拖拽节点到画布, 点击配置参数
                </div>
               <button 
                onClick={() => onSave(nodes, edges)} 
                className="btn-primary px-4 py-2 flex items-center gap-2 text-sm shadow-lg shadow-primary-500/20"
               >
                 <Save className="w-4 h-4" />
                 保存配置
               </button>
           </div>
       </div>

       {/* Canvas */}
       <div className="flex-1 relative" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectStart={handleConnectStart}
                onConnectEnd={handleConnectEnd}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={(_, node) => {
                    setSelectedNodeId(node.id);
                    setMenu(null);
                }}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                panOnScroll={true}
                selectionOnDrag={true}
                zoomOnScroll={false}
                zoomOnDoubleClick={false}
                minZoom={0.1}
                style={{ backgroundColor: 'var(--color-workflow-canvas-workflow-bg)' }}
            >
                <Controls className="bg-white border border-slate-200 shadow-md rounded-lg overflow-hidden !m-4" />
                <MiniMap 
                    className="!bg-slate-50 border border-slate-200 shadow-lg rounded-lg overflow-hidden !m-4" 
                    maskColor="rgba(240, 242, 245, 0.7)"
                    nodeColor={(n) => {
                        if (n.type === 'source') return '#3b82f6';
                        if (n.type === 'sink') return '#f43f5e';
                        return '#a855f7';
                    }}
                />
                <Background variant="dots" gap={20} size={1} color="var(--color-workflow-canvas-workflow-dot-color)" />
            </ReactFlow>
            
            {/* Quick Add Menu (Drop-to-connect) */}
            {menu && (
                <div 
                    className="absolute bg-white rounded-lg shadow-xl border border-slate-200 p-1 z-50 flex flex-col gap-1 w-40 animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: menu.top, left: menu.left }}
                >
                    <div className="px-2 py-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100 mb-1">
                        添加后续节点
                    </div>
                    <button onClick={() => addNodeFromMenu('processor')} className="text-left px-3 py-2 hover:bg-slate-50 rounded flex items-center gap-2 text-xs font-medium text-slate-700">
                        <span className="w-4 h-4 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-[10px]">⚡</span>
                        处理器 (Processor)
                    </button>
                    <button onClick={() => addNodeFromMenu('sink')} className="text-left px-3 py-2 hover:bg-slate-50 rounded flex items-center gap-2 text-xs font-medium text-slate-700">
                         <span className="w-4 h-4 rounded bg-rose-100 text-rose-600 flex items-center justify-center text-[10px]">💾</span>
                        数据存储 (Sink)
                    </button>
                </div>
            )}

            {/* Config Panel Drawer */}
            {selectedNodeId && <ConfigPanel />}
       </div>
    </div>
  );
};

// --- Wrapper Component ---

const FlowContextWrapper = ({ children, initialNodes, initialEdges }) => {
    // Manage state here so FlowProvider can access it
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges || []);

    return (
        <FlowProvider 
            nodes={nodes} 
            edges={edges} 
            setNodes={setNodes} 
            setEdges={setEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
        >
            {children}
        </FlowProvider>
    );
};

export default function FlowEditor({ initialNodes, initialEdges, onSave }) {
    return (
        <ReactFlowProvider>
            <FlowContextWrapper initialNodes={initialNodes} initialEdges={initialEdges}>
                <FlowEditorInner onSave={onSave} />
            </FlowContextWrapper>
        </ReactFlowProvider>
    );
}

