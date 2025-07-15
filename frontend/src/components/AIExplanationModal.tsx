import React from 'react'
import { Modal } from './ui/Modal'
import type { RecommendationScore } from '../services/recommendationService'

interface AIExplanationModalProps {
  isOpen: boolean
  onClose: () => void
  recommendation: RecommendationScore | null
}

export const AIExplanationModal: React.FC<AIExplanationModalProps> = ({ isOpen, onClose, recommendation }) => {
  if (!recommendation) return null

  const scorePercentage = (recommendation.score * 100).toFixed(0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Why this recommendation?"
      size="medium"
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      <div className="space-y-6">
        {/* Episode Info */}
        <div className="border-b pb-4">
          <h3 className="font-semibold text-gray-900 mb-1">{recommendation.episode.title}</h3>
          <p className="text-sm text-gray-600">{recommendation.episode.podcastName}</p>
        </div>

        {/* Match Score */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">{scorePercentage}%</div>
            <span className="text-sm text-gray-600">
              This episode is a {scorePercentage}% match based on your listening history
            </span>
          </div>
        </div>

        {/* Reasons */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Why we recommend this:</h4>
          <ul className="space-y-2">
            {recommendation.reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1.5 text-xs">•</span>
                <span className="text-sm text-gray-700">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Detailed Factors */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Recommendation factors:</h4>
          <div className="space-y-2">
            {recommendation.factors.recentShowListening > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Recent show listening</span>
                <span className="font-medium text-gray-900">
                  +{(recommendation.factors.recentShowListening * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {recommendation.factors.newEpisodeBonus > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">New episode bonus</span>
                <span className="font-medium text-gray-900">
                  +{(recommendation.factors.newEpisodeBonus * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {recommendation.factors.rediscoveryBonus > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Rediscovery bonus</span>
                <span className="font-medium text-gray-900">
                  +{(recommendation.factors.rediscoveryBonus * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {recommendation.factors.guestMatchBonus > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Guest match bonus</span>
                <span className="font-medium text-gray-900">
                  +{(recommendation.factors.guestMatchBonus * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {recommendation.factors.favoriteBonus > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Favorite bonus</span>
                <span className="font-medium text-gray-900">
                  +{(recommendation.factors.favoriteBonus * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
