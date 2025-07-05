# Search Backend Implementation Plan

## Overview

This document outlines the implementation plan for the search functionality in the Rewind podcast app. The search feature will allow users to quickly find episodes from their podcast library, displaying results as episode cards with a serverless, cost-effective architecture.

## Current State Analysis

### ✅ Already Implemented
- **Search Page UI**: `/frontend/src/routes/search.tsx` with search input and results placeholder
- **Navigation Integration**: Search tab in bottom navigation bar
- **Episode Data Structure**: Episodes stored in DynamoDB with comprehensive metadata
- **Authentication**: Cognito-based user authentication
- **API Infrastructure**: REST API Gateway with Lambda functions
- **Episode Cards**: Existing episode card components for display

### ❌ Missing Implementation
- **Search API Endpoint**: No `/search` endpoint in backend
- **Search Service**: No search logic in backend services
- **Frontend Search Integration**: Search input not connected to API
- **Search Results Display**: Results not rendered as episode cards

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Search Page    │───▶│  Search API      │───▶│  DynamoDB       │
│  (Frontend)     │    │  (Lambda)        │    │  Episodes Table │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Search Service  │
                       │  (Backend Logic) │
                       └──────────────────┘
```

## Implementation Plan

### Phase 1: Backend Search API (High Priority)

#### 1.1 Create Search Handler
**File**: `backend/src/handlers/searchHandler.ts`

```typescript
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Handle GET /search endpoint
  // Extract query parameters: q (query), limit, offset
  // Call search service with user ID and query parameters
  // Return formatted search results
}
```

#### 1.2 Implement Search Service
**File**: `backend/src/services/searchService.ts`

**Search Strategy**: Use DynamoDB's native capabilities for cost-effective searching at low scale:

1. **Title Search**: Use DynamoDB Query with `begins_with` for exact matches
2. **Description Search**: Use DynamoDB Scan with `contains` filter for broader matches
3. **Combined Results**: Merge and rank results by relevance
4. **Caching**: Implement basic in-memory caching for repeated queries

```typescript
export class SearchService {
  async searchEpisodes(userId: string, query: string, limit: number = 20): Promise<SearchResult[]>
  async searchByTitle(userId: string, query: string): Promise<Episode[]>
  async searchByDescription(userId: string, query: string): Promise<Episode[]>
  private rankResults(results: Episode[], query: string): SearchResult[]
}
```

#### 1.3 DynamoDB Search Patterns

**Efficient Query Patterns**:
- **User Episodes**: Get all episodes for user's podcasts first (filtered by userId)
- **Title Search**: Use `FilterExpression` with `contains` function
- **Description Search**: Use `FilterExpression` with `contains` function
- **Guest Search**: Use existing `extractedGuests` field for guest-based searches

**Cost Optimization**:
- Use `ProjectionExpression` to return only necessary fields
- Implement pagination with `Limit` and `ExclusiveStartKey`
- Use `FilterExpression` to reduce data transfer

#### 1.4 Search Endpoint Integration
**File**: `backend/src/handlers/searchHandler.ts`

**API Endpoint**: `GET /search`
**Query Parameters**:
- `q`: Search query (required)
- `limit`: Number of results (default: 20, max: 50)
- `offset`: Pagination offset
- `type`: Search type ("episodes", "podcasts", "all")

**Response Format**:
```json
{
  "data": {
    "results": [
      {
        "episodeId": "ep123",
        "title": "Episode Title",
        "description": "Episode description...",
        "podcastName": "Podcast Name",
        "podcastId": "pod456",
        "releaseDate": "2023-01-15T08:00:00Z",
        "duration": "45:30",
        "audioUrl": "http://example.com/episode.mp3",
        "imageUrl": "http://example.com/image.jpg",
        "relevanceScore": 0.95,
        "matchType": "title"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### Phase 2: Frontend Search Integration (Medium Priority)

#### 2.1 Search Service Integration
**File**: `frontend/src/services/searchService.ts`

```typescript
export class SearchService {
  async searchEpisodes(query: string, limit?: number): Promise<SearchResponse>
  async searchPodcasts(query: string, limit?: number): Promise<SearchResponse>
}
```

#### 2.2 Search Page Enhancement
**File**: `frontend/src/routes/search.tsx`

**Features to Add**:
- Debounced search input (300ms delay)
- Loading states and error handling
- Search results display with episode cards
- Infinite scroll or pagination
- Search history (optional)
- Filter options (podcast, episode type)

#### 2.3 Search Results Component
**File**: `frontend/src/components/SearchResults.tsx`

**Features**:
- Reuse existing episode card component
- Display search relevance indicators
- Handle empty states
- Loading skeletons
- Error handling

### Phase 3: Advanced Search Features (Low Priority)

#### 3.1 Enhanced Search Capabilities
- **Guest Search**: Search episodes by guest names
- **Date Range Search**: Filter by release date
- **Duration Search**: Filter by episode length
- **Podcast-specific Search**: Search within specific podcasts
- **Tag Search**: Search by episode tags/categories

#### 3.2 Search Analytics
- **Search Metrics**: Track popular search terms
- **Performance Monitoring**: Search response times
- **Usage Analytics**: Search success rates

## Technical Implementation Details

### DynamoDB Search Implementation

#### Primary Search Strategy: User-Scoped Scan
```typescript
// Get all episodes for user's podcasts
const userPodcasts = await dynamoService.getPodcastsByUser(userId)
const podcastIds = userPodcasts.map(p => p.podcastId)

// Search across episodes using batch queries
const searchResults = []
for (const podcastId of podcastIds) {
  const episodes = await dynamoService.getEpisodesByPodcast(podcastId, 1000)
  const filtered = episodes.filter(episode => 
    episode.title.toLowerCase().includes(query.toLowerCase()) ||
    episode.description.toLowerCase().includes(query.toLowerCase())
  )
  searchResults.push(...filtered)
}
```

#### Optimization Strategies
1. **Parallel Queries**: Use `Promise.all()` for concurrent podcast searches
2. **Result Caching**: Cache search results for 5 minutes
3. **Progressive Loading**: Return partial results while still searching
4. **Index Optimization**: Consider GSI for frequently searched fields

### Cost Analysis

#### DynamoDB Costs (Low Scale)
- **On-demand Pricing**: $0.25 per million read requests
- **Typical Search**: 5-10 read requests per search
- **Monthly Cost**: ~$1-5 for 1000 searches/month

#### Lambda Costs
- **Execution Time**: ~200-500ms per search
- **Memory**: 512MB allocation sufficient
- **Monthly Cost**: ~$0.20 for 1000 searches/month

#### API Gateway Costs
- **Request Cost**: $3.50 per million requests
- **Monthly Cost**: ~$0.0035 for 1000 searches/month

**Total Monthly Cost**: ~$1-6 for 1000 searches (very low scale)

## Implementation Timeline

### Week 1: Core Backend Implementation
- [ ] Create `searchHandler.ts` with basic search endpoint
- [ ] Implement `searchService.ts` with DynamoDB search logic
- [ ] Add search route to API Gateway configuration
- [ ] Basic testing with Postman/curl

### Week 2: Frontend Integration
- [ ] Create `searchService.ts` frontend service
- [ ] Enhance search page with API integration
- [ ] Add loading states and error handling
- [ ] Implement search results display

### Week 3: Testing and Optimization
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Documentation updates

### Week 4: Advanced Features (Optional)
- [ ] Advanced search filters
- [ ] Search analytics
- [ ] Performance monitoring
- [ ] User experience improvements

## Risk Mitigation

### Performance Risks
- **Large Libraries**: DynamoDB scan operations can be expensive
- **Mitigation**: Implement pagination, result limits, and caching

### Cost Risks
- **Unexpected Usage**: High search volume could increase costs
- **Mitigation**: Implement rate limiting and monitoring

### Technical Risks
- **DynamoDB Limitations**: No full-text search capabilities
- **Mitigation**: Consider future migration to OpenSearch if needed

## Success Metrics

### Performance Metrics
- **Search Response Time**: < 500ms for 95% of requests
- **Search Accuracy**: > 90% relevant results in top 10
- **Error Rate**: < 1% of search requests fail

### Business Metrics
- **Search Usage**: Track daily/weekly search volume
- **User Engagement**: Time spent on search results
- **Content Discovery**: Episodes played from search results

## Future Considerations

### Scalability Path
1. **Phase 1**: DynamoDB native search (current plan)
2. **Phase 2**: Add ElasticSearch/OpenSearch for advanced search
3. **Phase 3**: AI-powered semantic search with embeddings

### Advanced Features
- **Fuzzy Search**: Handle typos and partial matches
- **Semantic Search**: Content-based similarity search
- **Voice Search**: Speech-to-text integration
- **Visual Search**: Image-based episode discovery

## Conclusion

This implementation plan provides a cost-effective, serverless search solution that leverages existing infrastructure while maintaining low operational overhead. The phased approach allows for quick delivery of core functionality while providing a path for future enhancements.

The DynamoDB-based approach is ideal for the current low-scale requirements and can easily evolve to more sophisticated search solutions as the application grows.