# Rewind Recommendation Engine Specifications

## Overview

The Rewind recommendation engine is designed to help users rediscover older episodes of their favorite podcasts, particularly comedy podcasts, when new content isn't available. The engine prioritizes episodes that users haven't listened to in a while, featuring favorite guests, and matching their listening patterns. This document outlines the algorithm design, AWS integration, and feedback loops.

## 🚧 Current Implementation Status

### ✅ Phase 1 - Foundation (Completed)

- ✅ Database schema designed for user behavior tracking
- ✅ Basic infrastructure setup with DynamoDB tables
- ✅ User authentication and podcast management

### 📋 Phase 2 - Basic Recommendations (Next Sprint)

- 📋 Simple recommendation algorithm without ML
- 📋 Episode age-based filtering (episodes > 1 month old)
- 📋 User listening history tracking
- 📋 Basic preference learning from user behavior

### 🔮 Phase 3 - Advanced ML (Future)

- 🔮 AWS Personalize integration for sophisticated recommendations
- 🔮 Guest-based recommendations for comedy podcasts
- 🔮 Listening pattern analysis and seasonal preferences
- 🔮 Real-time recommendation updates based on feedback

## Target Audience Focus

### Primary Users

- **Age**: 35+ tech-savvy adults
- **Behavior**: Subscribe to multiple podcasts, especially comedy
- **Pain Point**: Overwhelming new content, want to rediscover good older episodes
- **Preference**: Quality over quantity, familiar voices and guests

### Use Cases

1. **"Nothing New to Listen To"**: When current episodes are uninspiring
2. **"Nostalgia Mode"**: Want to revisit favorite episodes or series
3. **"Guest Discovery"**: Find episodes featuring favorite comedians or guests
4. **"Mood Matching"**: Episodes that match current listening mood/context

## 📋 Basic Recommendation Algorithm (Phase 2)

### Core Logic

```typescript
// Simplified recommendation scoring
function calculateRecommendationScore(episode: Episode, user: User): number {
  let score = 0

  // Age factor (older episodes preferred)
  const ageInDays = (Date.now() - episode.releaseDate) / (1000 * 60 * 60 * 24)
  if (ageInDays > 30) score += 0.3 // Bonus for episodes > 1 month old
  if (ageInDays > 180) score += 0.2 // Additional bonus for > 6 months old

  // Listening history factor
  const timeSinceLastPlayed = user.getTimeSinceLastPlayed(episode)
  if (timeSinceLastPlayed > 90) score += 0.4 // Haven't listened in 3+ months

  // Podcast preference factor
  const podcastEngagement = user.getPodcastEngagement(episode.podcastId)
  score += podcastEngagement * 0.3 // Weight by how much they like the podcast

  // Comedy bonus (target audience preference)
  if (episode.tags.includes('comedy')) score += 0.2

  return Math.min(score, 1.0) // Cap at 1.0
}
```

### Recommendation Categories

1. **Rediscovery**: Episodes user listened to 6+ months ago
2. **Missed Gems**: Highly-rated episodes user never played
3. **Guest Favorites**: Episodes featuring guests from user's favorite episodes
4. **Series Continuation**: Next episodes in series user partially completed

## 🔮 Advanced ML Algorithm (Phase 3)

### AWS Personalize Integration

#### Dataset Preparation

- **User Data**: Demographics, listening preferences, time patterns
- **Item Data**: Episode metadata, guest information, topic tags
- **Interaction Data**: Play events, completion rates, ratings, skip patterns

#### Model Training

```python
# Example AWS Personalize recipe usage
recipe_arn = "arn:aws:personalize:::recipe/aws-hrnn-metadata"

# Dataset schema optimized for podcast recommendations
schema = {
    "type": "record",
    "name": "Interactions",
    "fields": [
        {"name": "USER_ID", "type": "string"},
        {"name": "ITEM_ID", "type": "string"},
        {"name": "EVENT_TYPE", "type": "string"},
        {"name": "TIMESTAMP", "type": "long"},
        {"name": "COMPLETION_RATE", "type": "float"},
        {"name": "RATING", "type": "int"},
        {"name": "LISTENING_CONTEXT", "type": "string"}
    ]
}
```

### Advanced Features

1. **Temporal Patterns**: Learn when users prefer different types of content
2. **Guest Recognition**: Identify and recommend based on favorite guests
3. **Mood Detection**: Infer listening mood from recent behavior
4. **Social Signals**: Incorporate shared library preferences

## Data Collection Strategy

### Current Data Points (Phase 2)

- Episode play/pause events
- Completion rates and skip patterns
- Podcast add/remove actions
- Basic demographic info from Cognito

### Enhanced Data Points (Phase 3)

- Time-of-day listening patterns
- Device and context information
- Explicit feedback (thumbs up/down)
- Guest and topic preferences
- Seasonal listening trends

## Feedback Loop Implementation

### Implicit Feedback

- **Play Duration**: How long user listens to recommended episodes
- **Skip Rate**: How often users skip recommended content
- **Return Behavior**: Whether users return to recommended podcasts
- **Completion Rate**: Percentage of episode completed

### Explicit Feedback

- **Rating System**: 1-5 stars for episodes
- **Quick Feedback**: Thumbs up/down for recommendations
- **Preference Tags**: User-applied tags for categorization
- **Recommendation Explanation**: Why this episode was recommended

