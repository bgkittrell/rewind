# Episode Management Implementation Plan

## 📍 Current Status Analysis

### ✅ Already Implemented

- **Database Schema**: Episodes table deployed and ready (`RewindEpisodes`)
- **RSS Service**: Basic podcast metadata parsing (`rssService.ts`)
- **DynamoDB Service**: Podcast CRUD operations (`dynamoService.ts`)
- **Frontend Components**: Episode UI components ready (`EpisodeCard`, `FloatingMediaPlayer`)

### 🚧 Missing Implementation

- **Episode Extraction**: RSS service doesn't extract individual episodes
- **Episode Database Operations**: No episode CRUD in DynamoDB service
- **Episode API Handler**: No backend endpoints for episodes
- **Frontend Integration**: Episode service and API calls missing
- **Progress Tracking**: Playback position persistence not implemented

## 🎯 Implementation Strategy

### Phase 1: Backend Episode Infrastructure (Days 1-2)

#### 1.1 Extend RSS Service for Episode Extraction

**File**: `backend/src/services/rssService.ts`

**New Methods**:

```typescript
interface EpisodeData {
  title: string
  description: string
  audioUrl: string
  duration: string
  releaseDate: string
  imageUrl?: string
  guests?: string[]
  tags?: string[]
}

async parseEpisodesFromFeed(rssUrl: string): Promise<EpisodeData[]>
```

**Implementation Details**:

- Extract episodes from RSS `feed.items`
- Parse iTunes-specific fields (duration, image, explicit)
- Handle different RSS formats (iTunes, standard RSS)
- Validate audio URLs and required fields
- Limit to most recent episodes (e.g., last 50) for performance

#### 1.2 Extend DynamoDB Service for Episodes

**File**: `backend/src/services/dynamoService.ts`

**New Methods**:

```typescript
// Episode CRUD Operations
async saveEpisodes(podcastId: string, episodes: EpisodeData[]): Promise<Episode[]>
async getEpisodesByPodcast(podcastId: string, limit?: number, lastEvaluatedKey?: string): Promise<{episodes: Episode[], lastEvaluatedKey?: string}>
async getEpisodeById(podcastId: string, episodeId: string): Promise<Episode | null>
async deleteEpisodesByPodcast(podcastId: string): Promise<void>

// Progress Tracking Operations
async savePlaybackProgress(userId: string, episodeId: string, podcastId: string, position: number, duration: number): Promise<void>
async getPlaybackProgress(userId: string, episodeId: string): Promise<{position: number, duration: number} | null>
async getListeningHistory(userId: string, limit?: number): Promise<ListeningHistoryItem[]>
```

**Implementation Notes**:

- Use batch operations for episode insertion (25 items max per batch)
- Implement pagination for episode retrieval
- Handle episode deduplication by episode ID
- Add proper error handling and logging

#### 1.3 Create Episode Handler

**File**: `backend/src/handlers/episodeHandler.ts`

**API Endpoints**:

```typescript
// Episode Management
GET / episodes / { podcastId } // Get episodes for podcast with pagination
POST / episodes / { podcastId } / sync // Parse RSS and store/update episodes
DELETE / episodes / { podcastId } // Delete all episodes for podcast

// Progress Tracking
GET / episodes / { episodeId } / progress // Get user's playback progress
PUT / episodes / { episodeId } / progress // Save user's playback progress

// Listening History
GET / listening - history // Get user's listening history
```

**Handler Structure**:

```typescript
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Standard auth + CORS setup
  const userId = event.requestContext.authorizer?.claims?.sub
  const method = event.httpMethod
  const pathParameters = event.pathParameters

  switch (method) {
    case 'GET':
      if (pathParameters?.podcastId) {
        return await getEpisodes(pathParameters.podcastId, event.queryStringParameters)
      } else if (event.path.includes('/progress')) {
        return await getProgress(userId, pathParameters?.episodeId)
      } else if (event.path.includes('/listening-history')) {
        return await getListeningHistory(userId, event.queryStringParameters)
      }
    case 'POST':
      return await syncEpisodes(pathParameters?.podcastId, userId)
    case 'PUT':
      return await saveProgress(userId, pathParameters?.episodeId, JSON.parse(event.body))
    case 'DELETE':
      return await deleteEpisodes(pathParameters?.podcastId, userId)
  }
}
```

### Phase 2: Frontend Integration (Day 3)

