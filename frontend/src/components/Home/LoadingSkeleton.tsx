import React from 'react'

export const LoadingSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg divide-y divide-gray-100">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="p-4 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
)
