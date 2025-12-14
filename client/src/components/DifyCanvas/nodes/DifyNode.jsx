import React, { memo, useMemo, useState, useRef } from 'react';
import { Handle, Position, useStore } from 'reactflow';
import {
  RiLoader2Line,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiAlertFill,
  RiAddLine,
} from '@remixicon/react';
import cn from '../../../utils/classnames';
import BlockIcon from '../components/BlockIcon';
import NodeControl from '../components/NodeControl';
import BlockSelector from '../components/BlockSelector';

const NodeRunningStatus = {
  Running: 'running',
  Succeeded: 'succeeded',
  Failed: 'failed',
  Exception: 'exception',
};

const connectionSelector = (id) => (store) => 
    store.edges.some((e) => e.target === id);

const DifyNode = ({ id, data, selected }) => {
  const {
    title = 'Unknown Node',
    type = 'custom',
    desc = '',
    _runningStatus = null,
    _waitingRun = false,
    _dimmed = false,
    _pluginInstallLocked = false,
    onDelete,
    onAddNode, // New handler
  } = data;

  const showSelectedBorder = selected;
  const isConnected = useStore(useMemo(() => connectionSelector(id), [id]));
  
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const sourceTriggerRef = useRef(null);

  const {
    showRunningBorder,
    showSuccessBorder,
    showFailedBorder,
    showExceptionBorder,
  } = useMemo(() => {
    return {
      showRunningBorder: _runningStatus === NodeRunningStatus.Running && !showSelectedBorder,
      showSuccessBorder: _runningStatus === NodeRunningStatus.Succeeded && !showSelectedBorder,
      showFailedBorder: _runningStatus === NodeRunningStatus.Failed && !showSelectedBorder,
      showExceptionBorder: _runningStatus === NodeRunningStatus.Exception && !showSelectedBorder,
    };
  }, [_runningStatus, showSelectedBorder]);

  const handleAddBlock = (blockType) => {
    if (onAddNode) {
        onAddNode(id, blockType);
    }
    setShowSourceSelector(false);
  };

  return (
    <div
      className={cn(
        'relative flex rounded-2xl border bg-transparent group',
        showSelectedBorder ? 'border-primary-600' : 'border-transparent',
        _waitingRun && 'opacity-70',
        _pluginInstallLocked && 'cursor-not-allowed',
      )}
      style={{
        width: 240, 
      }}
    >
      {/* Node Control (Menu) */}
      <NodeControl id={id} data={{ ...data, selected }} onDelete={onDelete} />

      {/* Dimmed Overlay */}
      {(_dimmed || _pluginInstallLocked) && (
        <div
          className={cn(
            'absolute inset-0 rounded-2xl transition-opacity',
            _pluginInstallLocked
              ? 'pointer-events-auto z-30 bg-white/80 backdrop-blur-[2px]'
              : 'pointer-events-none z-20 bg-white/50',
          )}
        />
      )}

      {/* Main Card Content */}
      <div
        className={cn(
          'relative w-full pb-1 shadow-xs',
          'rounded-[15px] border border-transparent bg-white',
          !_runningStatus && 'hover:shadow-lg transition-shadow duration-200',
          showRunningBorder && '!border-primary-500',
          showSuccessBorder && '!border-green-500',
          showFailedBorder && '!border-red-500',
          showExceptionBorder && '!border-yellow-500',
        )}
      >
        {/* --- Input Handle (Left) --- */}
        <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 z-10 w-3 h-3 flex items-center justify-center">
             <Handle
                type="target"
                position={Position.Left}
                id="target"
                isConnectable={true}
                className={cn(
                    "!w-3 !h-3 !border-2 !border-white transition-colors duration-200",
                    "!left-0 !top-0 !transform-none !relative", // Reset ReactFlow absolute positioning
                    isConnected ? "!bg-[#12B76A]" : "!bg-[#D0D5DD]" // Green-600 vs Gray-300
                )}
            />
        </div>

        {/* --- Output Handle (Right) --- */}
        <div 
            ref={sourceTriggerRef}
            className="absolute right-[-14px] top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center group/handle"
        >
            {/* Visual Dot (Default) */}
            <div className={cn(
                "absolute w-3 h-3 bg-primary-600 rounded-full border-2 border-white transition-opacity pointer-events-none",
                "group-hover/handle:opacity-0"
            )} />

            {/* Plus Button (Hover Visual) */}
            <div 
                className={cn(
                    "absolute w-5 h-5 bg-primary-600 rounded-full text-white items-center justify-center shadow-md hidden pointer-events-none",
                    "group-hover/handle:flex"
                )}
            >
                <RiAddLine size={12} />
            </div>

            {/* The Actual Handle (Interactive Layer) */}
            <Handle
                type="source"
                position={Position.Right}
                id="source"
                isConnectable={true}
                className="!w-6 !h-6 !opacity-0 !border-0 cursor-crosshair z-30 !right-0 !top-0 !transform-none !relative"
                onClick={(e) => {
                    // Only toggle if it wasn't a drag interaction
                    // (ReactFlow might handle drag vs click, but simple click usually passes through)
                    setShowSourceSelector(!showSourceSelector);
                }}
            />

            {/* Block Selector */}
            <BlockSelector 
                open={showSourceSelector} 
                setOpen={setShowSourceSelector}
                triggerRef={sourceTriggerRef}
                onSelect={handleAddBlock}
            />
        </div>


        {/* Node Header */}
        <div className="flex items-center rounded-t-2xl px-3 pb-2 pt-3">
          <BlockIcon type={type} className="mr-2" />
          <div
            title={title}
            className="text-xs font-semibold uppercase mr-1 flex grow items-center truncate text-gray-900"
          >
            {title}
          </div>

          {/* Status Icons */}
          {_runningStatus === NodeRunningStatus.Running ? (
            <RiLoader2Line className="h-3.5 w-3.5 animate-spin text-primary-600" />
          ) : _runningStatus === NodeRunningStatus.Failed ? (
            <RiErrorWarningFill className="h-3.5 w-3.5 text-red-600" />
          ) : _runningStatus === NodeRunningStatus.Exception ? (
            <RiAlertFill className="h-3.5 w-3.5 text-yellow-500" />
          ) : _runningStatus === NodeRunningStatus.Succeeded ? (
            <RiCheckboxCircleFill className="h-3.5 w-3.5 text-green-600" />
          ) : null}
        </div>

        {/* Node Body */}
        <div className="px-3 pb-2 pt-1">
            {desc && (
                <div className="text-[10px] leading-3 text-gray-500 line-clamp-2">
                    {desc}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default memo(DifyNode);