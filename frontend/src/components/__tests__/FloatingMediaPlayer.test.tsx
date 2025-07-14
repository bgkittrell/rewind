import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FloatingMediaPlayer } from '../FloatingMediaPlayer';
import type { Episode } from '../../types/episode';

// Mock the hooks and services
vi.mock('../../hooks/useAudioPlayer');
vi.mock('../../hooks/useProgressSaving', () => ({
  useProgressSaving: vi.fn(),
}));
vi.mock('../../services/mediaSessionService', () => ({
  mediaSessionService: {
    setMetadata: vi.fn(),
    setActionHandlers: vi.fn(),
    clearActionHandlers: vi.fn(),
    setPositionState: vi.fn(),
  },
}));

// Mock the sub-components
vi.mock('../MediaPlayer/MediaControls', () => ({
  MediaControls: ({ isPlaying, onPlay, onPause, onSkipBack, onSkipForward, size }: any) => (
    <div data-testid="media-controls" data-size={size}>
      <button data-testid={size === 'mini' ? 'mini-play-pause-button' : 'play-pause-button'} onClick={isPlaying ? onPause : onPlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button data-testid="skip-back-button" onClick={onSkipBack}>Skip Back</button>
      <button data-testid="skip-forward-button" onClick={onSkipForward}>Skip Forward</button>
    </div>
  ),
}));

vi.mock('../MediaPlayer/ProgressBar', () => ({
  ProgressBar: ({ currentTime, duration, onSeek, size }: any) => (
    <div data-testid="progress-bar" data-size={size}>
      <span>{currentTime}/{duration}</span>
      <button onClick={() => onSeek(30)}>Seek to 30</button>
    </div>
  ),
}));

vi.mock('../MediaPlayer/VolumeControl', () => ({
  VolumeControl: ({ volume, onVolumeChange }: any) => (
    <div data-testid="volume-control">
      <span>Volume: {volume}</span>
      <button onClick={() => onVolumeChange(0.5)}>Set Volume 0.5</button>
    </div>
  ),
}));

vi.mock('../MediaPlayer/MediaInfo', () => ({
  MediaInfo: ({ episode, size }: any) => (
    <div data-testid="media-info" data-size={size}>
      <span>{episode.title}</span>
      <span>{episode.podcast.title}</span>
      <img src={episode.imageUrl || episode.podcast.imageUrl} alt={`${episode.podcast.title} artwork`} />
    </div>
  ),
}));

vi.mock('../MediaPlayer/PlaybackRateControl', () => ({
  PlaybackRateControl: ({ playbackRate, onPlaybackRateChange }: any) => (
    <div data-testid="playback-rate-control">
      <span>Rate: {playbackRate}x</span>
      <button onClick={() => onPlaybackRateChange(1.5)}>Set Rate 1.5x</button>
    </div>
  ),
}));

import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { mediaSessionService } from '../../services/mediaSessionService';

const mockAudioPlayer = {
  audioRef: { current: { paused: false } },
  play: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  setPlaybackRate: vi.fn(),
  isLoading: false,
  error: null,
};

const mockEpisode: Episode = {
  id: '123',
  podcastId: 'podcast-1',
  title: 'Test Episode',
  description: 'Test Description',
  audioUrl: 'https://example.com/audio.mp3',
  duration: 3600,
  publishedAt: '2024-01-01',
  imageUrl: 'https://example.com/image.jpg',
  playbackPosition: 100,
  podcast: {
    id: 'podcast-1',
    title: 'Test Podcast',
    description: 'Test Podcast Description',
    rssFeedUrl: 'https://example.com/rss',
    imageUrl: 'https://example.com/podcast.jpg',
  },
};

describe('FloatingMediaPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioPlayer.seek.mockClear();
    mockAudioPlayer.play.mockClear();
    mockAudioPlayer.pause.mockClear();
    mockAudioPlayer.setVolume.mockClear();
    mockAudioPlayer.setPlaybackRate.mockClear();
    (useAudioPlayer as any).mockReturnValue(mockAudioPlayer);
  })

  it('renders nothing when episode is null', () => {
    const { container } = render(
      <FloatingMediaPlayer
        episode={null}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders mini player by default', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    expect(screen.getAllByTestId('floating-media-player')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('audio-element')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('expand-player')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('mini-close-player')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('media-info')[0]).toHaveAttribute('data-size', 'mini');
  });

  it('expands and minimizes player', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    // Click expand button - get all and use first one
    const expandButtons = screen.getAllByTestId('expand-player');
    fireEvent.click(expandButtons[0]);
    
    const minimizeButtons = screen.getAllByTestId('minimize-player');
    expect(minimizeButtons[0]).toBeInTheDocument();
    
    const mediaInfos = screen.getAllByTestId('media-info');
    expect(mediaInfos[0]).toHaveAttribute('data-size', 'full');

    // Click minimize button
    fireEvent.click(minimizeButtons[0]);
    
    const expandButtonsAfter = screen.getAllByTestId('expand-player');
    expect(expandButtonsAfter[0]).toBeInTheDocument();
    
    const mediaInfosAfter = screen.getAllByTestId('media-info');
    expect(mediaInfosAfter[0]).toHaveAttribute('data-size', 'mini');
  });

  it('closes player when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={onClose}
        onSeek={vi.fn()}
      />
    );

    const closeButtons = screen.getAllByTestId('mini-close-player');
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('plays audio when isPlaying becomes true', () => {
    const { rerender } = render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    expect(mockAudioPlayer.play).not.toHaveBeenCalled();

    rerender(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={true}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    expect(mockAudioPlayer.play).toHaveBeenCalled();
  });

  it('pauses audio when isPlaying becomes false', () => {
    const { rerender } = render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={true}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    rerender(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    expect(mockAudioPlayer.pause).toHaveBeenCalled();
  });

  it('handles skip back functionality', async () => {
    const onSeek = vi.fn();
    let timeUpdateCallback: ((time: number) => void) | undefined;
    
    // Clear previous seek calls
    mockAudioPlayer.seek.mockClear();
    
    // Set up the audio player with current time
    (useAudioPlayer as any).mockImplementation(({ onTimeUpdate }: any) => {
      timeUpdateCallback = onTimeUpdate;
      return mockAudioPlayer;
    });

    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={onSeek}
      />
    );

    // Wait for initial render and seek to playback position
    await waitFor(() => {
      expect(mockAudioPlayer.seek).toHaveBeenCalledWith(100); // Initial seek to playback position
    });
    
    // Clear mocks after initial setup
    mockAudioPlayer.seek.mockClear();
    onSeek.mockClear();

    // Simulate time update to set current time to 100
    await waitFor(() => {
      timeUpdateCallback?.(100);
    });

    const skipBackButton = screen.getAllByText('Skip Back')[0];
    fireEvent.click(skipBackButton);

    expect(mockAudioPlayer.seek).toHaveBeenCalledWith(85); // 100 - 15
    expect(onSeek).toHaveBeenCalledWith(85);
  });

  it('handles skip forward functionality', async () => {
    const onSeek = vi.fn();
    let timeUpdateCallback: ((time: number) => void) | undefined;
    let durationChangeCallback: ((duration: number) => void) | undefined;
    
    // Clear previous seek calls
    mockAudioPlayer.seek.mockClear();
    
    // Set up the audio player with current time and duration
    (useAudioPlayer as any).mockImplementation(({ onTimeUpdate, onDurationChange }: any) => {
      timeUpdateCallback = onTimeUpdate;
      durationChangeCallback = onDurationChange;
      return mockAudioPlayer;
    });

    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={onSeek}
      />
    );

    // Wait for initial render and seek to playback position
    await waitFor(() => {
      expect(mockAudioPlayer.seek).toHaveBeenCalledWith(100); // Initial seek to playback position
    });
    
    // Clear mocks after initial setup
    mockAudioPlayer.seek.mockClear();
    onSeek.mockClear();

    // Simulate time and duration updates
    await waitFor(() => {
      timeUpdateCallback?.(100);
      durationChangeCallback?.(3600);
    });

    const skipForwardButton = screen.getAllByText('Skip Forward')[0];
    fireEvent.click(skipForwardButton);

    expect(mockAudioPlayer.seek).toHaveBeenCalledWith(115); // 100 + 15
    expect(onSeek).toHaveBeenCalledWith(115);
  });

  it('handles seek from progress bar', async () => {
    const onSeek = vi.fn();
    
    // Clear previous seek calls
    mockAudioPlayer.seek.mockClear();
    
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={onSeek}
      />
    );

    // Wait for initial render and seek to playback position
    await waitFor(() => {
      expect(mockAudioPlayer.seek).toHaveBeenCalledWith(100); // Initial seek to playback position
    });
    
    // Clear mocks after initial setup
    mockAudioPlayer.seek.mockClear();
    onSeek.mockClear();

    fireEvent.click(screen.getAllByText('Seek to 30')[0]);
    expect(mockAudioPlayer.seek).toHaveBeenCalledWith(30);
    expect(onSeek).toHaveBeenCalledWith(30);
  });

  it('handles volume control', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    // Expand player to see volume control
    fireEvent.click(screen.getAllByTestId('expand-player')[0]);
    
    fireEvent.click(screen.getAllByText('Set Volume 0.5')[0]);
    expect(mockAudioPlayer.setVolume).toHaveBeenCalledWith(0.5);
  });

  it('handles playback rate control', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    // Expand player to see playback rate control
    fireEvent.click(screen.getAllByTestId('expand-player')[0]);
    
    fireEvent.click(screen.getAllByText('Set Rate 1.5x')[0]);
    expect(mockAudioPlayer.setPlaybackRate).toHaveBeenCalledWith(1.5);
  });

  it('sets up MediaSession API on episode change', () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();
    
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={onPlay}
        onPause={onPause}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    expect(mediaSessionService.setMetadata).toHaveBeenCalledWith(mockEpisode);
    expect(mediaSessionService.setActionHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        play: onPlay,
        pause: onPause,
        seekbackward: expect.any(Function),
        seekforward: expect.any(Function),
      })
    );
  });

  it('clears MediaSession handlers on unmount', () => {
    const { unmount } = render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    unmount();
    expect(mediaSessionService.clearActionHandlers).toHaveBeenCalled();
  });

  it('seeks to playback position on episode change', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    expect(mockAudioPlayer.seek).toHaveBeenCalledWith(100); // episode.playbackPosition
  });

  it('closes overlay when clicked in expanded view', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    // Expand player
    fireEvent.click(screen.getAllByTestId('expand-player')[0]);
    
    // Click overlay
    const overlay = document.querySelector('.bg-black.bg-opacity-50');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay!);
    
    // Should be minimized
    expect(screen.getAllByTestId('expand-player')[0]).toBeInTheDocument();
  });

  it('calls onPlay and onPause from controls', () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();
    
    const { rerender } = render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={onPlay}
        onPause={onPause}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    // Click play button
    fireEvent.click(screen.getAllByTestId('mini-play-pause-button')[0]);
    expect(onPlay).toHaveBeenCalled();

    // Update to playing state and click pause
    rerender(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={true}
        onPlay={onPlay}
        onPause={onPause}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByTestId('mini-play-pause-button')[0]);
    expect(onPause).toHaveBeenCalled();
  });

  it('displays episode and podcast information', () => {
    render(
      <FloatingMediaPlayer
        episode={mockEpisode}
        isPlaying={false}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onClose={vi.fn()}
        onSeek={vi.fn()}
      />
    );

    expect(screen.getAllByText('Test Episode')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Test Podcast')[0]).toBeInTheDocument();
    expect(screen.getAllByAltText('Test Podcast artwork')[0]).toHaveAttribute('src', 'https://example.com/image.jpg');
  });
});
