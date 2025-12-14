import React from 'react';
import { useReactFlow } from 'reactflow';
import { RiAddLine, RiSubtractLine, RiFullscreenLine, RiLayoutGridLine } from '@remixicon/react';

const CanvasControl = ({ onLayout }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  console.log('CanvasControl Rendered');

  return (
    <div className="absolute bottom-6 left-6 z-50 flex items-center bg-white rounded-lg shadow-lg border border-gray-200 p-1 gap-1">
      <ControlButton onClick={() => zoomIn({ duration: 300 })} icon={RiAddLine} tooltip="Zoom In" />
      <ControlButton onClick={() => zoomOut({ duration: 300 })} icon={RiSubtractLine} tooltip="Zoom Out" />
      <ControlButton onClick={() => fitView({ duration: 300, padding: 0.2 })} icon={RiFullscreenLine} tooltip="Fit View" />
      <div className="w-[1px] h-4 bg-gray-200 mx-1" />
      <ControlButton onClick={onLayout} icon={RiLayoutGridLine} tooltip="Auto Layout" />
    </div>
  );
};

const ControlButton = ({ onClick, icon: Icon, tooltip }) => (
  <button 
    onClick={onClick}
    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors"
    title={tooltip}
  >
    <Icon size={16} />
  </button>
);

export default CanvasControl;