## Privacy and Ethics

### Data Handling

- **Anonymization**: Personal data anonymized for ML training
- **Consent**: Clear opt-in for data collection beyond basic usage
- **Transparency**: Users can see why episodes were recommended
- **Control**: Users can adjust recommendation preferences

### Algorithmic Fairness

- **Diversity**: Avoid creating filter bubbles
- **Discoverability**: Include serendipitous recommendations
- **Bias Prevention**: Monitor for gender, topic, or temporal biases
- **User Agency**: Allow users to influence recommendations

## Implementation Phases

### Phase 2: Basic Recommendations (Next 2-3 weeks)

```typescript
// Simple implementation in Lambda function
export const getRecommendations = async (userId: string, limit: number = 10) => {
  const userHistory = await getUserListeningHistory(userId)
  const userPodcasts = await getUserPodcasts(userId)

  const recommendations = []

  for (const podcast of userPodcasts) {
    const episodes = await getEpisodesNotRecentlyPlayed(podcast.id, userId, 30)
    const scored = episodes.map(ep => ({
      ...ep,
      score: calculateRecommendationScore(ep, userHistory),
    }))

    recommendations.push(...scored)
  }

  return recommendations.sort((a, b) => b.score - a.score).slice(0, limit)
}
```

### Phase 3: AWS Personalize Integration (Future)

```typescript
// Advanced ML-powered recommendations
export const getPersonalizedRecommendations = async (userId: string) => {
  const personalizeClient = new PersonalizeRuntimeClient({
    region: process.env.AWS_REGION,
  })

  const params = {
    campaignArn: process.env.PERSONALIZE_CAMPAIGN_ARN,
    userId: userId,
    numResults: 25,
    context: {
      CURRENT_TIME: new Date().toISOString(),
      DEVICE_TYPE: 'web',
      LISTENING_CONTEXT: 'discovery',
    },
  }

  const recommendations = await personalizeClient.getRecommendations(params)
  return recommendations.itemList
}
```

## Performance Considerations

### Caching Strategy

- **User Recommendations**: Cache for 4-6 hours
- **Popular Episodes**: Cache for 24 hours
- **Podcast Metadata**: Cache for 1 week
- **User Preferences**: Cache for 1 hour

### Scalability

- **Batch Processing**: Generate recommendations offline for active users
- **Real-time Updates**: Update recommendations based on immediate feedback
- **Database Optimization**: Efficient queries for large episode catalogs
- **CDN Integration**: Cache recommendations at edge locations

## Success Metrics

### Engagement Metrics

- **Recommendation Click-through Rate**: % of recommended episodes played
- **Completion Rate**: % of recommended episodes completed
- **Time Spent**: Average listening time on recommended content
- **Return Rate**: % of users who return to recommended podcasts

### Business Metrics

- **User Retention**: Weekly/monthly active users
- **Library Growth**: New podcasts added per user
- **Feature Adoption**: % of users regularly using recommendations
- **User Satisfaction**: NPS scores and explicit feedback ratings

## Testing Strategy

### A/B Testing Framework

- **Algorithm Variants**: Test different recommendation approaches
- **UI Variations**: Test different presentation formats
- **Explanation Styles**: Test different ways to explain recommendations
- **Feedback Mechanisms**: Test various feedback collection methods

### Quality Assurance

- **Diversity Testing**: Ensure recommendations don't become too narrow
- **Freshness Testing**: Verify mix of old and newer content
- **Bias Testing**: Check for demographic or content biases
- **Performance Testing**: Ensure recommendations load quickly

## Future Enhancements

### Advanced Features (Phase 4+)

- **Cross-podcast Discovery**: Recommend similar podcasts
- **Collaborative Filtering**: "Users like you also enjoyed..."
- **Seasonal Recommendations**: Holiday-themed or time-relevant content
- **Social Integration**: Recommendations from shared libraries
- **Voice Interface**: "Find me something funny to listen to"

### Integration Opportunities

- **Calendar Integration**: Recommend content based on schedule
- **Location Services**: Context-aware recommendations
- **Mood Detection**: Infer mood from listening patterns
- **Smart Home Integration**: Recommendations via Alexa/Google Home

## Notes for Implementation

### AI Agent Guidelines

- Start with simple algorithm in Phase 2, focusing on episode age and listening history
- Collect user interaction data from day one for future ML training
- Ensure recommendation explanations are clear and helpful
- Test recommendations with real podcast data before deployment
- Monitor user engagement and adjust algorithms based on feedback

### Development Priorities

1. **Phase 2**: Basic recommendation engine with simple scoring
2. **Data Collection**: Implement robust tracking for future ML training
3. **Feedback Systems**: Build easy ways for users to rate recommendations
4. **Performance**: Ensure recommendations load quickly and feel responsive
5. **Phase 3**: Evaluate AWS Personalize integration based on user data

## References

- [DATABASE.md](./DATABASE.md): User behavior tracking schema
- [BACKEND_API.md](./BACKEND_API.md): Recommendation endpoint specifications
- [UI_TECH.md](./UI_TECH.md): Frontend recommendation display components
- [PLAN.md](./PLAN.md): Implementation timeline and priorities
- [AWS_CONFIG.md](./AWS_CONFIG.md): AWS Personalize configuration details
