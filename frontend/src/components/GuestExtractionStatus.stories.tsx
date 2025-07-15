import type { Meta, StoryObj } from '@storybook/react'
import { GuestExtractionStatus } from './GuestExtractionStatus'
import type { Episode } from '../types/episode'

const meta: Meta<typeof GuestExtractionStatus> = {
  title: 'Components/GuestExtractionStatus',
  component: GuestExtractionStatus,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const baseEpisode: Episode = {
  episodeId: 'episode-1',
  podcastId: 'podcast-1',
  title: 'Sample Episode',
  description: 'A sample episode description',
  audioUrl: 'https://example.com/audio.mp3',
  duration: '45:30',
  releaseDate: '2024-01-15',
  podcastName: 'Sample Podcast',
}

export const Pending: Story = {
  args: {
    episode: {
      ...baseEpisode,
      guestExtractionStatus: 'pending',
    },
  },
}

export const Processing: Story = {
  args: {
    episode: {
      ...baseEpisode,
      guestExtractionStatus: 'processing',
    },
  },
}

export const CompletedWithGuests: Story = {
  args: {
    episode: {
      ...baseEpisode,
      guestExtractionStatus: 'completed',
      extractedGuests: ['John Doe', 'Jane Smith'],
      guestExtractionConfidence: 0.85,
    },
  },
}

export const CompletedWithSingleGuest: Story = {
  args: {
    episode: {
      ...baseEpisode,
      guestExtractionStatus: 'completed',
      extractedGuests: ['John Doe'],
      guestExtractionConfidence: 0.92,
    },
  },
}

export const CompletedNoGuests: Story = {
  args: {
    episode: {
      ...baseEpisode,
      guestExtractionStatus: 'completed',
      extractedGuests: [],
      guestExtractionConfidence: 0.75,
    },
  },
}

export const Failed: Story = {
  args: {
    episode: {
      ...baseEpisode,
      guestExtractionStatus: 'failed',
    },
  },
}

export const NoStatus: Story = {
  args: {
    episode: {
      ...baseEpisode,
      // No guestExtractionStatus - should render nothing
    },
  },
}

export const WithCustomClassName: Story = {
  args: {
    episode: {
      ...baseEpisode,
      guestExtractionStatus: 'completed',
      extractedGuests: ['John Doe', 'Jane Smith'],
      guestExtractionConfidence: 0.85,
    },
    className: 'bg-gray-100 p-2 rounded',
  },
}
