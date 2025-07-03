# Episode Management Implementation Checklist

## 🎯 Day 1: RSS Episode Extraction & Database Operations

### ✅ Step 1: Extend RSS Service (1-2 hours)
**File**: `backend/src/services/rssService.ts`

- [ ] **Add episode extraction method**
  ```typescript
  async parseEpisodesFromFeed(rssUrl: string, limit = 50): Promise<EpisodeData[]>
  ```

- [ ] **Add helper methods**:
  - [ ] `extractAudioUrl(item: any): string` - Get MP3/audio URL from enclosures
  - [ ] `parseDuration(duration: string): string` - Convert to MM:SS format
  - [ ] `extractEpisodeImage(item: any): string | undefined` - Episode-specific image
  - [ ] `extractGuests(content: string): string[]` - Parse guest names from content
  - [ ] `extractTags(categories: any[]): string[]` - Convert categories to tags

- [ ] **Update interface** to include episode data
- [ ] **Add error handling** for malformed RSS items
- [ ] **Test with sample RSS feeds** (Joe Rogan, Comedy Bang Bang, etc.)

### ✅ Step 2: Extend DynamoDB Service (2-3 hours)  
**File**: `backend/src/services/dynamoService.ts`

- [ ] **Add environment variables**:
  ```typescript
  const EPISODES_TABLE = process.env.EPISODES_TABLE || 'RewindEpisodes'
  const LISTENING_HISTORY_TABLE = process.env.LISTENING_HISTORY_TABLE || 'RewindListeningHistory'
  ```

- [ ] **Episode CRUD methods**:
  - [ ] `saveEpisodes(podcastId: string, episodes: EpisodeData[]): Promise<Episode[]>` - Batch insert
  - [ ] `getEpisodesByPodcast(podcastId: string, limit?: number, lastEvaluatedKey?: string)` - With pagination
  - [ ] `getEpisodeById(podcastId: string, episodeId: string): Promise<Episode | null>`
  - [ ] `deleteEpisodesByPodcast(podcastId: string): Promise<void>` - Batch delete

- [ ] **Progress tracking methods**:
  - [ ] `savePlaybackProgress(userId: string, episodeId: string, podcastId: string, position: number, duration: number)`
  - [ ] `getPlaybackProgress(userId: string, episodeId: string)`
  - [ ] `getListeningHistory(userId: string, limit?: number)`

- [ ] **Add proper error handling** and logging
- [ ] **Test database operations** locally

### ✅ Step 3: Update Type Definitions (30 minutes)
**File**: `backend/src/types/index.ts`

- [ ] **Add Episode interface**:
  ```typescript
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
  ```

- [ ] **Add ListeningHistoryItem interface**
- [ ] **Add EpisodeData interface** for RSS parsing
- [ ] **Export all new types**

## 🎯 Day 2: Episode API Handler

### ✅ Step 4: Create Episode Handler (3-4 hours)
**File**: `backend/src/handlers/episodeHandler.ts`

- [ ] **Set up handler structure** with CORS and auth
- [ ] **Implement route handling**:
  - [ ] `GET /episodes/{podcastId}` - Get episodes with pagination
  - [ ] `POST /episodes/{podcastId}/sync` - Parse RSS and store episodes  
  - [ ] `GET /episodes/{episodeId}/progress` - Get playback progress
  - [ ] `PUT /episodes/{episodeId}/progress` - Save playback progress
  - [ ] `GET /listening-history` - Get user's listening history
  - [ ] `DELETE /episodes/{podcastId}` - Delete all episodes

- [ ] **Add input validation** for all endpoints
- [ ] **Add proper error responses** with meaningful messages
- [ ] **Add logging** for debugging and monitoring

### ✅ Step 5: Update Infrastructure (1 hour)
**File**: `infra/lib/rewind-backend-stack.ts`

- [ ] **Add episode handler Lambda function**:
  ```typescript
  const episodeHandler = new NodejsFunction(this, 'EpisodeHandler', {
    entry: 'backend/src/handlers/episodeHandler.ts',
    handler: 'handler',
    environment: {
      EPISODES_TABLE: dataStack.tables.episodes.tableName,
      LISTENING_HISTORY_TABLE: dataStack.tables.listeningHistory.tableName,
      PODCASTS_TABLE: dataStack.tables.podcasts.tableName,
    },
  })
  ```

- [ ] **Grant DynamoDB permissions**:
  - [ ] Episodes table read/write
  - [ ] Listening history table read/write  
  - [ ] Podcasts table read (for validation)

