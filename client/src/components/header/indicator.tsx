import React from 'react'

const Indicator = ({ color = 'blue' }: { color?: string }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    gray: 'bg-gray-500',
  }
  return <div className={`h-2 w-2 rounded-full ${colorMap[color] || colorMap.blue}`} />
}

export default Indicator
