import type { Meta, StoryObj } from '@storybook/react'
import { EpisodeCard } from './EpisodeCard'
import { Episode } from '../types/episode'

const meta: Meta<typeof EpisodeCard> = {
  title: 'Components/EpisodeCard',
  component: EpisodeCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const sampleEpisode: Episode = {
  id: '1',
  title: 'The Best Comedy Episode Ever Made',
  podcast: {
    id: 'podcast1',
    name: 'Comedy Central Podcast',
    thumbnail: 'https://via.placeholder.com/80x80/26A69A/FFFFFF?text=CC',
  },
  releaseDate: '2023-01-15T10:00:00Z',
  duration: 2700, // 45 minutes
  description: 'An amazing comedy episode with hilarious guests and great stories.',
  audioUrl: 'https://example.com/episode1.mp3',
  guests: ['John Doe', 'Jane Smith'],
  isFavorite: false,
}

export const Default: Story = {
  args: {
    episode: sampleEpisode,
    onPlay: episode => console.log('Play episode:', episode.title),
    onAIExplanation: episode => console.log('AI explanation for:', episode.title),
  },
}

export const WithProgress: Story = {
  args: {
    episode: {
      ...sampleEpisode,
      progress: 0.35, // 35% listened
    },
    onPlay: episode => console.log('Play episode:', episode.title),
    onAIExplanation: episode => console.log('AI explanation for:', episode.title),
  },
}

export const LongTitle: Story = {
  args: {
    episode: {
      ...sampleEpisode,
      title: 'This is a very long episode title that should be truncated properly when it exceeds the available space',
    },
    onPlay: episode => console.log('Play episode:', episode.title),
    onAIExplanation: episode => console.log('AI explanation for:', episode.title),
  },
}

export const ShortEpisode: Story = {
  args: {
    episode: {
      ...sampleEpisode,
      duration: 900, // 15 minutes
      title: 'Quick Comedy Bit',
    },
    onPlay: episode => console.log('Play episode:', episode.title),
    onAIExplanation: episode => console.log('AI explanation for:', episode.title),
  },
}