- [ ] **Add API Gateway routes**:
  ```typescript
  // Episode routes
  const episodesResource = api.root.addResource('episodes')
  const episodePodcastResource = episodesResource.addResource('{podcastId}')
  const episodeIdResource = episodesResource.addResource('{episodeId}')
  const progressResource = episodeIdResource.addResource('progress')
  
  // Listening history route
  const historyResource = api.root.addResource('listening-history')
  ```

- [ ] **Deploy infrastructure changes**: `npm run deploy --workspace=infra`

### ✅ Step 6: Test Backend APIs (1 hour)
- [ ] **Test episode sync** with real RSS feed
- [ ] **Test episode retrieval** with pagination
- [ ] **Test progress tracking** save/load
- [ ] **Verify all responses** have proper structure
- [ ] **Check CloudWatch logs** for any errors

## 🎯 Day 3: Frontend Integration

### ✅ Step 7: Create Episode Service (1-2 hours)
**File**: `frontend/src/services/episodeService.ts`

- [ ] **Create EpisodeService class**:
  ```typescript
  export class EpisodeService {
    private api: ApiClient
    
    async getEpisodes(podcastId: string, limit = 20, cursor?: string)
    async syncEpisodes(podcastId: string)
    async saveProgress(episodeId: string, position: number, duration: number)
    async getProgress(episodeId: string)
    async getListeningHistory(limit = 20)
  }
  ```

- [ ] **Add proper error handling** and retries
- [ ] **Add TypeScript types** for all responses
- [ ] **Export service instance**: `export const episodeService = new EpisodeService(api)`

### ✅ Step 8: Update Library Page (2 hours)
**File**: `frontend/src/routes/library.tsx`

- [ ] **Add episode state management**:
  ```typescript
  const [expandedPodcasts, setExpandedPodcasts] = useState<Set<string>>(new Set())
  const [episodesByPodcast, setEpisodesByPodcast] = useState<Record<string, Episode[]>>({})
  const [loadingEpisodes, setLoadingEpisodes] = useState<Set<string>>(new Set())
  ```

- [ ] **Add podcast expansion functionality**:
  - [ ] Click handler to expand/collapse podcasts
  - [ ] Load episodes on first expansion
  - [ ] Show loading state during episode fetch
  - [ ] Display episodes in expandable card

- [ ] **Update PodcastCard** to show episode count and expansion state
- [ ] **Add episode list rendering** with EpisodeCard components
- [ ] **Add pagination** for large episode lists

### ✅ Step 9: Update MediaPlayer Context (1 hour)
**File**: `frontend/src/context/MediaPlayerContext.tsx`

- [ ] **Enhance MediaPlayerContext**:
  ```typescript
  interface MediaPlayerContextType {
    currentEpisode: Episode | null
    isPlaying: boolean
    progress: number
    duration: number
    volume: number
    playbackRate: number
    
    playEpisode: (episode: Episode) => Promise<void>
    pause: () => void
    resume: () => void
    seek: (position: number) => void
    setVolume: (volume: number) => void
    setPlaybackRate: (rate: number) => void
    close: () => void
  }
  ```

- [ ] **Add progress persistence**:
  - [ ] Save progress every 10 seconds during playback
  - [ ] Load saved progress when starting episode
  - [ ] Handle progress sync errors gracefully

- [ ] **Update FloatingMediaPlayer** to use context
- [ ] **Add episode metadata** to MediaSession API

### ✅ Step 10: Connect EpisodeCard to MediaPlayer (1 hour)
**File**: `frontend/src/components/EpisodeCard.tsx`

- [ ] **Update play button handler**:
  ```typescript
  const handlePlay = async () => {
    await mediaPlayer.playEpisode(episode)
  }
  ```

- [ ] **Show loading state** during episode loading
- [ ] **Display current playing state** if this episode is playing
- [ ] **Add progress bar** for partially played episodes
- [ ] **Connect AI explanation button** (placeholder for now)

## 🎯 Day 4: Integration & Testing

### ✅ Step 11: Automatic Episode Sync (1 hour)
**File**: `backend/src/handlers/podcastHandler.ts`

- [ ] **Update addPodcast function** to sync episodes after adding:
  ```typescript
  // After saving podcast
  try {
    const episodes = await rssService.parseEpisodesFromFeed(rssUrl)
    await dynamoService.saveEpisodes(podcast.podcastId, episodes)
  } catch (error) {
    // Log but don't fail podcast addition
    console.warn('Failed to sync episodes:', error)
  }
  ```