#### 2.1 Create Episode Service

**File**: `frontend/src/services/episodeService.ts`

```typescript
export class EpisodeService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL

  async getEpisodes(
    podcastId: string,
    limit = 20,
    cursor?: string,
  ): Promise<{ episodes: Episode[]; hasMore: boolean; nextCursor?: string }>
  async syncEpisodes(podcastId: string): Promise<{ message: string; episodeCount: number }>
  async saveProgress(episodeId: string, position: number, duration: number): Promise<void>
  async getProgress(episodeId: string): Promise<{ position: number; duration: number } | null>
  async getListeningHistory(limit = 20): Promise<ListeningHistoryItem[]>
}
```

#### 2.2 Update Components with Real Data

**Library Page Enhancement**:

```typescript
// frontend/src/routes/library.tsx
const [expandedPodcasts, setExpandedPodcasts] = useState<Set<string>>(new Set())
const [episodesByPodcast, setEpisodesByPodcast] = useState<Record<string, Episode[]>>({})

const handlePodcastExpand = async (podcastId: string) => {
  if (!episodesByPodcast[podcastId]) {
    const { episodes } = await episodeService.getEpisodes(podcastId)
    setEpisodesByPodcast(prev => ({ ...prev, [podcastId]: episodes }))
  }
  setExpandedPodcasts(prev => new Set([...prev, podcastId]))
}
```

**Media Player Integration**:

```typescript
// Connect EpisodeCard to MediaPlayer
const handlePlayEpisode = async (episode: Episode) => {
  // Get saved progress
  const progress = await episodeService.getProgress(episode.episodeId)

  // Start playback with saved position
  mediaPlayer.play({
    ...episode,
    playbackPosition: progress?.position || 0,
  })
}

// Save progress periodically
const handleProgressUpdate = async (episodeId: string, position: number, duration: number) => {
  await episodeService.saveProgress(episodeId, position, duration)
}
```

#### 2.3 Update Context for Episode Management

**File**: `frontend/src/context/MediaPlayerContext.tsx`

```typescript
interface MediaPlayerContextType {
  currentEpisode: Episode | null
  isPlaying: boolean
  progress: number
  duration: number

  playEpisode: (episode: Episode) => void
  pause: () => void
  resume: () => void
  seek: (position: number) => void
  close: () => void
}
```

### Phase 3: Infrastructure Updates (Day 4)

#### 3.1 Update CDK Stack

**File**: `infra/lib/rewind-backend-stack.ts`

```typescript
// Add episode handler Lambda
const episodeHandler = new NodejsFunction(this, 'EpisodeHandler', {
  entry: 'backend/src/handlers/episodeHandler.ts',
  environment: {
    EPISODES_TABLE: episodesTable.tableName,
    LISTENING_HISTORY_TABLE: listeningHistoryTable.tableName,
    PODCASTS_TABLE: podcastsTable.tableName,
  },
})

// Grant permissions
episodesTable.grantReadWriteData(episodeHandler)
listeningHistoryTable.grantReadWriteData(episodeHandler)
podcastsTable.grantReadData(episodeHandler)

// Add API Gateway routes
api.root.addResource('episodes').addProxy({
  defaultIntegration: new LambdaIntegration(episodeHandler),
  defaultMethodOptions: {
    authorizationType: AuthorizationType.COGNITO,
    authorizer: { authorizerId: authorizer.ref },
  },
})
```

#### 3.2 Environment Variables

**Updates needed**:

```bash
# Backend environment
EPISODES_TABLE=RewindEpisodes
LISTENING_HISTORY_TABLE=RewindListeningHistory

# Frontend environment
VITE_API_BASE_URL=https://your-api.execute-api.us-east-1.amazonaws.com/v1
```

### Phase 4: Testing & Validation (Day 5)

#### 4.1 Backend Testing

**File**: `backend/src/handlers/__tests__/episodeHandler.test.ts`

```typescript
describe('Episode Handler', () => {
  test('GET /episodes/{podcastId} returns episodes', async () => {
    // Test episode retrieval with pagination
  })

  test('POST /episodes/{podcastId}/sync parses RSS and stores episodes', async () => {
    // Test RSS parsing and episode storage
  })

  test('PUT /episodes/{episodeId}/progress saves playback position', async () => {
    // Test progress tracking
  })
})
```

#### 4.2 Frontend Testing

**File**: `frontend/src/services/__tests__/episodeService.test.ts`

