import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import EpisodeCard from './EpisodeCard'

const meta = {
  title: 'Components/EpisodeCard',
  component: EpisodeCard,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <MemoryRouter>
        <div style={{ width: '400px' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    episode: {
      description: 'Episode data to display',
    },
    onPlay: {
      description: 'Callback when play button is clicked',
    },
    onAddToQueue: {
      description: 'Callback when add to queue is clicked',
    },
    onMarkPlayed: {
      description: 'Callback when mark as played is clicked',
    },
    onRemove: {
      description: 'Callback when remove is clicked',
    },
    showImage: {
      description: 'Whether to show the episode thumbnail',
      control: 'boolean',
    },
    showDescription: {
      description: 'Whether to show the episode description',
      control: 'boolean',
    },
    isPlaying: {
      description: 'Whether this episode is currently playing',
      control: 'boolean',
    },
  },
} satisfies Meta<typeof EpisodeCard>

export default meta
type Story = StoryObj<typeof meta>

const sampleEpisode = {
  id: '1',
  title: 'Building Better Software',
  description:
    'In this episode, we discuss best practices for building scalable and maintainable software applications.',
  publishedAt: new Date('2024-01-15'),
  duration: 3600,
  audioUrl: 'https://example.com/episode1.mp3',
  imageUrl: 'https://via.placeholder.com/150',
  podcastId: 'podcast1',
  podcastTitle: 'Tech Talk Daily',
}

export const Default: Story = {
  args: {
    episode: sampleEpisode,
    onPlay: () => console.log('Play clicked'),
    showImage: true,
    showDescription: true,
    isPlaying: false,
  },
}

export const Playing: Story = {
  args: {
    episode: sampleEpisode,
    onPlay: () => console.log('Play clicked'),
    showImage: true,
    showDescription: true,
    isPlaying: true,
  },
}

export const NoImage: Story = {
  args: {
    episode: sampleEpisode,
    onPlay: () => console.log('Play clicked'),
    showImage: false,
    showDescription: true,
    isPlaying: false,
  },
}

export const NoDescription: Story = {
  args: {
    episode: sampleEpisode,
    onPlay: () => console.log('Play clicked'),
    showImage: true,
    showDescription: false,
    isPlaying: false,
  },
}

export const LongTitle: Story = {
  args: {
    episode: {
      ...sampleEpisode,
      title:
        'This is a very long episode title that should be truncated when displayed in the card to maintain a clean layout',
    },
    onPlay: () => console.log('Play clicked'),
    showImage: true,
    showDescription: true,
    isPlaying: false,
  },
}

export const LongDescription: Story = {
  args: {
    episode: {
      ...sampleEpisode,
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    },
    onPlay: () => console.log('Play clicked'),
    showImage: true,
    showDescription: true,
    isPlaying: false,
  },
}