- [ ] **Update response** to include episode count
- [ ] **Add background episode sync** option

### ✅ Step 12: Environment Configuration (30 minutes)
- [ ] **Update backend environment variables** in CDK
- [ ] **Update frontend environment variables**:
  ```typescript
  // .env.development
  VITE_API_BASE_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/v1
  ```
- [ ] **Deploy configuration changes**

### ✅ Step 13: Fix Test Dependencies (30 minutes)
- [ ] **Install missing packages**:
  ```bash
  npm install vitest @vitest/ui --workspace=frontend --save-dev
  npm install vitest --workspace=backend --save-dev  
  npm install jest --workspace=infra --save-dev
  ```
- [ ] **Verify tests run**: `npm run test`

### ✅ Step 14: Write Tests (2-3 hours)

**Backend Tests**:
- [ ] **RSS Service tests**: `backend/src/services/__tests__/rssService.test.ts`
- [ ] **DynamoDB Service tests**: `backend/src/services/__tests__/dynamoService.test.ts`
- [ ] **Episode Handler tests**: `backend/src/handlers/__tests__/episodeHandler.test.ts`

**Frontend Tests**:
- [ ] **Episode Service tests**: `frontend/src/services/__tests__/episodeService.test.ts`
- [ ] **MediaPlayer Context tests**: `frontend/src/context/__tests__/MediaPlayerContext.test.tsx`

## 🎯 Day 5: End-to-End Testing & Polish

### ✅ Step 15: End-to-End Testing (2 hours)
- [ ] **User Flow 1**: Add podcast → Episodes appear automatically
- [ ] **User Flow 2**: Click episode → Audio plays immediately  
- [ ] **User Flow 3**: Pause/resume → Position is saved/restored
- [ ] **User Flow 4**: Close app → Progress persists on return
- [ ] **User Flow 5**: Multiple episodes → Switching works correctly

### ✅ Step 16: Error Handling & Polish (2 hours)
- [ ] **Add loading states** throughout UI
- [ ] **Add error messages** for failed operations
- [ ] **Add retry mechanisms** for network failures  
- [ ] **Add progress indicators** for episode sync
- [ ] **Add empty states** when no episodes exist

### ✅ Step 17: Performance Optimization (1 hour)
- [ ] **Implement episode caching** in browser
- [ ] **Add pagination** for large episode lists
- [ ] **Optimize re-renders** in episode components
- [ ] **Add lazy loading** for episode images

### ✅ Step 18: Final Validation (1 hour)
- [ ] **Run all tests**: `npm run test`
- [ ] **Check TypeScript**: `npm run build`
- [ ] **Run linting**: `npm run lint`
- [ ] **Test on mobile device**
- [ ] **Verify in production environment**

## 🚀 Success Criteria Checklist

### Technical Requirements
- [ ] All episodes load within 3 seconds
- [ ] Progress saves within 1 second of user action
- [ ] Pagination works smoothly for 100+ episodes
- [ ] No memory leaks in media player
- [ ] All API endpoints respond correctly

### User Experience Requirements  
- [ ] User can play any episode immediately after adding podcast
- [ ] Playback position is preserved across browser sessions
- [ ] Episode list shows clear loading/error states
- [ ] Media player controls work reliably
- [ ] Mobile experience is smooth and responsive

### Quality Requirements
- [ ] 90%+ RSS feeds parse successfully
- [ ] All episode data fields properly populated
- [ ] Audio URLs are valid and accessible
- [ ] No duplicate episodes in database
- [ ] Progress tracking accuracy within 5 seconds

---

## 📋 Post-Implementation Notes

### Immediate Priorities After Episode Management
1. **Basic Recommendations**: "Older episodes you haven't heard"
2. **Search Enhancement**: Search within episodes, not just podcasts  
3. **Usage Analytics**: Track listening patterns for recommendations

### Known Limitations
- Limited to 50 most recent episodes per podcast (can be increased later)
- No episode download for offline listening yet
- No episode deletion or archiving
- Basic progress tracking (no advanced analytics)

### Future Enhancements
- Episode download and offline storage
- Smart episode recommendations based on listening history
- Social features (share specific episodes)
- Advanced progress analytics and insights

---

**Estimated Total Time**: 4-5 days for complete implementation
**Critical Path**: RSS parsing → Database operations → API handler → Frontend integration
**Risk Areas**: RSS feed parsing reliability, audio URL validation, progress sync timing