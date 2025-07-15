export interface Guest {
  id: string
  name: string
  title?: string
  company?: string
  bio?: string
  website?: string
  social?: {
    twitter?: string
    linkedin?: string
  }
}
