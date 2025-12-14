import React, { memo, useState, useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import { RiAddLine, RiCloseLine } from '@remixicon/react';
import cn from '../../../utils/classnames';
import BlockSelector from '../components/BlockSelector';

const DifyEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data = {},
  selected,
}) => {
  // 1. Calculate Path
  // We stop the line slightly before the target so we can fit our custom arrow button
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX, 
    targetY,
    targetPosition,
    curvature: 0.7, // High curvature for longer straight segments
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isArrowHovered, setIsArrowHovered] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const triggerRef = useRef(null);

  const strokeColor = selected ? '#2970ff' : '#d0d5dd'; 
  const strokeWidth = 2;

  const handleSelectBlock = (blockType) => {
    if (data.onInsertNode) {
        data.onInsertNode({
            sourceNodeId: source,
            targetNodeId: target,
            edgeId: id,
            type: blockType
        });
    }
  };

  const handleDelete = (e) => {
      e.stopPropagation();
      if (data.onDelete) {
          data.onDelete();
      }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Interaction Zone */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      <EdgeLabelRenderer>
        {/* 1. Center "Add Node" Button */}
        <div
          className={cn(
            'nopan nodrag absolute pointer-events-auto flex items-center justify-center',
            'transition-opacity duration-200',
            (isHovered || selected || selectorOpen) ? 'opacity-100' : 'opacity-0',
            selectorOpen && 'z-50'
          )}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div 
            ref={triggerRef}
            className={cn(
                "w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center cursor-pointer shadow-sm hover:scale-125 transition-transform",
                selectorOpen && "scale-125 ring-2 ring-primary-100"
            )}
            onClick={(e) => {
                e.stopPropagation();
                setSelectorOpen(!selectorOpen);
            }}
          >
            <RiAddLine size={10} />
          </div>

          <BlockSelector 
            open={selectorOpen} 
            setOpen={setSelectorOpen}
            triggerRef={triggerRef}
            onSelect={handleSelectBlock}
          />
        </div>

        {/* 2. End "Arrow/Disconnect" Button */}
        <div
            className="nopan nodrag absolute pointer-events-auto flex items-center justify-center z-10"
            style={{
                // Align exactly with target handle
                transform: `translate(-100%, -50%) translate(${targetX + 6}px, ${targetY}px)`, 
                width: '16px',
                height: '16px',
            }}
            onMouseEnter={() => setIsArrowHovered(true)}
            onMouseLeave={() => setIsArrowHovered(false)}
            onClick={handleDelete}
        >
            {isArrowHovered && (
                // X Icon on Hover
                <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 cursor-pointer transition-colors shadow-sm">
                    <RiCloseLine size={12} />
                </div>
            )}
        </div>

      </EdgeLabelRenderer>
    </>
  );
};

export default memo(DifyEdge);