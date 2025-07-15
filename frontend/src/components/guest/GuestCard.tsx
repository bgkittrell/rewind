import React from 'react'
import { IconUser, IconExternalLink } from '@tabler/icons-react'

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

interface GuestCardProps {
  guest: Guest
  variant?: 'full' | 'compact'
  showBio?: boolean
}

export const GuestCard: React.FC<GuestCardProps> = ({ guest, variant = 'full', showBio = true }) => {
  const isCompact = variant === 'compact'

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${isCompact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <IconUser className="w-6 h-6 text-gray-600" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-semibold text-gray-900 ${isCompact ? 'text-sm' : 'text-base'}`}>{guest.name}</h3>
              {(guest.title || guest.company) && (
                <p className={`text-gray-600 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  {guest.title}
                  {guest.title && guest.company && ' at '}
                  {guest.company}
                </p>
              )}
            </div>

            {guest.website && (
              <a
                href={guest.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 transition-colors"
                aria-label={`Visit ${guest.name}'s website`}
              >
                <IconExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {showBio && guest.bio && !isCompact && <p className="mt-2 text-sm text-gray-700 line-clamp-3">{guest.bio}</p>}

          {guest.social && (
            <div className="mt-3 flex gap-2">
              {guest.social.twitter && (
                <a
                  href={`https://twitter.com/${guest.social.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  @{guest.social.twitter}
                </a>
              )}
              {guest.social.linkedin && (
                <a
                  href={guest.social.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
