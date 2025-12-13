import React, { useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 40;
const X_SPACING = 200;
const Y_SPACING = 80;

// Helper to generate a deterministic ID
const getId = (prefix, index) => `${prefix}-${index}`;

// Recursive function to layout nodes
const layoutPipeline = (pipeline, startX = 0, startY = 0, parentId = null) => {
  let nodes = [];
  let edges = [];
  let currentY = startY;
  let lastNodeId = parentId; // Connect first node to this parent if exists

  pipeline.forEach((step, index) => {
    const nodeId = getId(parentId ? parentId : 'root', index);
    const isGroup = step.name === 'GroupHandler';
    const isParallel = isGroup && step.params.mode === 'parallel';
    
    // Create the node for this step
    const node = {
      id: nodeId,
      position: { x: startX, y: currentY },
      data: { 
        label: getLabel(step),
        details: step
      },
      style: { 
        width: NODE_WIDTH, 
        border: '1px solid #94a3b8', 
        borderRadius: '8px',
        padding: '8px',
        fontSize: '12px',
        background: 'white',
        textAlign: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      },
      type: isGroup ? 'default' : 'default', // Can use custom types later
    };

    if (isGroup) {
        node.style.background = isParallel ? '#f3e8ff' : '#e0e7ff'; // Purple/Blue tint
        node.style.border = isParallel ? '1px solid #d8b4fe' : '1px solid #c7d2fe';
    }

    nodes.push(node);

    // Connect to previous step
    if (lastNodeId) {
      edges.push({
        id: `e-${lastNodeId}-${nodeId}`,
        source: lastNodeId,
        target: nodeId,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
        style: { stroke: '#94a3b8' }
      });
    }

    // Prepare for next step in the main chain
    lastNodeId = nodeId;
    currentY += Y_SPACING;

    // Handle Children (Recursion)
    if (isGroup && step.params.handlers && step.params.handlers.length > 0) {
       // For visualization simplicity, we will branch out CHILDREN from this Group Node
       // And then (if sequential) continue the main chain from the last child? 
       // OR: Treat the Group Node as a container and the children are "inside" or "beside"?
       
       // Strategy: Branch out.
       // If Parallel: Fan out horizontally below the group node.
       // If Sequential: Continue vertically (like a sub-chain).
       
       const children = step.params.handlers;
       
       if (isParallel) {
           // Calculate total width needed
           const totalWidth = children.length * X_SPACING;
           const startChildX = startX - (totalWidth / 2) + (X_SPACING / 2);
           
           let maxChildY = currentY;

           children.forEach((child, childIdx) => {
                const childResult = layoutPipeline(
                    [child], // Process one by one to control position
                    startChildX + (childIdx * X_SPACING), 
                    currentY, 
                    nodeId // Parent is the Group Node
                );
                nodes = [...nodes, ...childResult.nodes];
                edges = [...edges, ...childResult.edges];
                // Track the deepest Y to avoid overlap if we were to continue (but usually Group is a leaf in main chain context effectively? No)
                // Actually GroupHandler usually contains the logic. 
                // In this simplified view, we just show the expansion.
           });
           
           // We don't easily merge back in this tree view, which is fine for now.
           // But if there were nodes AFTER the GroupHandler in the main pipeline, 
           // they should connect from WHERE? 
           // Ideally from the GroupNode itself (showing flow passes through).
           // So `lastNodeId` remains `nodeId` (the Group Node). 
           // Visual flow: Main -> Group -> (Fan out). Next Main node connects to Group.
           // This represents "Group wraps these".
       } else {
           // Sequential Group: Just indent or continue?
           // Let's shift X slightly to show nesting
           const childResult = layoutPipeline(
               children,
               startX + 40, // Indent
               currentY,
               nodeId
           );
           nodes = [...nodes, ...childResult.nodes];
           edges = [...edges, ...childResult.edges];
           
           // We need to push the main chain Y down by the height of the sub-chain
           // Calculate height based on number of nodes
           const subChainHeight = children.length * Y_SPACING;
           currentY += subChainHeight; 
       }
    }
  });

  return { nodes, edges };
};

function getLabel(step) {
    const map = {
        'ColumnMappingHandler': 'Column Mapping',
        'DropNaHandler': 'Drop Missing (NaN)',
        'TypeConversionHandler': 'Type Conversion',
        'DatabaseSaveHandler': 'Save to DB',
        'GroupHandler': step.params?.mode === 'parallel' ? 'Parallel Group' : 'Sequential Group'
    };
    return map[step.name] || step.name;
}


export default function PipelineVisualizer({ pipeline }) {
  const { nodes, edges } = useMemo(() => {
     if (!pipeline || pipeline.length === 0) return { nodes: [], edges: [] };
     return layoutPipeline(pipeline, 250, 50);
  }, [pipeline]);

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState([]);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  return (
    <div className="w-full h-full bg-slate-50">
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls showInteractive={false} />
        <Background color="#cbd5e1" gap={16} />
      </ReactFlow>
    </div>
  );
}
