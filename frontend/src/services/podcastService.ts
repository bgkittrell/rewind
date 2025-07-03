import { apiClient } from './api'

export interface Podcast {
  podcastId: string
  title: string
  description: string
  rssUrl: string
  imageUrl: string
  createdAt: string
  lastUpdated: string
  episodeCount: number
  unreadCount?: number
  lastSynced?: string
}

export interface Episode {
  episodeId: string
  podcastId: string
  title: string
  description: string
  audioUrl: string
  imageUrl?: string
  duration: string
  releaseDate: string
  isListened?: boolean
  playbackPosition?: number
}

export interface AddPodcastRequest {
  rssUrl: string
}

export interface AddPodcastResponse {
  podcastId: string
  title: string
  rssUrl: string
  message: string
}

export interface GetPodcastsResponse {
  podcasts: Podcast[]
  total: number
  hasMore: boolean
}

export interface GetEpisodesResponse {
  episodes: Episode[]
  total: number
  hasMore: boolean
}

export interface GetEpisodesParams {
  limit?: number
  offset?: number
  sort?: 'newest' | 'oldest'
}

export interface GetPodcastsParams {
  limit?: number
  offset?: number
}

class PodcastService {
  async addPodcast(request: AddPodcastRequest): Promise<AddPodcastResponse> {
    return apiClient.post<AddPodcastResponse>('/podcasts', request)
  }

  async getPodcasts(params?: GetPodcastsParams): Promise<GetPodcastsResponse> {
    return apiClient.get<GetPodcastsResponse>('/podcasts', params)
  }

  async deletePodcast(podcastId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/podcasts/${podcastId}`)
  }

  async getEpisodes(podcastId: string, params?: GetEpisodesParams): Promise<GetEpisodesResponse> {
    return apiClient.get<GetEpisodesResponse>(`/podcasts/${podcastId}/episodes`, params)
  }
}

export const podcastService = new PodcastService()
export default podcastService
