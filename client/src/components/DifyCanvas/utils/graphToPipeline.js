import { BlockEnum } from "../constants/blocks";

/**
 * Converts a node-based graph into a linear pipeline configuration.
 * Limitation: Currently only supports single linear paths.
 * 
 * @param {Array} nodes 
 * @param {Array} edges 
 * @returns {Array} pipeline_config
 */
export const graphToPipeline = (nodes, edges) => {
    const pipeline = [];
    
    // 1. Find Start Node
    let currentNode = nodes.find(n => n.data.type === BlockEnum.Start);
    if (!currentNode) {
        console.warn("No Start node found.");
        return [];
    }

    // 2. Traverse
    const visited = new Set();
    while (currentNode) {
        if (visited.has(currentNode.id)) break; // Loop detected
        visited.add(currentNode.id);

        // Convert current node to handler config
        // Skip Start node for the pipeline handlers list (it's usually Source Config)
        if (currentNode.data.type !== BlockEnum.Start) {
            const handlerConfig = mapNodeToHandler(currentNode);
            if (handlerConfig) {
                pipeline.push(handlerConfig);
            }
        }

        // Find next node
        const outgoingEdge = edges.find(e => e.source === currentNode.id);
        if (!outgoingEdge) break; // End of path

        currentNode = nodes.find(n => n.id === outgoingEdge.target);
    }

    return pipeline;
};

const mapNodeToHandler = (node) => {
    const { type, config } = node.data;
    
    switch (type) {
        case BlockEnum.LLM:
            return {
                name: "LLMHandler",
                params: {
                    model: config?.model || "gpt-3.5-turbo",
                    prompt: config?.prompt || ""
                }
            };
        case BlockEnum.Code:
            return {
                name: "CodeHandler",
                params: {
                    code: config?.code || ""
                }
            };
        case BlockEnum.HttpRequest:
            return {
                name: "HttpRequestHandler",
                params: {
                    url: config?.url || "",
                    method: config?.method || "GET"
                }
            };
        case BlockEnum.End:
            // End node might be a sink (Save to DB)
            return null; 
        default:
            // Generic fallback
            return {
                name: "GenericHandler",
                params: {
                    type: type,
                    ...config
                }
            };
    }
};
