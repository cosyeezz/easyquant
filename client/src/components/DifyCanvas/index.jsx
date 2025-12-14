import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import dagre from 'dagre';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  getOutgoers,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { RiAddLine } from '@remixicon/react';

import DifyNode from './nodes/DifyNode';
import DifyEdge from './edges/DifyEdge';
import ConfigPanel from './components/ConfigPanel';
import Header from './components/Header';
import CanvasControl from './components/CanvasControl';
import BlockSelector from './components/BlockSelector';
import { BLOCKS } from './constants/blocks';
import apiService from '../../services/api';
import { graphToPipeline } from './utils/graphToPipeline';

// Register custom types
const nodeTypes = {
  difyNode: DifyNode,
};
const edgeTypes = {
  difyEdge: DifyEdge,
};

// Dagre Layout Setup
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 240;

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 60,  
    ranksep: 100, 
  });

  nodes.forEach((node) => {
    // Dynamic height estimation
    // Use measured height if available, otherwise estimate based on content
    const height = node.measured?.height || (node.data?.desc ? 100 : 60);
    const width = node.measured?.width || nodeWidth;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const height = node.measured?.height || (node.data?.desc ? 100 : 60);
    const width = node.measured?.width || nodeWidth;

    // Adjust position from center (dagre) to top-left (reactflow)
    node.position = {
      x: nodeWithPosition.x - width / 2,
      y: nodeWithPosition.y - height / 2,
    };
    return node;
  });

  return { nodes: layoutedNodes, edges };
};

// Initial Mock Data matching Dify's internal structure
const initialNodes = [
  {
    id: '1',
    type: 'difyNode',
    position: { x: 100, y: 100 },
    data: { 
        title: 'START', 
        type: 'start',
        desc: 'Entry point of the workflow.',
        _runningStatus: null
    },
  },
  {
    id: '2',
    type: 'difyNode',
    position: { x: 500, y: 100 },
    data: {
        title: 'LLM', 
        type: 'llm',
        desc: 'Invokes the large language model to process input.',
        _runningStatus: null
    },
  },
  {
    id: '3',
    type: 'difyNode',
    position: { x: 900, y: 200 },
    data: { 
        title: 'HTTP REQUEST', 
        type: 'http-request',
        desc: 'Fetches external data.',
        _runningStatus: null
    },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'difyEdge' },
  { id: 'e2-3', source: '2', target: '3', type: 'difyEdge' },
];

