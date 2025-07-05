# Rewind Recommendation Engine Implementation Plan

## Overview

This document outlines the implementation plan for Rewind's recommendation engine, designed to help users rediscover episodes from their podcast library based on listening patterns, guest preferences, and episode characteristics. The engine will use AWS Bedrock for guest extraction and implement a multi-factor ranking system.

## User Requirements Analysis

### Core Ranking Factors

1. **Recent Show Listening**: Episodes from shows the user has listened to recently
2. **New Episode Discovery**: Episodes the user hasn't listened to yet
3. **Rediscovery**: Episodes the user hasn't listened to in a while
4. **Guest Matching**: Episodes featuring guests from other episodes the user liked
5. **Favorites**: Episodes the user has favorited

### Guest Extraction Requirements

- Use AWS Bedrock to analyze episode titles and descriptions
- Extract guest names using AI/ML prompts
- Store extracted guest information for recommendation matching

## Implementation Phases

### Phase 1: Database Schema Enhancement (Week 1)
**Status**: 🚧 Ready to Start

#### 1.1 Add Guest Extraction Fields
Add fields to the `Episodes` table to support guest extraction:

```typescript
// Additional fields for Episodes table
interface EpisodeExtended {
  // ... existing fields ...
  extractedGuests: string[];           // AI-extracted guest names
  guestExtractionStatus: 'pending' | 'completed' | 'failed';
  guestExtractionDate: string;        // ISO timestamp
  guestExtractionConfidence: number;  // 0-1 confidence score
  rawGuestData: string;               // Raw AI response for debugging
}
```

#### 1.2 Create Guest Analytics Table
New table to track guest popularity and user preferences:

```typescript
// New table: RewindGuestAnalytics
interface GuestAnalytics {
  userId: string;                     // Partition key
  guestName: string;                  // Sort key
  episodeIds: string[];               // Episodes featuring this guest
  listenCount: number;                // Times user listened to this guest
  favoriteCount: number;              // Times user favorited episodes with this guest
  lastListenDate: string;             // Last time user listened to this guest
  averageRating: number;              // Average rating for episodes with this guest
  createdAt: string;
  updatedAt: string;
}
```

#### 1.3 Update UserFavorites Table
Ensure the UserFavorites table (currently planned) is implemented:

```typescript
// UserFavorites table implementation
interface UserFavorites {
  userId: string;                     // Partition key
  itemId: string;                     // Sort key (episodeId)
  itemType: 'episode' | 'podcast';   // Type of favorited item
  isFavorite: boolean;                // Whether item is favorited
  rating: number;                     // User rating (1-5)
  favoritedAt: string;                // When favorited
  createdAt: string;
  updatedAt: string;
}
```

### Phase 2: AWS Bedrock Integration (Week 2)
**Status**: 🚧 Ready to Start

#### 2.1 Set Up AWS Bedrock Service
Configure AWS Bedrock in the CDK stack:

```typescript
// Add to RewindBackendStack
const bedrockRole = new iam.Role(this, 'BedrockRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  inlinePolicies: {
    BedrockPolicy: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'bedrock:InvokeModel',
            'bedrock:InvokeModelWithResponseStream'
          ],
          resources: [
            `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
            `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`
          ]
        })
      ]
    })
  }
});
```

#### 2.2 Create Guest Extraction Lambda
New Lambda function for guest extraction:

```typescript
// backend/src/handlers/guestExtractionHandler.ts
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

interface GuestExtractionRequest {
  episodeId: string;
  title: string;
  description: string;
}

const GUEST_EXTRACTION_PROMPT = `
You are a podcast episode analyzer. Your task is to extract guest names from podcast episode titles and descriptions.

Rules:
1. Extract only actual guest names (people), not companies or organizations
2. Don't include the host names (unless they're clearly guests on another show)
3. Look for patterns like "with [Name]", "featuring [Name]", "guest: [Name]", etc.
4. Return names in a structured format
5. If no guests are found, return an empty array

Episode Title: {title}
Episode Description: {description}

Please analyze this episode and return a JSON object with the following structure:
{
  "guests": ["Guest Name 1", "Guest Name 2"],
  "confidence": 0.85,
  "reasoning": "Brief explanation of why these names were identified as guests"
}

Return only the JSON object, no additional text.
`;