```typescript
describe('Episode Service', () => {
  test('fetches episodes for podcast', async () => {
    // Test API integration
  })

  test('saves and retrieves playback progress', async () => {
    // Test progress persistence
  })
})
```

#### 4.3 End-to-End Testing

**Test Flow**:

1. User adds a podcast → Episodes are automatically synced
2. User clicks episode → Episode plays with audio
3. User pauses/seeks → Progress is saved
4. User returns later → Progress is restored

## 🗂️ Database Operations Plan

### Episode Storage Strategy

```typescript
// When user adds podcast
1. Save podcast metadata (already implemented)
2. Parse RSS feed for episodes (new)
3. Store episodes in batches (new)
4. Update podcast with episode count (enhancement)

// Episode data structure in DynamoDB
{
  podcastId: "podcast-123",
  episodeId: "episode-456",
  title: "Episode Title",
  description: "Episode description...",
  audioUrl: "https://audio.url/file.mp3",
  duration: "45:30",
  releaseDate: "2024-01-15T10:00:00Z",
  imageUrl: "https://image.url/episode.jpg",
  guests: ["Guest Name"],
  tags: ["comedy", "interview"],
  createdAt: "2024-01-16T12:00:00Z"
}
```

### Progress Tracking Strategy

```typescript
// Listening history structure
{
  userId: "user-123",
  episodeId: "episode-456",
  podcastId: "podcast-123",
  playbackPosition: 1800, // seconds
  duration: 2700, // total seconds
  isCompleted: false,
  lastPlayed: "2024-01-16T15:30:00Z",
  firstPlayed: "2024-01-16T15:00:00Z",
  playCount: 1,
  createdAt: "2024-01-16T15:00:00Z",
  updatedAt: "2024-01-16T15:30:00Z"
}
```

## 🔄 RSS Feed Processing

### Episode Extraction Logic

```typescript
async parseEpisodesFromFeed(rssUrl: string): Promise<EpisodeData[]> {
  const feed = await this.parser.parseURL(rssUrl)

  return feed.items?.map(item => ({
    title: item.title || 'Untitled Episode',
    description: item.content || item.summary || '',
    audioUrl: this.extractAudioUrl(item),
    duration: this.parseDuration(item.duration || item['itunes:duration']),
    releaseDate: new Date(item.pubDate || item.isoDate).toISOString(),
    imageUrl: this.extractEpisodeImage(item) || podcastImageUrl,
    guests: this.extractGuests(item.content || item.summary),
    tags: this.extractTags(item.categories)
  })) || []
}
```

### Data Validation & Sanitization

- Validate audio URLs are accessible
- Sanitize HTML from descriptions
- Parse duration to consistent format (MM:SS or HH:MM:SS)
- Handle missing or malformed data gracefully
- Deduplicate episodes by title/date combination

## 📊 Performance Considerations

### Optimization Strategies

1. **Batch Operations**: Store episodes in DynamoDB batches (25 max)
2. **Pagination**: Limit episode queries to 20-50 items per request
3. **Caching**: Cache episode lists in browser for 5-10 minutes
4. **Lazy Loading**: Load episodes only when user expands podcast
5. **Background Sync**: Sync episodes asynchronously after podcast addition

### Error Handling

- Graceful degradation when RSS feeds are unavailable
- Retry logic for failed RSS parsing
- User feedback for sync progress and errors
- Offline support for cached episodes

## 🚀 Success Metrics

### Technical Metrics

- [ ] Episode sync completes in <10 seconds for 50 episodes
- [ ] Episode loading (paginated) completes in <2 seconds
- [ ] Progress saving happens within 1 second
- [ ] 90%+ RSS feeds parse successfully

### User Experience Metrics

- [ ] User can play episodes immediately after adding podcast
- [ ] Playback position is preserved across sessions
- [ ] Episode list scrolls smoothly with pagination
- [ ] User sees clear feedback during sync process

### Quality Metrics

- [ ] All episode data fields properly populated
- [ ] Audio URLs are valid and playable
- [ ] Progress tracking accuracy within 5 seconds
- [ ] No duplicate episodes in database

---

**Implementation Priority**: Start with RSS episode extraction, then DynamoDB operations, then API handler, then frontend integration.

**Dependencies**: Existing podcast management system, DynamoDB tables already deployed.

**Estimated Timeline**: 4-5 days for complete implementation and testing.
