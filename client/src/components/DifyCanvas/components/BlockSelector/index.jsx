import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RiSearchLine } from '@remixicon/react';
import { BLOCKS, BLOCK_CLASSIFICATIONS } from '../../constants/blocks';
import BlockIcon from '../BlockIcon';

const BlockSelector = ({ onSelect, triggerRef, open, setOpen, style }) => {
  const [searchText, setSearchText] = useState('');
  const selectorRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
        if (
            selectorRef.current && 
            !selectorRef.current.contains(event.target) &&
            (!triggerRef?.current || !triggerRef.current.contains(event.target))
        ) {
            setOpen(false);
        }
    };

    document.addEventListener('mousedown', handleClickOutside, true); // Capture phase to beat ReactFlow's stopPropagation
    return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [open, setOpen, triggerRef]);

  const groups = useMemo(() => {
    // Group blocks by classification
    const grouped = {};
    BLOCK_CLASSIFICATIONS.forEach(cls => {
        grouped[cls] = [];
    });

    BLOCKS.forEach(block => {
        if (block.title.toLowerCase().includes(searchText.toLowerCase())) {
            if (grouped[block.classification]) {
                grouped[block.classification].push(block);
            }
        }
    });
    return grouped;
  }, [searchText]);

  if (!open) return null;

  return (
    <div 
        ref={selectorRef}
        className="absolute z-50 w-[320px] bg-white rounded-xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        style={{
            top: 'calc(100% + 8px)', // Position below the trigger
            left: '50%',
            transform: 'translateX(-50%)',
            ...style 
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        onWheel={(e) => e.stopPropagation()} // Prevent canvas zooming
    >
      {/* Search Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative flex items-center bg-gray-50 rounded-lg px-2 h-8">
            <RiSearchLine className="w-4 h-4 text-gray-400 mr-2" />
            <input 
                type="text"
                className="bg-transparent border-none outline-none text-xs w-full text-gray-700 placeholder-gray-400"
                placeholder="Search blocks..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                autoFocus
            />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto max-h-[400px] p-2 custom-scrollbar">
        {BLOCK_CLASSIFICATIONS.map(cls => {
            const blocks = groups[cls];
            if (!blocks || blocks.length === 0) return null;
            
            // Classification Title
            const clsTitle = cls === '-' ? 'Common' : cls.replace('-', ' ').toUpperCase();

            return (
                <div key={cls} className="mb-2">
                    {cls !== '-' && (
                        <div className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            {clsTitle}
                        </div>
                    )}
                    
                    {blocks.map(block => (
                        <div 
                            key={block.type}
                            className="group flex items-center p-2 rounded-lg hover:bg-primary-50 cursor-pointer transition-colors"
                            onClick={() => {
                                onSelect(block.type);
                                setOpen(false);
                            }}
                        >
                            <BlockIcon type={block.type} size="md" className="mr-3 group-hover:bg-white shadow-sm" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-700 group-hover:text-primary-700">
                                    {block.title}
                                </div>
                                <div className="text-[10px] text-gray-500 truncate group-hover:text-primary-500">
                                    {block.description}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        })}
        
        {Object.values(groups).every(g => g.length === 0) && (
             <div className="p-4 text-center text-gray-400 text-xs">
                No blocks found.
             </div>
        )}
      </div>
    </div>
  );
};

export default BlockSelector;
