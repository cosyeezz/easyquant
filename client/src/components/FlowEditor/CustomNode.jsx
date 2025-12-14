import React, { memo, useMemo, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
    FileText, 
    Zap, 
    Database, 
    MoreHorizontal, 
    Play, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle,
    Loader2
} from 'lucide-react';

// --- Utils ---
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Icons Map (Mimic BlockIcon) ---
const Icons = {
    source: FileText,
    processor: Zap,
    sink: Database,
    default: Zap
};

const NodeColors = {
    source: 'bg-blue-50 text-blue-600',
    processor: 'bg-purple-50 text-purple-600',
    sink: 'bg-rose-50 text-rose-600',
    default: 'bg-slate-50 text-slate-600'
};

// --- Sub-Components ---

const NodeTargetHandle = ({ id, handleId }) => (
    <Handle
        type="target"
        position={Position.Left}
        id={handleId}
        className="!w-4 !h-4 !bg-indigo-500 !border-2 !border-white !rounded-full !-left-[9px] !top-4 !translate-y-0 transition-transform hover:scale-125 z-50"
    />
);

const NodeSourceHandle = ({ id, handleId }) => (
    <Handle
        type="source"
        position={Position.Right}
        id={handleId}
        className="!w-4 !h-4 !bg-indigo-500 !border-2 !border-white !rounded-full !-right-[9px] !top-4 !translate-y-0 transition-transform hover:scale-125 z-50"
    />
);

const BlockIcon = ({ type, className }) => {
    const Icon = Icons[type] || Icons.default;
    const colorClass = NodeColors[type] || NodeColors.default;
    
    return (
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", colorClass, className)}>
            <Icon className="w-5 h-5" />
        </div>
    );
};

const StatusIcon = ({ status }) => {
    if (!status) return null;
    if (status === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin text-text-accent" />;
    if (status === 'success') return <CheckCircle2 className="h-3.5 w-3.5 text-text-success" />;
    if (status === 'failed') return <XCircle className="h-3.5 w-3.5 text-text-destructive" />;
    return null;
};

// --- Main Component (Ported from Dify BaseNode) ---

const BaseNode = ({ id, data, selected }) => {
    const nodeRef = useRef(null);
    
    // Status Logic
    const runningStatus = data._runningStatus; // 'running' | 'success' | 'failed'
    
    const showSelectedBorder = selected;
    const showRunningBorder = runningStatus === 'running' && !showSelectedBorder;
    const showSuccessBorder = runningStatus === 'success' && !showSelectedBorder;
    const showFailedBorder = runningStatus === 'failed' && !showSelectedBorder;

    return (
        <div
            className={cn(
                'relative flex rounded-2xl border bg-workflow-block-bg',
                showSelectedBorder ? 'border-components-option-card-option-selected-border ring-1 ring-components-option-card-option-selected-border' : 'border-transparent',
                'w-[240px]', // Fixed width per Dify
            )}
            ref={nodeRef}
        >
            <div
                className={cn(
                    'group relative pb-1 shadow-xs w-full',
                    'rounded-[15px] border border-transparent bg-workflow-block-bg',
                    !runningStatus && 'hover:shadow-lg transition-shadow duration-200',
                    showRunningBorder && '!border-state-accent-solid',
                    showSuccessBorder && '!border-state-success-solid',
                    showFailedBorder && '!border-state-destructive-solid',
                )}
            >
                {/* Handles */}
                <NodeTargetHandle id={id} handleId="in" />
                <NodeSourceHandle id={id} handleId="out" />

                {/* Header */}
                <div className={cn('flex items-center rounded-t-2xl px-3 pb-2 pt-3')}>
                    <BlockIcon type={data.type} className="mr-2" />
                    
                    <div className="system-sm-semibold-uppercase mr-1 flex grow items-center truncate text-text-primary">
                        <div title={data.label} className="truncate text-[13px] font-semibold text-slate-900 uppercase tracking-tight">
                            {data.label}
                        </div>
                    </div>
                    
                    {/* Status Icon */}
                    <div className="flex items-center">
                        <StatusIcon status={runningStatus} />
                    </div>

                    {/* Controls (3 dots) - Hidden usually, shown on hover/selected if needed */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        <button className="p-1 hover:bg-slate-100 rounded">
                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="px-3 pb-2 pt-1 min-h-[40px]">
                    <div className="text-[10px] text-text-tertiary leading-tight line-clamp-3">
                        {data.desc || "暂无描述"}
                    </div>
                    
                    {/* Variable/Schema Preview (Placeholder for now) */}
                    {data.schema && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {data.schema.slice(0, 3).map((col, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-mono border border-slate-200">
                                    {col.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                
            </div>
        </div>
    );
};

export const nodeTypes = {
  source: memo((props) => <BaseNode {...props} data={{...props.data, type: 'source'}} />),
  processor: memo((props) => <BaseNode {...props} data={{...props.data, type: 'processor'}} />),
  sink: memo((props) => <BaseNode {...props} data={{...props.data, type: 'sink'}} />),
};

export default BaseNode;