export const extractGuests = async (episode: GuestExtractionRequest): Promise<GuestExtractionResult> => {
  const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
  
  const prompt = GUEST_EXTRACTION_PROMPT
    .replace('{title}', episode.title)
    .replace('{description}', episode.description);

  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  try {
    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponse = responseBody.content[0].text;
    
    // Parse the JSON response from Claude
    const result = JSON.parse(aiResponse);
    
    return {
      guests: result.guests || [],
      confidence: result.confidence || 0,
      reasoning: result.reasoning || '',
      rawResponse: aiResponse
    };
  } catch (error) {
    console.error('Guest extraction failed:', error);
    return {
      guests: [],
      confidence: 0,
      reasoning: 'Extraction failed',
      rawResponse: ''
    };
  }
};
```

#### 2.3 Create Guest Extraction Pipeline
Event-driven pipeline to process episodes:

```typescript
// backend/src/handlers/guestExtractionPipeline.ts
export const processGuestExtraction = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    if (record.eventName === 'INSERT' && record.dynamodb?.NewImage) {
      const episode = unmarshallDynamoDBRecord(record.dynamodb.NewImage);
      
      // Only process episodes that haven't been processed yet
      if (episode.guestExtractionStatus !== 'completed') {
        try {
          const extractionResult = await extractGuests({
            episodeId: episode.episodeId,
            title: episode.title,
            description: episode.description
          });
          
          // Update episode with extracted guests
          await updateEpisodeWithGuests(episode.episodeId, extractionResult);
          
          // Update user guest analytics
          await updateGuestAnalytics(episode.userId, extractionResult.guests);
          
        } catch (error) {
          console.error('Guest extraction pipeline failed:', error);
          await markExtractionAsFailed(episode.episodeId);
        }
      }
    }
  }
};
```

### Phase 3: Recommendation Algorithm (Week 3)
**Status**: 🚧 Ready to Start

#### 3.1 Core Recommendation Logic
Implement multi-factor scoring algorithm:

```typescript
// backend/src/services/recommendationService.ts
interface RecommendationScore {
  episodeId: string;
  episode: Episode;
  score: number;
  reasons: string[];
  factors: {
    recentShowListening: number;
    newEpisodeBonus: number;
    rediscoveryBonus: number;
    guestMatchBonus: number;
    favoriteBonus: number;
  };
}

export class RecommendationService {
  
