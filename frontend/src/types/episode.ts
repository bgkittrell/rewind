export interface Episode {
  id: string
  title: string
  podcast: {
    id: string
    name: string
    thumbnail?: string
  }
  releaseDate: string
  duration: number // in seconds
  description: string
  audioUrl: string
  progress?: number // 0-1, how much has been listened to
  guests?: string[]
  isFavorite?: boolean
}
