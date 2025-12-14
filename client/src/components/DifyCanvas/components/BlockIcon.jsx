import React from 'react';
import * as RemixIcons from '@remixicon/react';
import cn from '../../../utils/classnames';

const BlockIcon = ({ type, className, size = 'sm' }) => {
  // Mapping types to icons (simplified for prototype)
  const iconMap = {
    'llm': 'RiBrainLine',
    'knowledge-retrieval': 'RiBookOpenLine',
    'end': 'RiStopCircleLine',
    'answer': 'RiMessage2Line',
    'start': 'RiPlayCircleLine',
    'if-else': 'RiSplitCellsHorizontal',
    'code': 'RiCodeBoxLine',
    'http-request': 'RiGlobalLine',
    'template-transform': 'RiFileTextLine',
    'question-classifier': 'RiGitBranchLine',
    'iteration': 'RiLoopLeftLine',
  };

  const iconName = iconMap[type] || 'RiFileTextLine';
  const IconComponent = RemixIcons[iconName] || RemixIcons.RiFileTextLine;

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Color mapping (Dify uses specific colors per block type)
  const colorClasses = {
    'llm': 'text-indigo-600 bg-indigo-50',
    'start': 'text-blue-600 bg-blue-50',
    'end': 'text-rose-600 bg-rose-50',
    'code': 'text-orange-600 bg-orange-50',
    'http-request': 'text-purple-600 bg-purple-50',
  };

  const colors = colorClasses[type] || 'text-gray-600 bg-gray-50';

  return (
    <div className={cn(
        "flex items-center justify-center rounded-md shrink-0", 
        colors, 
        sizeClasses[size],
        className
    )}>
      <IconComponent className="w-[70%] h-[70%]" />
    </div>
  );
};

export default BlockIcon;
