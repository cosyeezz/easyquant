import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNodes, useEdges } from 'reactflow';
import api from '../../services/api';

const FlowContext = createContext(null);

export const FlowProvider = ({ children, nodes, edges, setNodes, setEdges }) => {
  // nodeSchemas: { [nodeId]: { inputs: { portId: ['col1', 'col2'] }, outputs: { portId: ['col1'] } } }
  const [nodeSchemas, setNodeSchemas] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  
  // 辅助函数：获取某个节点的上游节点和连接信息
  const getUpstreamInfo = useCallback((nodeId) => {
    const incomingEdges = edges.filter(e => e.target === nodeId);
    const upstreamData = {}; // { targetHandleId: { sourceNodeId, sourceHandleId, schema } }

    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (!sourceNode) return;

      // 获取上游节点的输出 Schema
      const sourceSchema = nodeSchemas[sourceNode.id]?.outputs?.[edge.sourceHandle] || [];
      upstreamData[edge.targetHandle] = {
         sourceNode,
         sourceHandle: edge.sourceHandle,
         columns: sourceSchema
      };
    });
    return upstreamData;
  }, [nodes, edges, nodeSchemas]);

  // 核心：Schema 传播引擎 (简化版 - 每次变化全量计算，生产环境应用拓扑排序)
  // 这里为了简化，我们暂时只处理简单的“Source -> ... -> Sink” 链式传播
  // 实际上，只要某个节点更新了，我们只需更新它的下游。
  // 但 React Flow 的 Effect 可能会频繁触发，所以这里用简单的 Effect。
  
  // 我们采用一种“主动注册/更新”的模式。
  // 每个节点组件内部根据自己的 Config 和 Input Schema 计算 Output Schema，并调用 updateNodeSchema。
  
  const updateNodeSchema = useCallback((nodeId, outputSchemas) => {
      setNodeSchemas(prev => {
          // Deep compare to avoid infinite loop
          if (JSON.stringify(prev[nodeId]?.outputs) === JSON.stringify(outputSchemas)) {
              return prev;
          }
          return {
              ...prev,
              [nodeId]: { 
                  ...prev[nodeId],
                  outputs: outputSchemas 
              }
          };
      });
  }, []);

  return (
    <FlowContext.Provider value={{ 
        nodeSchemas, 
        updateNodeSchema, 
        getUpstreamInfo,
        selectedNodeId,
        setSelectedNodeId,
        // 透传 React Flow 的状态修改器以便在 Context 内部操作
        setNodes,
        setEdges
    }}>
      {children}
    </FlowContext.Provider>
  );
};

export const useFlowContext = () => {
  const context = useContext(FlowContext);
  if (!context) throw new Error('useFlowContext must be used within FlowProvider');
  return context;
};
