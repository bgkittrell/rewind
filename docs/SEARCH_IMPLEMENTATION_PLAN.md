# Search Backend Implementation Plan

## Overview

This document outlines the implementation plan for a serverless search backend that will enable users to quickly search through podcast episodes in their library. The solution is optimized for low cost at low scale while maintaining good performance.

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│ API Gateway │────▶│   Lambda    │────▶│  DynamoDB   │
│ Search Page │     │  /search    │     │   Handler   │     │   Tables    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ CloudWatch  │
                                        │   Logs      │
                                        └─────────────┘
```

## Implementation Approach

### 1. DynamoDB Search Strategy

Since DynamoDB doesn't support full-text search natively, we'll implement a multi-pronged approach:

#### Primary Strategy: Client-Side Filtering (Cost-Optimized)
- Fetch all episodes for user's podcasts
- Perform search filtering in Lambda function
- Return filtered results to frontend
- **Pros**: Zero additional cost, simple implementation
- **Cons**: Higher latency for users with large libraries

#### Future Enhancement: AWS OpenSearch (When Scale Justifies)
- Integrate AWS OpenSearch Service when user base grows
- Use DynamoDB Streams to sync data
- Provides full-text search capabilities
- **Trigger**: When average user has >1000 episodes

### 2. Search Implementation Details

#### Search Fields
- Episode title (primary)
- Episode description (secondary)
- Podcast title
- Guest names (if extracted)
- Tags

#### Search Features
- Case-insensitive matching
- Partial word matching
- Multi-term search (AND logic)
- Search result ranking by relevance

### 3. API Endpoint Design

```
GET /search?q={query}&limit={limit}&offset={offset}&podcastId={podcastId}
```

**Query Parameters:**
- `q` (required): Search query string
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `podcastId` (optional): Filter by specific podcast

**Response Format:**
```json
{
  "data": {
    "results": [
      {
        "episode": {
          "episodeId": "ep123",
          "podcastId": "pod456",
          "title": "Episode Title",
          "description": "Episode description",
          "audioUrl": "http://example.com/episode.mp3",
          "duration": "45:30",
          "releaseDate": "2023-01-15T08:00:00Z",
          "imageUrl": "http://example.com/image.jpg",
          "extractedGuests": ["John Doe"]
        },
        "podcast": {
          "podcastId": "pod456",
          "title": "Podcast Title",
          "imageUrl": "http://example.com/podcast.jpg"
        },
        "relevance": {
          "score": 0.95,
          "matchedFields": ["title", "description"],
          "highlights": {
            "title": "Episode <mark>Search Term</mark> Title",
            "description": "Description with <mark>search term</mark> highlighted"
          }
        }
      }
    ],
    "total": 42,
    "hasMore": true,
    "searchTime": 0.234
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/search"
}
```

### 4. Lambda Function Implementation

#### Search Handler Structure
```typescript
// searchHandler.ts
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // 1. Extract and validate search parameters
  // 2. Get user's podcasts
  // 3. Fetch all episodes for user's podcasts
  // 4. Perform search filtering and ranking
  // 5. Paginate results
  // 6. Return formatted response
}
```

#### Search Algorithm
1. **Tokenization**: Split search query into terms
2. **Normalization**: Lowercase, remove special characters
3. **Matching**: Check each term against searchable fields
4. **Scoring**: Calculate relevance score based on:
   - Title matches (weight: 3.0)
   - Description matches (weight: 1.0)
   - Guest matches (weight: 2.0)
   - Recency bonus (newer episodes score higher)
5. **Highlighting**: Mark matched terms in results

### 5. Performance Optimizations

#### Caching Strategy
- Cache user's episode list in Lambda memory (5-minute TTL)
- Use CloudFront for API caching (GET requests only)
- Cache invalidation on podcast/episode updates

#### Lambda Optimizations
- Memory: 512MB (balanced for performance/cost)
- Timeout: 10 seconds
- Reserved concurrency: Not needed at low scale
- ARM architecture for cost savings

#### Query Optimizations
- Parallel DynamoDB queries for multiple podcasts
- Batch get operations where possible
- Projection expressions to fetch only needed fields

### 6. Cost Analysis

#### At Low Scale (100 users, 50 episodes each)
- **Lambda**: ~$0.50/month (assuming 1000 searches/day)
- **API Gateway**: ~$3.50/month (1M requests)
- **DynamoDB**: Already covered by existing tables
- **CloudWatch**: ~$0.50/month
- **Total**: ~$4.50/month

#### Cost Optimization Strategies
- Use DynamoDB on-demand pricing
- No additional infrastructure needed
- Leverage existing tables and indexes
- API Gateway caching reduces Lambda invocations

### 7. Implementation Steps

#### Phase 1: Basic Search (Week 1)
1. Create `searchHandler.ts` Lambda function
2. Implement basic text matching algorithm
3. Add search endpoint to API Gateway
4. Update CDK infrastructure
5. Basic error handling and logging

#### Phase 2: Enhanced Search (Week 2)
1. Add relevance scoring
2. Implement search result highlighting
3. Add pagination support
4. Performance optimizations
5. Comprehensive testing

#### Phase 3: Advanced Features (Future)
1. Search filters (date range, duration)
2. Search history/suggestions
3. Fuzzy matching for typos
4. Search analytics

### 8. Technical Implementation

#### New Files to Create
1. `backend/src/handlers/searchHandler.ts` - Main search handler
2. `backend/src/services/searchService.ts` - Search logic
3. `backend/src/utils/searchUtils.ts` - Search utilities
4. `backend/src/types/search.ts` - Search type definitions

#### Infrastructure Updates
1. Update `rewind-backend-stack.ts` to add search endpoint
2. Grant Lambda permissions to read tables
3. Configure API Gateway route

#### Testing Strategy
1. Unit tests for search algorithm
2. Integration tests for API endpoint
3. Performance tests with various data sizes
4. E2E tests from frontend

### 9. Monitoring and Metrics

#### CloudWatch Metrics
- Search latency (p50, p90, p99)
- Search volume by user
- Error rates and types
- Lambda cold starts

#### Business Metrics
- Most searched terms
- Search success rate (clicks on results)
- Average results per search
- Search abandonment rate

### 10. Future Enhancements

#### When to Consider OpenSearch
- Average library size > 1000 episodes
- Search latency > 2 seconds
- User complaints about search quality
- Need for advanced features (typo tolerance, synonyms)

#### OpenSearch Migration Path
1. Set up OpenSearch domain
2. Create DynamoDB Streams
3. Lambda function to sync data
4. Gradual rollout with feature flag
5. Performance comparison

## Security Considerations

1. **Authentication**: All searches require valid JWT token
2. **Authorization**: Users can only search their own episodes
3. **Input Validation**: Sanitize search queries
4. **Rate Limiting**: Implement per-user rate limits
5. **Query Complexity**: Limit search query length

## Error Handling

1. **Empty Query**: Return 400 with helpful message
2. **No Results**: Return 200 with empty results array
3. **Database Errors**: Return 500 with generic message
4. **Timeout**: Return 504 with retry suggestion

## Conclusion

This implementation provides a cost-effective search solution optimized for low scale while maintaining good performance. The architecture allows for easy scaling and enhancement as the user base grows, with a clear migration path to more advanced search technologies when justified by scale.