  async generateRecommendations(userId: string, limit: number = 10): Promise<RecommendationScore[]> {
    // Get user's listening history
    const listeningHistory = await this.getUserListeningHistory(userId);
    
    // Get user's podcasts
    const userPodcasts = await this.getUserPodcasts(userId);
    
    // Get user's favorites
    const userFavorites = await this.getUserFavorites(userId);
    
    // Get user's guest preferences
    const guestPreferences = await this.getUserGuestPreferences(userId);
    
    // Get all episodes from user's library
    const allEpisodes = await this.getAllEpisodesFromLibrary(userPodcasts);
    
    // Score each episode
    const scoredEpisodes = await Promise.all(
      allEpisodes.map(episode => this.scoreEpisode(
        episode,
        userId,
        listeningHistory,
        userFavorites,
        guestPreferences
      ))
    );
    
    // Sort by score and return top recommendations
    return scoredEpisodes
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  private async scoreEpisode(
    episode: Episode,
    userId: string,
    listeningHistory: ListeningHistory[],
    userFavorites: UserFavorites[],
    guestPreferences: GuestAnalytics[]
  ): Promise<RecommendationScore> {
    
    let score = 0;
    const reasons: string[] = [];
    const factors = {
      recentShowListening: 0,
      newEpisodeBonus: 0,
      rediscoveryBonus: 0,
      guestMatchBonus: 0,
      favoriteBonus: 0
    };
    
    // Factor 1: Recent show listening (0-0.3 points)
    const recentListening = this.calculateRecentShowListening(episode, listeningHistory);
    factors.recentShowListening = recentListening;
    score += recentListening;
    if (recentListening > 0.15) {
      reasons.push(`You've been listening to ${episode.podcastTitle} recently`);
    }
    
    // Factor 2: New episode bonus (0-0.4 points)
    const newEpisodeBonus = this.calculateNewEpisodeBonus(episode, listeningHistory);
    factors.newEpisodeBonus = newEpisodeBonus;
    score += newEpisodeBonus;
    if (newEpisodeBonus > 0.2) {
      reasons.push(`This is a new episode you haven't heard`);
    }
    
    // Factor 3: Rediscovery bonus (0-0.4 points)
    const rediscoveryBonus = this.calculateRediscoveryBonus(episode, listeningHistory);
    factors.rediscoveryBonus = rediscoveryBonus;
    score += rediscoveryBonus;
    if (rediscoveryBonus > 0.2) {
      reasons.push(`You haven't listened to this episode in a while`);
    }
    
    // Factor 4: Guest matching (0-0.5 points)
    const guestMatchBonus = this.calculateGuestMatchBonus(episode, guestPreferences);
    factors.guestMatchBonus = guestMatchBonus;
    score += guestMatchBonus;
    if (guestMatchBonus > 0.2) {
      const matchedGuests = this.getMatchedGuests(episode, guestPreferences);
      reasons.push(`Features ${matchedGuests.join(', ')}, who you've enjoyed before`);
    }
    
    // Factor 5: Favorite bonus (0-0.3 points)
    const favoriteBonus = this.calculateFavoriteBonus(episode, userFavorites);
    factors.favoriteBonus = favoriteBonus;
    score += favoriteBonus;
    if (favoriteBonus > 0.15) {
      reasons.push(`You've favorited this episode`);
    }
    
    return {
      episodeId: episode.episodeId,
      episode,
      score: Math.min(score, 1.0), // Cap at 1.0
      reasons,
      factors
    };
  }
  
  private calculateRecentShowListening(episode: Episode, listeningHistory: ListeningHistory[]): number {
    const recentListening = listeningHistory.filter(history => 
      history.podcastId === episode.podcastId &&
      this.isWithinDays(history.lastPlayed, 7) // Within last 7 days
    );
    
    const recentListeningCount = recentListening.length;
    return Math.min(recentListeningCount * 0.1, 0.3); // Max 0.3 points
  }
  
  private calculateNewEpisodeBonus(episode: Episode, listeningHistory: ListeningHistory[]): number {
    const hasListened = listeningHistory.some(history => 
      history.episodeId === episode.episodeId
    );
    
    if (!hasListened) {
      // Higher bonus for newer episodes
      const daysSinceRelease = this.daysSince(episode.releaseDate);
      if (daysSinceRelease <= 30) {
        return 0.4; // New episode from last 30 days
      } else if (daysSinceRelease <= 90) {
        return 0.3; // Episode from last 90 days
      } else {
        return 0.2; // Older unheard episode
      }
    }
    
    return 0;
  }
  
  private calculateRediscoveryBonus(episode: Episode, listeningHistory: ListeningHistory[]): number {
    const episodeHistory = listeningHistory.find(history => 
      history.episodeId === episode.episodeId
    );
    
    if (episodeHistory) {
      const daysSinceLastPlayed = this.daysSince(episodeHistory.lastPlayed);
      
      if (daysSinceLastPlayed >= 180) {
        return 0.4; // Haven't listened in 6+ months
      } else if (daysSinceLastPlayed >= 90) {
        return 0.3; // Haven't listened in 3+ months
      } else if (daysSinceLastPlayed >= 30) {
        return 0.2; // Haven't listened in 1+ months
      }
    }
    
    return 0;
  }
  
  private calculateGuestMatchBonus(episode: Episode, guestPreferences: GuestAnalytics[]): number {
    if (!episode.extractedGuests || episode.extractedGuests.length === 0) {
      return 0;
    }
    
    let totalBonus = 0;
    
    for (const guest of episode.extractedGuests) {
      const guestPreference = guestPreferences.find(pref => 
        pref.guestName.toLowerCase() === guest.toLowerCase()
      );
      
      if (guestPreference) {
        // Calculate bonus based on how much user likes this guest
        const guestScore = Math.min(
          (guestPreference.listenCount * 0.05) + 
          (guestPreference.favoriteCount * 0.1) + 
          (guestPreference.averageRating * 0.1),
          0.25 // Max per guest
        );
        
        totalBonus += guestScore;
      }
    }
    
    return Math.min(totalBonus, 0.5); // Max 0.5 total guest bonus
  }
  
  private calculateFavoriteBonus(episode: Episode, userFavorites: UserFavorites[]): number {
    const isFavorited = userFavorites.some(fav => 
      fav.itemId === episode.episodeId && fav.isFavorite
    );
    
    if (isFavorited) {
      return 0.3; // Significant bonus for favorited episodes
    }
    
    return 0;
  }
  
  // Helper methods
  private isWithinDays(dateString: string, days: number): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  }
  
