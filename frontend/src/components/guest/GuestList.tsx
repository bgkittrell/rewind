import React from 'react'
import { GuestCard } from './GuestCard'
import { IconUsers, IconUserPlus } from '@tabler/icons-react'

interface Guest {
  id: string
  name: string
  title?: string
  company?: string
  bio?: string
  website?: string
  social?: {
    twitter?: string
    linkedin?: string
  }
}

interface GuestListProps {
  guests: Guest[]
  variant?: 'full' | 'compact'
  showBio?: boolean
  emptyMessage?: string
  loading?: boolean
}

export const GuestList: React.FC<GuestListProps> = ({
  guests,
  variant = 'full',
  showBio = true,
  emptyMessage = 'No guests found for this episode.',
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-600">
          <IconUsers className="w-5 h-5" />
          <span className="font-medium">Loading guests...</span>
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (guests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <IconUserPlus className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-700">
        <IconUsers className="w-5 h-5" />
        <span className="font-medium">{guests.length === 1 ? '1 Guest' : `${guests.length} Guests`}</span>
      </div>

      <div className={`space-y-${variant === 'compact' ? '2' : '3'}`}>
        {guests.map(guest => (
          <GuestCard key={guest.id} guest={guest} variant={variant} showBio={showBio} />
        ))}
      </div>
    </div>
  )
}
