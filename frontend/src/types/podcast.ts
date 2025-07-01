export interface Podcast {
  id: string
  name: string
  description: string
  thumbnail: string
  author: string
  lastUpdated: string
  episodeCount: number
  category: string
  isSubscribed?: boolean
}