const DifyCanvasContent = () => {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  
  // App State
  const [name, setName] = useState('');
  const [configId, setConfigId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Initial load state
  const { getViewport, setViewport, screenToFlowPosition, fitView } = useReactFlow();

  // Layout Handler
  const handleFormat = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    
    // Fit view after a slight delay to allow rendering
    setTimeout(() => {
        fitView({ padding: 0.2 });
    }, 50);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  // Connection Interactions
  const connectionStartRef = useRef(null);
  const [floatingMenu, setFloatingMenu] = useState(null); // { x, y, sourceId, sourceHandle }

  const isValidConnection = useCallback(
    (connection) => {
      // Prevent self-loops
      if (connection.source === connection.target) return false;

      // Prevent cycles: Check if Target can reach Source
      // We are adding Source -> Target.
      // If Target -> ... -> Source exists, then adding Source -> Target creates a cycle.
      const targetNode = nodes.find((n) => n.id === connection.target);
      const sourceNode = nodes.find((n) => n.id === connection.source);

      if (!targetNode || !sourceNode) return false;

      // DFS to find path from targetNode to sourceNode
      const stack = [targetNode];
      const visited = new Set();
      
      while (stack.length > 0) {
          const current = stack.pop();
          if (visited.has(current.id)) continue;
          visited.add(current.id);

          if (current.id === sourceNode.id) return false; // Cycle detected

          const outgoers = getOutgoers(current, nodes, edges);
          stack.push(...outgoers);
      }

      return true;
    },
    [nodes, edges]
  );

  const onConnectStart = useCallback((_, { nodeId, handleId, handleType }) => {
    connectionStartRef.current = { nodeId, handleId, handleType };
  }, []);

  const onConnectEnd = useCallback(
    (event) => {
      const targetIsPane = event.target.classList.contains('react-flow__pane');
      const targetNodeEl = event.target.closest('.react-flow__node');
      
      if (connectionStartRef.current) {
        if (targetIsPane) {
            // Dropped on empty space -> Show Menu
            const { clientX, clientY } = event instanceof MouseEvent ? event : event.changedTouches[0];
            
            // We store screen coords for the menu position (fixed/absolute overlay)
            // We also calc flow position for the new node
            const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
            
            setFloatingMenu({
                x: clientX,
                y: clientY,
                flowPos,
                sourceId: connectionStartRef.current.nodeId,
                sourceHandle: connectionStartRef.current.handleId
            });
        } else if (targetNodeEl) {
             // Dropped on a Node -> Auto Connect to its target handle
             const targetNodeId = targetNodeEl.getAttribute('data-id');
             const { nodeId: sourceNodeId, handleType: sourceHandleType } = connectionStartRef.current;
             
             // Ensure we are connecting Source -> Target (Input)
             // And not connecting to self
             if (sourceNodeId !== targetNodeId && sourceHandleType === 'source') {
                 const connection = { source: sourceNodeId, target: targetNodeId };
                 
                 // Check for Cycles
                 if (isValidConnection(connection)) {
                     const newEdge = {
                         id: uuidv4(),
                         source: sourceNodeId,
                         target: targetNodeId,
                         targetHandle: 'target', // Assume default input handle is 'target'
                         type: 'difyEdge'
                     };
                     setEdges((eds) => addEdge(newEdge, eds));
                 } else {
                     alert('Cannot connect: Cycle detected.');
                 }
             }
        }
      }
      connectionStartRef.current = null;
    },
    [screenToFlowPosition, setEdges, isValidConnection]
  );

  const handleFloatingSelect = useCallback((type) => {
    if (!floatingMenu) return;

    const { flowPos, sourceId, sourceHandle } = floatingMenu;
    const newNodeId = uuidv4();
    const blockMeta = BLOCKS.find(b => b.type === type) || { title: 'New Node', description: '' };

    const newNode = {
        id: newNodeId,
        type: 'difyNode',
        position: flowPos, // Use the drop position
        data: {
            title: blockMeta.title,
            type: type,
            desc: blockMeta.description,
            _runningStatus: null,
        }
    };

    const newEdge = { 
        id: uuidv4(), 
        source: sourceId, 
        sourceHandle: sourceHandle,
        target: newNodeId, 
        targetHandle: 'target',
        type: 'difyEdge' 
    };

    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat(newEdge));
    setFloatingMenu(null);
  }, [floatingMenu, setNodes, setEdges]);


  // --- Load Initial Data ---
  useEffect(() => {
    const loadLatestConfig = async () => {
        try {
            const configs = await apiService.getETLConfigs();
            if (configs && configs.length > 0) {
                // For now, just take the most recent one (assuming API returns sorted or we pick last/first)
                const latestConfig = configs[0]; 
                
                if (latestConfig.graph_config) {
                    const { nodes: loadedNodes, edges: loadedEdges, viewport } = latestConfig.graph_config;
                    
                    if (loadedNodes) setNodes(loadedNodes);
                    if (loadedEdges) setEdges(loadedEdges);
                    if (viewport) setViewport(viewport);
                }
                
                setConfigId(latestConfig.id);
                setName(latestConfig.name);
                console.log('Loaded config:', latestConfig.name);
            }
        } catch (err) {
            console.error('Failed to load initial config:', err);
        } finally {
            setIsLoading(false);
        }
    };

    loadLatestConfig();
  }, [setNodes, setEdges, setViewport]);

  // --- Persistence Handlers ---

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const pipelineConfig = graphToPipeline(nodes, edges);
        const graphConfig = {
            nodes,
            edges,
            viewport: getViewport()
        };

        const payload = {
            name: name || 'Untitled Workflow',
            description: 'Created via Graph Editor',
            source_type: 'graph',
            source_config: {}, // Placeholder
            pipeline_config: pipelineConfig,
            graph_config: graphConfig
        };

        let res;
        if (configId) {
            res = await apiService.updateETLConfig(configId, payload);
            console.log('Updated:', res);
        } else {
            res = await apiService.createETLConfig(payload);
            setConfigId(res.id);
            console.log('Created:', res);
        }
        alert('Saved successfully!');
    } catch (err) {
        console.error(err);
        alert('Failed to save: ' + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!configId) {
        alert('Please save the workflow first.');
        return;
    }
    try {
        await apiService.runETLConfig(configId);
        alert('Run started! Check Process Monitor.');
    } catch (err) {
        console.error(err);
        alert('Failed to run: ' + err.message);
    }
  };

  // --- Graph Handlers ---

  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [setNodes, setEdges, selectedNodeId]);

  const handleDuplicateNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const newNode = {
        ...node,
        id: uuidv4(),
        position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
        },
        data: {
            ...node.data,
            title: `${node.data.title} (Copy)`,
            selected: false,
        },
        selected: false,
    };

    setNodes((nds) => nds.concat(newNode));
  }, [nodes, setNodes]);

  const handleAddNodeFromSource = useCallback((sourceNodeId, type) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    const newNodeId = uuidv4();
    const blockMeta = BLOCKS.find(b => b.type === type) || { title: 'New Node', description: '' };
    
    // Position to the right and slightly down or centered? 
    // Dify places it to the right (approx 300px)
    const newNodePosition = {
        x: sourceNode.position.x + 350,
        y: sourceNode.position.y,
    };

    const newNode = {
        id: newNodeId,
        type: 'difyNode',
        position: newNodePosition,
        data: {
            title: blockMeta.title,
            type: type,
            desc: blockMeta.description,
            _runningStatus: null,
        }
    };

    const newEdge = { 
        id: uuidv4(), 
        source: sourceNodeId, 
        target: newNodeId, 
        type: 'difyEdge' 
    };

    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.concat(newEdge));
  }, [nodes, setNodes, setEdges]);

  const handleAddStartNode = useCallback(() => {
    const newNode = {
        id: uuidv4(),
        type: 'difyNode',
        position: { x: 100, y: 100 },
        data: { 
            title: 'START', 
            type: 'start',
            desc: 'Entry point of the workflow.',
            _runningStatus: null
        },
    };
    setNodes([newNode]);
    setViewport({ x: 0, y: 0, zoom: 1 });
  }, [setNodes, setViewport]);

  const handleInsertNode = useCallback(({ sourceNodeId, targetNodeId, edgeId, type }) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    const targetNode = nodes.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode) return;

    const newNodeId = uuidv4();
    const blockMeta = BLOCKS.find(b => b.type === type) || { title: 'New Node', description: '' };
    
    // Calculate simple midpoint
    const newNodePosition = {
        x: (sourceNode.position.x + targetNode.position.x) / 2,
        y: (sourceNode.position.y + targetNode.position.y) / 2,
    };

    const newNode = {
        id: newNodeId,
        type: 'difyNode',
        position: newNodePosition,
        data: {
            title: blockMeta.title,
            type: type,
            desc: blockMeta.description,
            _runningStatus: null,
        }
    };

    const newEdge1 = { 
        id: uuidv4(), 
        source: sourceNodeId, 
        target: newNodeId, 
        type: 'difyEdge' 
    };
    
    const newEdge2 = { 
        id: uuidv4(), 
        source: newNodeId, 
        target: targetNodeId, 
        type: 'difyEdge' 
    };

    // Update State
    setNodes((nds) => nds.concat(newNode));
    setEdges((eds) => eds.filter(e => e.id !== edgeId).concat([newEdge1, newEdge2]));

  }, [nodes, setNodes, setEdges]);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleUpdateNode = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
  }, [setNodes]);

  // --- Prop Injection ---
  
  const nodesWithHandlers = useMemo(() => nodes.map(node => ({
    ...node,
    data: {
        ...node.data,
        onDelete: handleDeleteNode,
        onDuplicate: handleDuplicateNode,
        onAddNode: handleAddNodeFromSource,
        selected: node.id === selectedNodeId
    }
  })), [nodes, handleDeleteNode, handleDuplicateNode, handleAddNodeFromSource, selectedNodeId]);

  const edgesWithHandlers = useMemo(() => edges.map(edge => ({
    ...edge,
    data: {
        ...edge.data,
        onInsertNode: handleInsertNode,
        onDelete: () => {
            setEdges((eds) => eds.filter(e => e.id !== edge.id));
        }
    }
  })), [edges, handleInsertNode, setEdges]);


  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'difyEdge' }, eds)),
    [setEdges],
  );

  const selectedNode = useMemo(() => 
    nodes.find(n => n.id === selectedNodeId), 
  [nodes, selectedNodeId]);

  return (
    <div className="w-full h-screen bg-gray-50 relative">
      <Header 
        name={name} 
        onNameChange={setName} 
        onSave={handleSave} 
        onRun={handleRun}
        isSaving={isSaving}
      /> 
      <ReactFlow
        nodes={nodesWithHandlers}
        edges={edgesWithHandlers}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Strict}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background 
            color="#D0D5DD" // gray-300
            gap={20} 
            size={1} 
        />
        
        {/* Empty State: Add Start Node Button */}
        {nodes.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
                    className="pointer-events-auto flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-primary-700 transition-colors"
                    onClick={handleAddStartNode}
                >
                    <RiAddLine size={18} />
                    Add Start Node
                </button>
            </div>
        )}

      </ReactFlow>

      <CanvasControl onLayout={handleFormat} />

      {/* Config Panel */}
      {selectedNode && (
        <ConfigPanel 
            node={selectedNode} 
            onClose={() => setSelectedNodeId(null)}
            onUpdate={handleUpdateNode}
        />
      )}

      {/* Floating Menu for Drag-to-Add */}
      {floatingMenu && (
          <div 
            className="fixed z-50 pointer-events-none" 
            style={{ 
                left: floatingMenu.x, 
                top: floatingMenu.y,
            }}
          >
              <div className="pointer-events-auto relative">
                <BlockSelector 
                    open={true}
                    setOpen={(val) => !val && setFloatingMenu(null)}
                    onSelect={handleFloatingSelect}
                    style={{
                        top: 0,
                        left: 0,
                        transform: 'none',
                        marginTop: '10px'
                    }}
                />
              </div>
          </div>
      )}
    </div>
  );
};

// Wrap in Provider to use useReactFlow
const DifyCanvas = () => (
    <ReactFlowProvider>
        <DifyCanvasContent />
    </ReactFlowProvider>
);

export default DifyCanvas;