  private daysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  private getMatchedGuests(episode: Episode, guestPreferences: GuestAnalytics[]): string[] {
    if (!episode.extractedGuests) return [];
    
    return episode.extractedGuests.filter(guest => 
      guestPreferences.some(pref => 
        pref.guestName.toLowerCase() === guest.toLowerCase()
      )
    );
  }
}
```

### Phase 4: API Integration (Week 4)
**Status**: 🚧 Ready to Start

#### 4.1 Recommendation Endpoint
Update the recommendation handler:

```typescript
// backend/src/handlers/recommendationHandler.ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { RecommendationService } from '../services/recommendationService';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = event.requestContext.authorizer?.jwt?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    const limit = parseInt(event.queryStringParameters?.limit || '10');
    const filters = event.queryStringParameters?.filters?.split(',') || [];
    
    const recommendationService = new RecommendationService();
    const recommendations = await recommendationService.generateRecommendations(userId, limit);
    
    // Apply filters if specified
    const filteredRecommendations = applyFilters(recommendations, filters);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          recommendations: filteredRecommendations.map(rec => ({
            episodeId: rec.episodeId,
            title: rec.episode.title,
            podcastName: rec.episode.podcastTitle,
            podcastId: rec.episode.podcastId,
            releaseDate: rec.episode.releaseDate,
            duration: rec.episode.duration,
            audioUrl: rec.episode.audioUrl,
            imageUrl: rec.episode.imageUrl,
            description: rec.episode.description,
            guests: rec.episode.extractedGuests || [],
            reason: rec.reasons.join('. '),
            confidence: rec.score,
            factors: rec.factors
          })),
          total: filteredRecommendations.length
        },
        timestamp: new Date().toISOString(),
        path: event.rawPath
      })
    };
    
  } catch (error) {
    console.error('Recommendation generation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          message: 'Failed to generate recommendations',
          code: 'RECOMMENDATION_ERROR'
        }
      })
    };
  }
};

