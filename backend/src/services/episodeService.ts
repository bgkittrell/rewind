import { DatabaseService, Tables } from './database.js'

export interface Episode {
  podcastId: string
  episodeId: string
  title: string
  description: string
  audioUrl: string
  duration: string
  releaseDate: string
  imageUrl?: string
  guests?: string[]
  tags?: string[]
  createdAt: string
}

export interface EpisodeInput {
  title: string
  description: string
  audioUrl: string
  duration: string
  releaseDate: string
  imageUrl?: string
  guests?: string[]
  tags?: string[]
}

export interface EpisodePlayback {
  userId: string
  episodeId: string
  podcastId: string
  playbackPosition: number
  duration: number
  isCompleted: boolean
  lastPlayed: string
  firstPlayed: string
  playCount: number
  createdAt: string
  updatedAt: string
}

export class EpisodeService extends DatabaseService {
  private listeningHistoryService: DatabaseService

  constructor() {
    super(Tables.EPISODES)
    this.listeningHistoryService = new DatabaseService(Tables.LISTENING_HISTORY)
  }

  async addEpisode(podcastId: string, episodeData: EpisodeInput): Promise<Episode> {
    const now = new Date().toISOString()
    const episodeId = this.generateEpisodeId()

    const episode: Episode = {
      podcastId,
      episodeId,
      title: episodeData.title,
      description: episodeData.description,
      audioUrl: episodeData.audioUrl,
      duration: episodeData.duration,
      releaseDate: episodeData.releaseDate,
      imageUrl: episodeData.imageUrl,
      guests: episodeData.guests,
      tags: episodeData.tags,
      createdAt: now,
    }

    await this.put(episode)
    return episode
  }

  async getEpisodes(
    podcastId: string, 
    limit: number = 50, 
    offset?: string,
    sort: 'newest' | 'oldest' = 'newest'
  ): Promise<{ episodes: Episode[], hasMore: boolean, total: number }> {
    const indexName = 'ReleaseDateIndex'
    const scanIndexForward = sort === 'oldest'

    const result = await this.queryWithFilter(
      'podcastId',
      podcastId,
      undefined,
      undefined,
      undefined,
      undefined,
      indexName,
      limit,
      offset ? JSON.parse(Buffer.from(offset, 'base64').toString()) : undefined
    )

    // Sort the results by release date
    const sortedEpisodes = (result.items as Episode[]).sort((a, b) => {
      const dateA = new Date(a.releaseDate).getTime()
      const dateB = new Date(b.releaseDate).getTime()
      return sort === 'newest' ? dateB - dateA : dateA - dateB
    })

    return {
      episodes: sortedEpisodes,
      hasMore: result.hasMore,
      total: sortedEpisodes.length,
    }
  }

  async getEpisode(podcastId: string, episodeId: string): Promise<Episode | undefined> {
    const episode = await this.get({ podcastId, episodeId })
    return episode as Episode | undefined
  }

  async savePlaybackPosition(
    userId: string, 
    episodeId: string, 
    podcastId: string,
    position: number, 
    duration: number, 
    isCompleted: boolean = false
  ): Promise<EpisodePlayback> {
    const now = new Date().toISOString()
    
    // Check if record exists
    const existing = await this.listeningHistoryService.get({ userId, episodeId })
    
    if (existing) {
      // Update existing record
      const playCount = isCompleted && !existing.isCompleted ? existing.playCount + 1 : existing.playCount
      
      const result = await this.listeningHistoryService.update(
        { userId, episodeId },
        'SET playbackPosition = :position, duration = :duration, isCompleted = :isCompleted, lastPlayed = :lastPlayed, playCount = :playCount, updatedAt = :updatedAt',
        {
          ':position': position,
          ':duration': duration,
          ':isCompleted': isCompleted,
          ':lastPlayed': now,
          ':playCount': playCount,
          ':updatedAt': now,
        }
      )
      
      return result as EpisodePlayback
    } else {
      // Create new record
      const playback: EpisodePlayback = {
        userId,
        episodeId,
        podcastId,
        playbackPosition: position,
        duration,
        isCompleted,
        lastPlayed: now,
        firstPlayed: now,
        playCount: isCompleted ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      }
      
      await this.listeningHistoryService.put(playback)
      return playback
    }
  }

  async getPlaybackPosition(userId: string, episodeId: string): Promise<EpisodePlayback | undefined> {
    const playback = await this.listeningHistoryService.get({ userId, episodeId })
    return playback as EpisodePlayback | undefined
  }

  async getListeningHistory(
    userId: string, 
    limit: number = 50,
    lastEvaluatedKey?: Record<string, any>
  ): Promise<{ history: EpisodePlayback[], hasMore: boolean, lastEvaluatedKey?: Record<string, any> }> {
    const result = await this.listeningHistoryService.queryWithFilter(
      'userId',
      userId,
      undefined,
      undefined,
      undefined,
      undefined,
      'LastPlayedIndex',
      limit,
      lastEvaluatedKey
    )

    return {
      history: result.items as EpisodePlayback[],
      hasMore: result.hasMore,
      lastEvaluatedKey: result.lastEvaluatedKey,
    }
  }

  async getRecentlyPlayed(
    userId: string,
    limit: number = 10
  ): Promise<EpisodePlayback[]> {
    const result = await this.listeningHistoryService.queryWithFilter(
      'userId',
      userId,
      undefined,
      undefined,
      'isCompleted = :completed',
      { ':completed': false },
      'LastPlayedIndex',
      limit
    )

    return result.items as EpisodePlayback[]
  }

  private generateEpisodeId(): string {
    return `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}