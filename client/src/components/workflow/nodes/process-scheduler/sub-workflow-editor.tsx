import React, { FC, useCallback, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { RiCloseLine, RiAddLine } from '@remixicon/react'
import cn from '@/utils/classnames'

const SimpleNode: FC<{ data: any }> = ({ data }) => {
  return (
    <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm min-w-[120px]">
      <div className="text-xs font-medium text-gray-700">{data.label}</div>
    </div>
  )
}

const nodeTypes = { simple: SimpleNode }

const AVAILABLE_NODES = [
  { type: 'csv_loader', title: 'CSV 读取' },
  { type: 'db_reader', title: '数据库读取' },
  { type: 'transform', title: '数据转换' },
  { type: 'mq_producer', title: 'MQ 生产者' },
  { type: 'mq_consumer', title: 'MQ 消费者' },
  { type: 'db_writer', title: '数据库写入' },
]

interface SubWorkflowEditorProps {
  groupId: string
  groupName: string
  workflow: any[]
  onSave: (workflow: any[]) => void
  onClose: () => void
}

const SubWorkflowEditorInner: FC<SubWorkflowEditorProps> = ({
  groupName,
  workflow,
  onSave,
  onClose,
}) => {
  const initialNodes: Node[] = useMemo(() => {
    return workflow.map((node, index) => ({
      id: node.id || `node_${index}`,
      type: 'simple',
      position: node.position || { x: 100 + index * 200, y: 100 },
      data: { label: node.title || node.node_type, nodeType: node.node_type, params: node.params || {} },
    }))
  }, [workflow])

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []
    for (let i = 0; i < workflow.length - 1; i++) {
      edges.push({
        id: `e${i}`,
        source: workflow[i].id || `node_${i}`,
        target: workflow[i + 1].id || `node_${i + 1}`,
      })
    }
    return edges
  }, [workflow])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds))
  }, [setEdges])

  const handleAddNode = useCallback((nodeType: string, title: string) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'simple',
      position: { x: 100 + nodes.length * 200, y: 100 },
      data: { label: title, nodeType, params: {} },
    }
    setNodes((nds) => [...nds, newNode])
  }, [nodes.length, setNodes])

  const handleSave = useCallback(() => {
    const workflowConfig = nodes.map(node => ({
      id: node.id,
      node_type: node.data.nodeType,
      title: node.data.label,
      params: node.data.params,
      position: node.position,
    }))
    onSave(workflowConfig)
    onClose()
  }, [nodes, onSave, onClose])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="w-[90vw] h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">编辑进程组: {groupName}</h2>
            <p className="text-sm text-gray-500">拖拽节点构建工作流</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">保存</button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <RiCloseLine className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 border-r border-gray-200 p-4 overflow-y-auto bg-gray-50">
            <div className="text-xs font-medium text-gray-500 mb-3">可用节点</div>
            <div className="space-y-2">
              {AVAILABLE_NODES.map((node) => (
                <button
                  key={node.type}
                  onClick={() => handleAddNode(node.type, node.title)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50"
                >
                  <RiAddLine className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{node.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              className="bg-gray-100"
            >
              <Background gap={16} size={1} color="#e5e7eb" />
              <Controls />
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  )
}

const SubWorkflowEditor: FC<SubWorkflowEditorProps> = (props) => {
  return createPortal(
    <ReactFlowProvider>
      <SubWorkflowEditorInner {...props} />
    </ReactFlowProvider>,
    document.body
  )
}

export default SubWorkflowEditor
