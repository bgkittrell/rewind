import React from 'react'
import { EpisodeCard } from '../EpisodeCard'
import type { RecommendationScore } from '../../services/recommendationService'
import { IconHeart, IconHeartFilled, IconCircleX } from '@tabler/icons-react'

interface RecommendationCardProps {
  recommendation: RecommendationScore
  onPlay: (episode: RecommendationScore['episode']) => void
  onAIExplanation: (episode: RecommendationScore['episode']) => void
  onFeedback: (episodeId: string, feedback: 'up' | 'down') => void
  userFeedback?: 'up' | 'down'
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onPlay,
  onAIExplanation,
  onFeedback,
  userFeedback,
}) => (
  <div className="relative">
    <EpisodeCard
      episode={{
        episodeId: recommendation.episode.episodeId,
        podcastId: recommendation.episode.podcastId,
        title: recommendation.episode.title,
        podcastName: recommendation.episode.podcastName,
        releaseDate: recommendation.episode.releaseDate,
        duration: recommendation.episode.duration,
        audioUrl: recommendation.episode.audioUrl,
        imageUrl: recommendation.episode.imageUrl,
        description: recommendation.episode.description,
        playbackPosition: recommendation.episode.playbackPosition,
      }}
      podcastImageUrl={recommendation.episode.imageUrl}
      onPlay={() => onPlay(recommendation.episode)}
      onAIExplanation={() => onAIExplanation(recommendation.episode)}
      recommendationScore={recommendation.score}
      referrer="home"
    />

    {/* Feedback buttons */}
    <div className="absolute top-2 right-2 flex gap-2">
      <button
        onClick={() => onFeedback(recommendation.episodeId, 'up')}
        className={`p-2 rounded-full transition-colors ${
          userFeedback === 'up' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`}
        title="I like this recommendation"
      >
        {/* Heart icon */}
        {userFeedback === 'up' ? <IconHeartFilled className="w-4 h-4" /> : <IconHeart className="w-4 h-4" />}
      </button>
      <button
        onClick={() => onFeedback(recommendation.episodeId, 'down')}
        className={`p-2 rounded-full transition-colors ${
          userFeedback === 'down' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`}
        title="I don't like this recommendation"
      >
        {/* No/blocked icon */}
        {userFeedback === 'down' ? <IconCircleX className="w-4 h-4" /> : <IconCircleX className="w-4 h-4" />}
      </button>
    </div>
  </div>
)
