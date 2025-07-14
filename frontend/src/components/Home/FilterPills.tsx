import React from 'react'
import type { RecommendationFilters } from '../../services/recommendationService'

export type FilterType = 'not_recent' | 'comedy' | 'favorites' | 'guests' | 'new'

export interface FilterOption {
  key: FilterType
  label: string
  param: keyof RecommendationFilters
}

interface FilterPillsProps {
  activeFilter: FilterType
  onFilterChange: (filter: FilterType) => void
}

export const filterOptions: FilterOption[] = [
  { key: 'not_recent', label: 'Not Recent', param: 'not_recent' },
  { key: 'comedy', label: 'Comedy', param: 'favorites' }, // Using favorites as proxy for comedy for now
  { key: 'favorites', label: 'Favorites', param: 'favorites' },
  { key: 'guests', label: 'Guest Matches', param: 'guests' },
  { key: 'new', label: 'New Episodes', param: 'new' },
]

export const FilterPills: React.FC<FilterPillsProps> = ({ activeFilter, onFilterChange }) => (
  <div className="bg-white px-4 py-4 border-b border-gray-200">
    <div className="flex gap-2 overflow-x-auto pb-2">
      {filterOptions.map(option => (
        <button
          key={option.key}
          onClick={() => onFilterChange(option.key)}
          className={`inline-block px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeFilter === option.key ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
)
