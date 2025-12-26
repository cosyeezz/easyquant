import { useEffect, useCallback, useRef } from 'react'
import { Edge, Node } from '../types'
import { debounce } from 'lodash-es'

/**
 * Hook to propagate schema between connected nodes.
 * It listens to nodes and edges changes and updates target nodes' inputs_schema.
 * It also triggers backend inference to update nodes' outputs_schema based on new inputs.
 */
export const useSchemaPropagation = (nodes: Node[], edges: Edge[], setNodes: (nodes: Node[]) => void) => {
  const isPropagating = useRef(false)
  const lastUpdateRef = useRef<string>('')

  const propagate = useCallback(debounce(async (currentNodes: Node[], currentEdges: Edge[]) => {
    if (isPropagating.current) return
    
    // Create a fingerprint of the current state to avoid redundant work
    const stateFingerprint = JSON.stringify({
        nodes: currentNodes.map(n => ({ id: n.id, data: n.data })),
        edges: currentEdges.map(e => ({ source: e.source, target: e.target }))
    })
    if (stateFingerprint === lastUpdateRef.current) return

    isPropagating.current = true
    
    try {
      let hasGlobalChanged = false
      const workingNodes = [...currentNodes]
      
      // Perform topological propagation
      // We use multiple passes to allow schema to flow through multiple levels
      for (let pass = 0; pass < 5; pass++) {
        let passChanged = false
        
        for (let i = 0; i < workingNodes.length; i++) {
          const node = workingNodes[i]
          
          // 1. Calculate combined inputs_schema from upstreams
          const upstreamEdges = currentEdges.filter(e => e.target === node.id)
          let combinedInputSchema = { columns: [] as any[] }
          
          if (upstreamEdges.length > 0) {
            // Find first upstream with output schema (Simple logic for MVP)
            for (const edge of upstreamEdges) {
              const sourceNode = workingNodes.find(n => n.id === edge.source)
              if (sourceNode?.data?.outputs_schema?.columns?.length > 0) {
                combinedInputSchema = sourceNode.data.outputs_schema
                break
              }
            }
          }

          // 2. Check if inputs_schema changed
          const inputsChanged = JSON.stringify(node.data.inputs_schema) !== JSON.stringify(combinedInputSchema)
          
          if (inputsChanged) {
            console.log(`Node ${node.id} (${node.data.type}) inputs changed. Triggering inference...`)
            
            // Perform Inference via backend
            let newOutputsSchema = node.data.outputs_schema
            try {
                const response = await fetch('/api/v1/workflow/nodes/infer-schema', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        node_name: node.data.type,
                        config: node.data, // node.data contains the parameters
                        input_schema: combinedInputSchema
                    })
                })
                if (response.ok) {
                    newOutputsSchema = await response.json()
                }
            } catch (err) {
                console.error(`Inference failed for node ${node.id}:`, err)
            }

            workingNodes[i] = {
              ...node,
              data: { 
                ...node.data, 
                inputs_schema: combinedInputSchema,
                outputs_schema: newOutputsSchema
              }
            }
            passChanged = true
            hasGlobalChanged = true
          }
        }
        
        if (!passChanged) break // Stability reached
      }

      if (hasGlobalChanged) {
        // Update both local React Flow state and persistent ref
        const finalFingerprint = JSON.stringify({
            nodes: workingNodes.map(n => ({ id: n.id, data: n.data })),
            edges: currentEdges.map(e => ({ source: e.source, target: e.target }))
        })
        lastUpdateRef.current = finalFingerprint
        setNodes(workingNodes)
      }
    } catch (error) {
        console.error('Schema propagation error:', error)
    } finally {
      isPropagating.current = false
    }
  }, 800), [setNodes])

  useEffect(() => {
    if (nodes.length > 0) {
      propagate(nodes, edges)
    }
  }, [nodes, edges, propagate])
}