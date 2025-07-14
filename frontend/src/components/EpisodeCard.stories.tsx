import type { Meta, StoryObj } from '@storybook/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import EpisodeCard from './EpisodeCard'

const meta = {
  title: 'Components/EpisodeCard',
  component: EpisodeCard,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => {
      const router = createMemoryRouter([
        {
          path: '*',
          element: (
            <div style={{ width: '400px' }}>
              <Story />
            </div>
          ),
        },
      ])
      return <RouterProvider router={router} />
    },
  ],
  tags: ['autodocs'],
  argTypes: {
    episode: {
      description: 'Episode data to display',
    },
    onPlay: {
      description: 'Callback when play button is clicked',
    },
    onAIExplanation: {
      description: 'Callback when AI explanation is requested',
    },
    podcastImageUrl: {
      description: 'URL of the podcast image',
    },
  },
} satisfies Meta<typeof EpisodeCard>

export default meta
type Story = StoryObj<typeof meta>

const sampleEpisode = {
  episodeId: '1',
  title: 'Building Better Software',
  description:
    'In this episode, we discuss best practices for building scalable and maintainable software applications.',
  releaseDate: '2024-01-15',
  duration: '3600',
  audioUrl: 'https://example.com/episode1.mp3',
  imageUrl: 'https://via.placeholder.com/150',
  podcastId: 'podcast1',
  podcastName: 'Tech Talk Daily',
}

export const Default: Story = {
  args: {
    episode: sampleEpisode,
    onPlay: () => console.log('Play clicked'),
  },
}

export const Playing: Story = {
  args: {
    episode: sampleEpisode,
    onPlay: () => console.log('Play clicked'),
  },
}

export const NoImage: Story = {
  args: {
    episode: { ...sampleEpisode, imageUrl: undefined },
    onPlay: () => console.log('Play clicked'),
  },
}

export const NoDescription: Story = {
  args: {
    episode: { ...sampleEpisode, description: undefined },
    onPlay: () => console.log('Play clicked'),
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
  },
}
