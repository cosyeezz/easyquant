import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RiPlayLargeLine, RiMoreFill, RiFileCopyLine, RiDeleteBinLine } from '@remixicon/react';
import cn from '../../../../utils/classnames';

const NodeControl = ({ id, data, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
        // Check if click is outside both trigger AND dropdown
        const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(event.target);
        const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);

        if (menuOpen && isOutsideTrigger && isOutsideDropdown) {
            setMenuOpen(false);
        }
    };
    
    // Add logic to close on scroll/resize to prevent floating menu detachment
    const handleScrollOrResize = () => {
        if (menuOpen) setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside, true); // Use capture phase
    window.addEventListener('scroll', handleScrollOrResize, true); // Capture phase for all scrollable elements
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [menuOpen]);

  const toggleMenu = (e) => {
      // e.stopPropagation(); // Optional: Decide if we want to select the node or not. Dify selects it.
      
      if (!menuOpen) {
          // Opening: Calculate position
          const rect = triggerRef.current.getBoundingClientRect();
          setMenuPosition({
              top: rect.bottom + 8, // 8px gap, relative to viewport (fixed)
              left: rect.right - 128, // Align right edge (128px is approx width), relative to viewport
          });
      }
      setMenuOpen(!menuOpen);
  };

  return (
    <div 
        className={cn(
            "absolute -top-7 right-0 h-7 pb-1 hidden group-hover:flex",
            (menuOpen || data.selected) && "!flex"
        )}
    >
        <div className="flex h-6 items-center rounded-lg border-[0.5px] border-gray-200 bg-white px-0.5 shadow-md text-gray-500 backdrop-blur-[5px]">
            {/* Run Button (Mock) */}
            <div 
                className="flex h-5 w-5 items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                title="Run this step"
                onClick={(e) => {
                    e.stopPropagation(); 
                    console.log('Run node:', id);
                }}
            >
                <RiPlayLargeLine className="h-3 w-3" />
            </div>

            <div className="w-[1px] h-3 bg-gray-200 mx-0.5" />

            {/* Menu Trigger */}
            <div 
                className={cn(
                    "relative flex h-5 w-5 items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer transition-colors",
                    menuOpen && "bg-gray-100 text-gray-800"
                )}
                onClick={toggleMenu}
                ref={triggerRef}
            >
                <RiMoreFill className="h-3 w-3" />
            </div>
        </div>

        {/* Portal Dropdown */}
        {menuOpen && createPortal(
            <div 
                ref={dropdownRef}
                className="fixed w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[9999] animate-in fade-in zoom-in-95 duration-100 cursor-default"
                style={{ top: menuPosition.top, left: menuPosition.left }}
                onClick={(e) => e.stopPropagation()} 
            >
                <div 
                    className="flex items-center px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('Duplicate:', id);
                        setMenuOpen(false);
                    }}
                >
                    <RiFileCopyLine className="w-3.5 h-3.5 mr-2 text-gray-400" />
                    Duplicate
                </div>
                <div className="h-[1px] bg-gray-100 my-1" />
                <div 
                    className="flex items-center px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onDelete) onDelete(id);
                        setMenuOpen(false);
                    }}
                >
                    <RiDeleteBinLine className="w-3.5 h-3.5 mr-2 text-red-500" />
                    Delete
                </div>
            </div>,
            document.body
        )}
    </div>
  );
};

export default NodeControl;
