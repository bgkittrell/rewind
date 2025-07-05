import { apiClient } from './api'

export interface ResumeData {
  episodeId: string
  podcastId: string
  title: string
  podcastTitle: string
  playbackPosition: number
  duration: number
  lastPlayed: string
  progressPercentage: number
  audioUrl: string
  imageUrl?: string
  podcastImageUrl?: string
}

export interface ResumeState {
  data: ResumeData | null
  isLoading: boolean
  error: string | null
}

export class ResumeService {
  private static instance: ResumeService
  private resumeData: ResumeData | null = null
  private listeners: Array<(state: ResumeState) => void> = []

  static getInstance(): ResumeService {
    if (!ResumeService.instance) {
      ResumeService.instance = new ResumeService()
    }
    return ResumeService.instance
  }

  private constructor() {}

  subscribe(listener: (state: ResumeState) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notify(state: ResumeState): void {
    this.listeners.forEach(listener => listener(state))
  }

  async getResumeData(): Promise<ResumeData | null> {
    this.notify({ data: null, isLoading: true, error: null })

    try {
      const response = await apiClient.get<ResumeData | null>('/resume')
      this.resumeData = response
      this.notify({ data: response, isLoading: false, error: null })
      return response
    } catch (error) {
      console.error('Error fetching resume data:', error)
      this.notify({ data: null, isLoading: false, error: 'Failed to fetch resume data' })
      return null
    }
  }

  async clearResumeData(): Promise<void> {
    this.resumeData = null
    this.notify({ data: null, isLoading: false, error: null })
  }

  getCurrentResumeData(): ResumeData | null {
    return this.resumeData
  }

  hasResumeData(): boolean {
    return this.resumeData !== null
  }
}

// Export singleton instance
export const resumeService = ResumeService.getInstance()
export default resumeService