import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { Plus } from 'lucide-react';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data
}) {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.16, // Dify curvature
  });

  const strokeColor = selected 
    ? 'var(--color-workflow-link-line-active)' 
    : (isHovered ? '#98a2b2' : 'var(--color-workflow-link-line-normal)');

  return (
    <g 
        onMouseEnter={() => setIsHovered(true)} 
        onMouseLeave={() => setIsHovered(false)}
        className="react-flow__edge-custom-group"
    >
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
            ...style,
            strokeWidth: selected || isHovered ? 2 : 1.5,
            stroke: strokeColor,
            transition: 'stroke 0.2s, stroke-width 0.2s'
        }} 
      />
      
      {/* "Add Node" Button Placeholder - mimicking Dify's hover effect */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button 
            className={`
                w-5 h-5 bg-white border border-[var(--color-workflow-link-line-normal)] rounded-full flex items-center justify-center 
                shadow-sm text-slate-500 hover:text-[var(--color-text-accent)] hover:border-[var(--color-text-accent)] hover:bg-blue-50 transition-all
                ${isHovered || selected ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
            `}
            onClick={(event) => {
              event.stopPropagation();
              // Future: Open BlockSelector here
              console.log('Add node on edge clicked');
            }}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}