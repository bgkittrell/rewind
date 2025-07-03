# Rewind Library Sharing Specifications

## Overview

The library sharing feature allows Rewind users to share their podcast libraries with friends and family, enabling easy discovery and one-click addition of recommended podcasts. Designed for the target audience of podcast enthusiasts aged 35+, this feature emphasizes simplicity, privacy, and seamless integration with the existing app experience.

## 🚧 Current Implementation Status

### ✅ Phase 1 - Foundation (Completed)

- ✅ Database schema designed for share links and metadata
- ✅ DynamoDB Shares table with TTL support
- ✅ Basic infrastructure setup for sharing functionality

### 📋 Phase 2 - Core Sharing (Planned for Phase 3)

- 📋 Generate shareable library URLs with expiration
- 📋 Public sharing pages for viewing shared libraries
- 📋 One-click podcast addition from shared libraries
- 📋 Basic privacy controls for sharing

### 🔮 Phase 3 - Advanced Sharing (Future)

- 🔮 Private sharing with access controls
- 🔮 Curated playlist sharing (specific episodes)
- 🔮 Social features and sharing analytics
- 🔮 Integration with social media platforms

## Target Audience & Use Cases

### Primary Use Cases

1. **Friend Recommendations**: "Check out these comedy podcasts I love"
2. **Family Sharing**: Parents sharing appropriate content with adult children
3. **Community Building**: Sharing within podcast enthusiast groups
4. **Discovery**: Finding new content through trusted networks

### User Stories

- "I want to share my comedy podcast collection with my friend"
- "My colleague recommended some business podcasts - I want to add them easily"
- "I want to show someone my podcast library without giving them account access"
- "I want to create a curated list for my book club"

## 📋 Core Sharing Flow (Phase 2)

### 1. Share Creation

```typescript
// Generate shareable library link
const createShare = async (userId: string, podcastIds: string[]) => {
  const shareId = generateUniqueId()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const shareData = {
    shareId,
    userId,
    podcastIds,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    viewCount: 0,
    addCount: 0,
  }

  await saveShareToDynamoDB(shareData)

  return {
    shareId,
    url: `https://rewindpodcast.com/share/${shareId}`,
    expiresAt,
  }
}
```

### 2. Share Viewing

- **Public Access**: No authentication required to view shared libraries
- **Responsive Design**: Mobile-optimized sharing pages
- **Podcast Previews**: Show podcast artwork, descriptions, and episode counts
- **Add to Library**: One-click addition for authenticated users

### 3. Import Process

```typescript
// Add podcasts from shared library
const addPodcastsFromShare = async (shareId: string, userId: string, selectedPodcastIds?: string[]) => {
  const shareData = await getShareFromDynamoDB(shareId)

  if (!shareData || new Date() > new Date(shareData.expiresAt)) {
    throw new Error('Share expired or not found')
  }

  const podcastsToAdd = selectedPodcastIds || shareData.podcastIds
  const results = {
    added: [],
    skipped: [],
    errors: [],
  }

  for (const podcastId of podcastsToAdd) {
    try {
      const podcast = await getPodcastMetadata(podcastId)
      const exists = await userHasPodcast(userId, podcast.rssUrl)

      if (!exists) {
        await addPodcastToUser(userId, podcast.rssUrl)
        results.added.push(podcast)
      } else {
        results.skipped.push(podcast)
      }
    } catch (error) {
      results.errors.push({ podcastId, error: error.message })
    }
  }

  // Update share analytics
  await updateShareAnalytics(shareId, 'add', results.added.length)

  return results
}
```

## Database Schema (Current Implementation)

### Shares Table ✅ DEPLOYED

```typescript
// DynamoDB table structure
interface ShareRecord {
  shareId: string // Partition key
  userId: string // User who created the share
  podcastIds: string[] // Array of podcast IDs being shared
  createdAt: string // ISO timestamp
  expiresAt: string // ISO timestamp (TTL attribute)
  viewCount?: number // Analytics: how many times viewed
  addCount?: number // Analytics: how many podcasts added from share
  title?: string // Optional custom title for share
  description?: string // Optional description
}
```

### Future Enhancements Schema

```typescript
// Planned additions for Phase 3
interface EnhancedShareRecord extends ShareRecord {
  isPrivate: boolean // Privacy control
  allowedUsers?: string[] // For private shares
  accessCode?: string // Optional password protection
  episodeIds?: string[] // For episode-specific sharing
  tags?: string[] // Categorization tags
  analytics: {
    views: ShareView[] // Detailed view tracking
    additions: ShareAddition[]
  }
}

