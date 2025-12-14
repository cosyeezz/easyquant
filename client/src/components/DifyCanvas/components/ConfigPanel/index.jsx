import React, { useState, useEffect } from 'react';
import { RiCloseLine, RiBrainLine, RiCodeBoxLine, RiGlobalLine, RiStopCircleLine, RiPlayCircleLine } from '@remixicon/react';
import cn from '../../../../utils/classnames';
import { BlockEnum } from '../../constants/blocks';

const BlockIcon = ({ type, className }) => {
    switch (type) {
        case BlockEnum.LLM: return <RiBrainLine className={className} />;
        case BlockEnum.Code: return <RiCodeBoxLine className={className} />;
        case BlockEnum.HttpRequest: return <RiGlobalLine className={className} />;
        case BlockEnum.End: return <RiStopCircleLine className={className} />;
        case BlockEnum.Start: return <RiPlayCircleLine className={className} />;
        default: return <RiBrainLine className={className} />;
    }
};

const ConfigPanel = ({ node, onClose, onUpdate }) => {
    const [title, setTitle] = useState(node?.data?.title || '');
    const [desc, setDesc] = useState(node?.data?.desc || '');
    // Mock configs, in reality this should be a large object matching the schema
    const [config, setConfig] = useState(node?.data?.config || {});

    useEffect(() => {
        if (node) {
            setTitle(node.data.title || '');
            setDesc(node.data.desc || '');
            setConfig(node.data.config || {});
        }
    }, [node]);

    if (!node) return null;

    const handleSave = () => {
        onUpdate(node.id, {
            ...node.data,
            title,
            desc,
            config
        });
        // onClose(); // Optional: close on save or keep open? Dify keeps it open.
    };

    return (
        <div className="absolute top-4 right-4 bottom-4 w-[420px] bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col z-50 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-primary-50 text-primary-600")}>
                        <BlockIcon type={node.data.type} className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900 text-sm leading-tight">
                            {node.data.type.toUpperCase().replace('-', ' ')}
                        </div>
                        <div className="text-xs text-gray-500">
                            ID: {node.id.slice(0, 8)}
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                    <RiCloseLine className="w-5 h-5" />
                </button>
            </div>

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* General Info */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">NODE NAME</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleSave}
                            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            placeholder="Enter node name"
                        />
                    </div>
                    {/* Description is rarely editable in Dify nodes directly, but let's keep it for now */}
                </div>

                {/* Specific Configs based on Type */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Configuration</span>
                    </div>

                    {node.data.type === BlockEnum.LLM && (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">SYSTEM PROMPT</label>
                                <textarea 
                                    value={config.prompt || ''}
                                    onChange={(e) => {
                                        const newConfig = { ...config, prompt: e.target.value };
                                        setConfig(newConfig);
                                        // Auto-save logic could go here, but let's wait for blur or manual save
                                    }}
                                    onBlur={handleSave}
                                    className="w-full h-32 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-mono resize-none"
                                    placeholder="You are a helpful assistant..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">MODEL</label>
                                <select 
                                    value={config.model || 'gpt-3.5-turbo'}
                                    onChange={(e) => {
                                        const newConfig = { ...config, model: e.target.value };
                                        setConfig(newConfig);
                                        // We need to trigger save here because select changes don't fire blur consistently in the same way
                                        onUpdate(node.id, { ...node.data, title, desc, config: newConfig });
                                    }}
                                    className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                >
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                    <option value="gpt-4">GPT-4</option>
                                    <option value="claude-3-opus">Claude 3 Opus</option>
                                </select>
                            </div>
                        </>
                    )}

                    {node.data.type === BlockEnum.Code && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">CODE</label>
                            <textarea 
                                value={config.code || ''}
                                onChange={(e) => setConfig({ ...config, code: e.target.value })}
                                onBlur={handleSave}
                                className="w-full h-48 px-3 py-2 text-sm bg-slate-800 text-slate-50 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-mono"
                                placeholder="def main(arg1, arg2):..."
                            />
                        </div>
                    )}
                    
                    {/* Fallback for others */}
                    {![BlockEnum.LLM, BlockEnum.Code].includes(node.data.type) && (
                        <div className="text-sm text-gray-500 italic">
                            No specific configuration available for this node type yet.
                        </div>
                    )}
                </div>

            </div>
            
            {/* Footer */}
            {/* <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end">
                <button className="btn-primary text-sm px-4 py-2">Save</button>
            </div> */} 
            {/* Dify usually auto-saves or has a global run, individual node save is implicit. */}
        </div>
    );
};

export default ConfigPanel;