function applyFilters(recommendations: RecommendationScore[], filters: string[]): RecommendationScore[] {
  let filtered = recommendations;
  
  if (filters.includes('not_recent')) {
    filtered = filtered.filter(rec => rec.factors.rediscoveryBonus > 0);
  }
  
  if (filters.includes('favorites')) {
    filtered = filtered.filter(rec => rec.factors.favoriteBonus > 0);
  }
  
  if (filters.includes('guests')) {
    filtered = filtered.filter(rec => rec.factors.guestMatchBonus > 0);
  }
  
  if (filters.includes('new')) {
    filtered = filtered.filter(rec => rec.factors.newEpisodeBonus > 0);
  }
  
  return filtered;
}
```

#### 4.2 Guest Management Endpoints
New endpoints for guest management:

```typescript
// POST /v1/episodes/{episodeId}/guests/extract
// GET /v1/users/{userId}/guests/preferences
// PUT /v1/users/{userId}/guests/{guestName}/preference
```

### Phase 5: Frontend Integration (Week 5)
**Status**: 🚧 Ready to Start

#### 5.1 Recommendation Display Component
Create React component for displaying recommendations:

```typescript
// frontend/src/components/RecommendationCard.tsx
interface RecommendationCardProps {
  recommendation: {
    episodeId: string;
    title: string;
    podcastName: string;
    releaseDate: string;
    duration: string;
    imageUrl: string;
    reason: string;
    confidence: number;
    guests: string[];
    factors: {
      recentShowListening: number;
      newEpisodeBonus: number;
      rediscoveryBonus: number;
      guestMatchBonus: number;
      favoriteBonus: number;
    };
  };
  onPlay: (episodeId: string) => void;
  onFavorite: (episodeId: string) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ 
  recommendation, 
  onPlay, 
  onFavorite 
}) => {
  const formatConfidence = (confidence: number) => {
    return Math.round(confidence * 100);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-start space-x-4">
        <img 
          src={recommendation.imageUrl} 
          alt={recommendation.title}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{recommendation.title}</h3>
          <p className="text-gray-600 text-sm mb-2">{recommendation.podcastName}</p>
          
          {/* Reason for recommendation */}
          <p className="text-sm text-blue-600 mb-3">{recommendation.reason}</p>
          
          {/* Guests */}
          {recommendation.guests.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-gray-500">Guests: </span>
              {recommendation.guests.map(guest => (
                <span key={guest} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-1">
                  {guest}
                </span>
              ))}
            </div>
          )}
          
          {/* Confidence score */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Match: {formatConfidence(recommendation.confidence)}%
            </span>
            <div className="flex space-x-2">
              <button 
                onClick={() => onPlay(recommendation.episodeId)}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600"
              >
                Play
              </button>
              <button 
                onClick={() => onFavorite(recommendation.episodeId)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm hover:bg-gray-300"
              >
                ♥
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### 5.2 Recommendation Service
Frontend service for API calls:

```typescript
// frontend/src/services/recommendationService.ts
export interface RecommendationFilters {
  not_recent?: boolean;
  favorites?: boolean;
  guests?: boolean;
  new?: boolean;
}

export class RecommendationService {
  private baseUrl = import.meta.env.VITE_API_URL;
  
  async getRecommendations(
    limit: number = 10, 
    filters: RecommendationFilters = {}
  ): Promise<RecommendationResponse> {
    const filterString = Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([key, _]) => key)
      .join(',');
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(filterString && { filters: filterString })
    });
    
    const response = await fetch(`${this.baseUrl}/v1/recommendations?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch recommendations');
    }
    
    return await response.json();
  }
  
  async submitFeedback(episodeId: string, feedback: {
    type: 'like' | 'dislike' | 'favorite';
    rating?: number;
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/episodes/${episodeId}/feedback`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedback)
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit feedback');
    }
  }
  
  private getAuthToken(): string {
    // Get token from auth context
    return localStorage.getItem('authToken') || '';
  }
}
```

## Implementation Timeline

### Week 1: Database Setup
- [ ] Update Episodes table schema with guest extraction fields
- [ ] Create GuestAnalytics table
- [ ] Implement UserFavorites table
- [ ] Update CDK stack and deploy

### Week 2: AWS Bedrock Integration
- [ ] Set up AWS Bedrock permissions in CDK
- [ ] Create guest extraction Lambda function
- [ ] Implement guest extraction pipeline
- [ ] Create batch processing for existing episodes

### Week 3: Recommendation Algorithm
- [ ] Implement RecommendationService class
- [ ] Create scoring algorithms for all 5 factors
- [ ] Add user preference tracking
- [ ] Implement recommendation caching

### Week 4: API Integration
- [ ] Update recommendation endpoint
- [ ] Create guest management endpoints
- [ ] Add recommendation filters
- [ ] Implement feedback collection

### Week 5: Frontend Integration
- [ ] Create recommendation display components
- [ ] Implement recommendation service
- [ ] Add recommendation filters to UI
- [ ] Integrate with existing player

## Success Metrics

### Technical Metrics
- [ ] Guest extraction accuracy > 85%
- [ ] Recommendation API response time < 500ms
- [ ] Recommendation cache hit rate > 90%
- [ ] Guest extraction cost < $0.01 per episode

### User Engagement Metrics
- [ ] Recommendation click-through rate > 25%
- [ ] Episode completion rate for recommendations > 60%
- [ ] User return rate for recommendations > 40%
- [ ] Average session time increase > 20%

## Costs and Considerations

### AWS Bedrock Costs
- **Claude 3 Haiku**: ~$0.0025 per 1,000 tokens
- **Estimated cost per episode**: $0.005-$0.01 (depending on description length)
- **Monthly cost for 10,000 episodes**: $50-$100

### Performance Optimizations
- Batch process episodes during off-peak hours
- Cache guest extraction results
- Use DynamoDB streams for real-time updates
- Implement recommendation pre-computation

### Security Considerations
- Validate all episode data before processing
- Implement rate limiting for extraction API
- Secure Bedrock API access with proper IAM roles
- Monitor and log all AI interactions

## Future Enhancements

### Phase 6: Advanced Features
- [ ] Seasonal recommendation adjustments
- [ ] Cross-podcast guest discovery
- [ ] Sentiment analysis of episode descriptions
- [ ] Voice-based recommendation interface

### Phase 7: ML Optimization
- [ ] A/B testing for recommendation algorithms
- [ ] User behavior prediction
- [ ] Personalized ranking models
- [ ] Real-time recommendation updates

## Getting Started

1. **Review Current State**: Ensure all Phase 1 infrastructure is deployed
2. **Set Priorities**: Focus on guest extraction pipeline first
3. **Incremental Development**: Build and test each component separately
4. **Monitor Costs**: Track AWS Bedrock usage during development
5. **Gather Feedback**: Test with real podcast data early and often

This plan provides a comprehensive roadmap for implementing the recommendation engine with all requested features while maintaining scalability and cost efficiency.