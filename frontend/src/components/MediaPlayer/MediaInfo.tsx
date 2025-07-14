import React from 'react'
import { IconMusic } from '@tabler/icons-react'
import type { Episode } from '../../types/episode'

interface MediaInfoProps {
  episode: Episode | null
  size?: 'mini' | 'full'
}

export const MediaInfo: React.FC<MediaInfoProps> = ({ episode, size = 'full' }) => {
  if (!episode) return null

  const imageUrl = episode.imageUrl || (episode as any).podcastImageUrl

  if (size === 'mini') {
    return (
      <>
        <div className="w-12 h-12 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden mr-3">
          {imageUrl ? (
            <img src={imageUrl} alt={`${episode.podcastName} artwork`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              <IconMusic />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-sm font-medium text-white truncate">{episode.title}</p>
          <p className="text-xs text-white text-opacity-80 truncate">{episode.podcastName}</p>
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="w-48 h-48 bg-gray-300 rounded-lg flex-shrink-0 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={`${episode.podcastName} artwork`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <IconMusic />
          </div>
        )}
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white mb-1">{episode.title}</h2>
        <p className="text-sm text-white text-opacity-80">{episode.podcastName}</p>
      </div>
    </div>
  )
}
