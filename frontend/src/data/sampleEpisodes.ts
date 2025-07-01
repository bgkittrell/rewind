import { Episode } from '../types/episode'

export const sampleEpisodes: Episode[] = [
  {
    id: '1',
    title: 'The Best Comedy Episode Ever Made',
    podcast: {
      id: 'comedy-central',
      name: 'Comedy Central Podcast',
      thumbnail: 'https://via.placeholder.com/80x80/26A69A/FFFFFF?text=CC',
    },
    releaseDate: '2023-01-15T10:00:00Z',
    duration: 2700, // 45 minutes
    description: 'An amazing comedy episode with hilarious guests and great stories.',
    audioUrl: 'https://example.com/episode1.mp3',
    guests: ['John Doe', 'Jane Smith'],
    isFavorite: false,
    progress: 0.35,
  },
  {
    id: '2',
    title: 'Classic Interview with Famous Comedian',
    podcast: {
      id: 'late-night-show',
      name: 'Late Night Comedy Show',
      thumbnail: 'https://via.placeholder.com/80x80/FF6B35/FFFFFF?text=LN',
    },
    releaseDate: '2022-12-20T15:30:00Z',
    duration: 3600, // 1 hour
    description: 'A classic interview episode featuring a famous comedian discussing their career.',
    audioUrl: 'https://example.com/episode2.mp3',
    guests: ['Famous Comedian'],
    isFavorite: true,
  },
  {
    id: '3',
    title: 'Behind the Scenes: Making a Comedy Special',
    podcast: {
      id: 'comedy-insider',
      name: 'Comedy Insider',
      thumbnail: 'https://via.placeholder.com/80x80/9C27B0/FFFFFF?text=CI',
    },
    releaseDate: '2023-02-01T12:00:00Z',
    duration: 1800, // 30 minutes
    description: 'Go behind the scenes of creating a comedy special with insider stories.',
    audioUrl: 'https://example.com/episode3.mp3',
    guests: ['Director', 'Producer'],
    isFavorite: false,
  },
  {
    id: '4',
    title:
      'This is a very long episode title that should be truncated properly when it exceeds the available space in the card layout',
    podcast: {
      id: 'long-form-comedy',
      name: 'Long Form Comedy Podcast',
      thumbnail: 'https://via.placeholder.com/80x80/F44336/FFFFFF?text=LF',
    },
    releaseDate: '2023-01-10T09:15:00Z',
    duration: 5400, // 1.5 hours
    description: 'A very long episode with an even longer title to test the UI layout.',
    audioUrl: 'https://example.com/episode4.mp3',
    guests: ['Guest 1', 'Guest 2', 'Guest 3'],
    isFavorite: false,
    progress: 0.8,
  },
  {
    id: '5',
    title: 'Quick Comedy Bit',
    podcast: {
      id: 'short-bits',
      name: 'Short Comedy Bits',
      thumbnail: 'https://via.placeholder.com/80x80/4CAF50/FFFFFF?text=SB',
    },
    releaseDate: '2023-01-08T14:45:00Z',
    duration: 900, // 15 minutes
    description: 'A quick comedy bit for your commute.',
    audioUrl: 'https://example.com/episode5.mp3',
    isFavorite: false,
  },
]