interface ShareView {
  timestamp: string
  userAgent?: string
  referrer?: string
}

interface ShareAddition {
  timestamp: string
  userId: string
  podcastIds: string[]
}
```

## API Endpoints (Planned)

### Share Management

```typescript
// Create a new share
POST /shares
{
  "podcastIds": ["podcast1", "podcast2"],
  "title": "My Comedy Favorites",
  "description": "Great podcasts for commuting",
  "expiresInDays": 7,
  "isPrivate": false
}

// Get shared library (public endpoint)
GET /shares/{shareId}
// Returns podcast metadata and share information

// Add podcasts from share
POST /shares/{shareId}/add
{
  "selectedPodcastIds": ["podcast1"] // Optional, defaults to all
}

// Get user's created shares
GET /user/shares
// Returns list of shares created by the authenticated user

// Update share settings
PUT /shares/{shareId}
{
  "title": "Updated Title",
  "expiresInDays": 14
}

// Delete share
DELETE /shares/{shareId}
```

## Frontend Implementation (Planned)

### Share Creation UI

```typescript
// Share modal component
const ShareLibraryModal = () => {
  const [selectedPodcasts, setSelectedPodcasts] = useState<string[]>([]);
  const [shareTitle, setShareTitle] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);

  const handleCreateShare = async () => {
    const share = await createShare({
      podcastIds: selectedPodcasts,
      title: shareTitle,
      expiresInDays
    });

    // Show shareable URL
    setShareUrl(`https://rewindpodcast.com/share/${share.shareId}`);
  };

  return (
    <Modal>
      <PodcastSelector
        podcasts={userPodcasts}
        selected={selectedPodcasts}
        onChange={setSelectedPodcasts}
      />
      <input
        placeholder="Share title (optional)"
        value={shareTitle}
        onChange={(e) => setShareTitle(e.target.value)}
      />
      <select
        value={expiresInDays}
        onChange={(e) => setExpiresInDays(Number(e.target.value))}
      >
        <option value={1}>1 day</option>
        <option value={7}>1 week</option>
        <option value={30}>1 month</option>
      </select>
      <button onClick={handleCreateShare}>Create Share</button>
    </Modal>
  );
};
```

### Shared Library Viewing Page

```typescript
// Public share viewing component
const SharedLibraryPage = ({ shareId }: { shareId: string }) => {
  const [shareData, setShareData] = useState(null);
  const [selectedPodcasts, setSelectedPodcasts] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    loadShareData(shareId).then(setShareData);
  }, [shareId]);

  const handleAddSelected = async () => {
    if (!user) {
      // Redirect to login with return URL
      redirectToLogin(`/share/${shareId}`);
      return;
    }

    const result = await addPodcastsFromShare(shareId, selectedPodcasts);
    showSuccessMessage(`Added ${result.added.length} podcasts to your library`);
  };

  return (
    <div className="shared-library-page">
      <h1>{shareData?.title || 'Shared Podcast Library'}</h1>
      <p>{shareData?.description}</p>

      <PodcastGrid
        podcasts={shareData?.podcasts}
        selectable={true}
        selected={selectedPodcasts}
        onSelectionChange={setSelectedPodcasts}
      />

      {user ? (
        <button onClick={handleAddSelected}>
          Add Selected to My Library ({selectedPodcasts.length})
        </button>
      ) : (
        <button onClick={() => redirectToLogin(`/share/${shareId}`)}>
          Sign in to Add Podcasts
        </button>
      )}
    </div>
  );
};
```

## Privacy & Security Considerations

### Current Security Measures

- **URL-based Security**: Long, unguessable share IDs
- **Time-limited Access**: Automatic expiration via DynamoDB TTL
- **No Authentication Required**: Public viewing without exposing user data
- **Rate Limiting**: Prevent abuse of share creation/viewing

### Planned Security Enhancements

- **Private Shares**: Password protection or user-specific access
- **Access Logging**: Track who accessed shared libraries
- **Abuse Prevention**: Report inappropriate shared content
- **Content Filtering**: Ensure shared podcasts meet community guidelines

## Analytics & Insights

### Share Creator Analytics

- **View Count**: How many people viewed the shared library
- **Addition Count**: How many podcasts were added from the share
- **Popular Podcasts**: Which shared podcasts were added most often
- **Geographic Distribution**: Where shares were accessed (if available)

### Platform Analytics

- **Sharing Adoption**: What percentage of users create shares
- **Viral Coefficient**: Average number of podcasts added per share
- **Content Discovery**: Most shared and added podcasts
- **User Engagement**: Impact of sharing on user retention

## Testing Strategy

### Unit Tests

- Share creation and expiration logic
- Podcast addition from shares
- Analytics tracking accuracy
- Privacy and access control validation

### Integration Tests

- End-to-end sharing workflow
- Cross-user podcast addition
- Share URL generation and validation
- Database consistency checks

### User Experience Tests

- Mobile sharing experience
- Share page load performance
- Podcast addition feedback
- Error handling and edge cases

## Future Enhancements (Phase 3+)

### Advanced Features

- **Curated Playlists**: Share specific episodes, not just podcasts
- **Social Integration**: Share to Twitter, Facebook, Reddit
- **Collaborative Playlists**: Multiple users contributing to shared lists
- **Recommendation Context**: Explain why you're sharing specific podcasts

### Integration Opportunities

- **External Platforms**: Import/export to Spotify, Apple Podcasts
- **QR Codes**: Generate QR codes for easy mobile sharing
- **Email Integration**: Send shares via email with rich previews
- **Calendar Integration**: Share podcast recommendations for specific events

### Community Features

- **Public Library**: Opt-in to make library discoverable
- **Trending Shares**: Popular shared libraries in different categories
- **Follow Users**: Subscribe to shares from trusted curators
- **Community Ratings**: Rate and review shared libraries

## Performance Considerations

### Caching Strategy

- **Share Metadata**: Cache for 1 hour (frequent updates)
- **Podcast Details**: Cache for 24 hours (less frequent changes)
- **Share Analytics**: Update asynchronously to avoid blocking

### Scalability

- **CDN Integration**: Cache shared library pages globally
- **Batch Operations**: Efficient podcast addition for large shares
- **Database Optimization**: Efficient queries for share analytics
- **Background Processing**: Handle share creation/updates asynchronously

## Implementation Roadmap

### Phase 2 (Immediate - Next Sprint)

1. **Basic Share Creation**: Generate shareable URLs for podcast collections
2. **Public Viewing Pages**: Mobile-optimized pages for viewing shared libraries
3. **One-click Addition**: Authenticated users can add podcasts to their library
4. **Basic Analytics**: Track view and addition counts

### Phase 3 (Advanced Features)

1. **Privacy Controls**: Private shares with access restrictions
2. **Enhanced Analytics**: Detailed insights for share creators
3. **Social Integration**: Share to external platforms
4. **Curated Content**: Episode-level sharing capabilities

### Phase 4 (Community Features)

1. **Public Discovery**: Browse trending and popular shared libraries
2. **User Following**: Subscribe to shares from favorite curators
3. **Community Ratings**: Rate and review shared content
4. **Advanced Personalization**: AI-powered share recommendations

## Notes for Implementation

### AI Agent Guidelines

- Focus on core sharing functionality first (URL generation and viewing)
- Ensure mobile-optimized experience for shared library pages
- Implement proper analytics tracking from day one
- Test sharing flow with various podcast library sizes
- Consider accessibility in shared page design

### Development Priorities

1. **Core Functionality**: Basic share creation and viewing
2. **User Experience**: Smooth, intuitive sharing workflow
3. **Performance**: Fast loading shared library pages
4. **Analytics**: Track sharing success and engagement
5. **Security**: Prevent abuse while maintaining ease of use

## References

- [DATABASE.md](./DATABASE.md): Share table schema and relationships
- [BACKEND_API.md](./BACKEND_API.md): Sharing endpoint specifications
- [UI_TECH.md](./UI_TECH.md): Frontend component implementation
- [PLAN.md](./PLAN.md): Implementation timeline and priorities
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md): CDN and caching strategies
