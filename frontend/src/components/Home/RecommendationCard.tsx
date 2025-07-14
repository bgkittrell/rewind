import React from 'react'
import { EpisodeCard } from '../EpisodeCard'
import type { RecommendationScore } from '../../services/recommendationService'

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
    />

    {/* Feedback buttons */}
    <div className="absolute top-4 right-4 flex gap-2">
      <button
        onClick={() => onFeedback(recommendation.episodeId, 'up')}
        className={`p-2 rounded-full transition-colors ${
          userFeedback === 'up' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`}
        title="I like this recommendation"
      >
        👍
      </button>
      <button
        onClick={() => onFeedback(recommendation.episodeId, 'down')}
        className={`p-2 rounded-full transition-colors ${
          userFeedback === 'down' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`}
        title="I don't like this recommendation"
      >
        👎
      </button>
    </div>

    {/* Recommendation score badge */}
    <div className="absolute bottom-4 right-4 bg-primary text-white px-2 py-1 rounded-full text-xs font-medium">
      {(recommendation.score * 100).toFixed(0)}% match
    </div>
  </div>
)
