import React from 'react';
import { RiPlayCircleLine, RiSave3Line } from '@remixicon/react';

const Header = ({ name, onNameChange, onSave, onRun, isSaving }) => {
  return (
    <div className="absolute top-4 left-4 right-4 h-14 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm flex items-center justify-between px-4 z-10">
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
            <input 
                type="text" 
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="font-bold text-gray-800 bg-transparent focus:outline-none focus:bg-gray-100 rounded px-1"
                placeholder="Untitled Workflow"
            />
            <span className="text-xs text-gray-400 px-1">EasyQuant ETL Pipeline</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
            <RiSave3Line className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
        </button>
        <div className="h-6 w-[1px] bg-gray-200 mx-1" />
        <button 
            onClick={onRun}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-all active:scale-95"
        >
            <RiPlayCircleLine className="w-4 h-4" />
            Run
        </button>
      </div>
    </div>
  );
};

export default Header;
