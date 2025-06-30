\# Rewind Recommendation Engine Specifications

## Overview
This document outlines the recommendation engine for Rewind, designed to help users aged 35\+ rediscover older podcast episodes, with a focus on comedy content. The engine uses AWS Personalize to provide tailored suggestions based on listening history, favorites, and guest preferences, integrating with the backend \(see BACKEND_API.md\) and database \(see DATABASE.md\).

## Setup
- **Service**: AWS Personalize
- **Dependencies**:
  \```
  npm install @aws-sdk/client-personalize @aws-sdk/client-personalize-events
  \```
- **Dataset Group**:
  - Name: `RewindDatasetGroup`
  - Datasets:
    - `users`: `userId`, `email` (from DynamoDB `USER#<userId>`).
    - `items`: `episodeId`, `podcastId`, `title`, `guests`, `duration`, `genre` (from DynamoDB `EPISODE#<episodeId>`).
    - `interactions`: `userId`, `episodeId`, `eventType` (play, favorite, like, dislike), `timestamp`, `lastListened` (from DynamoDB `HISTORY#<episodeId>#lastListened`).

## Logic
- **Algorithm**:
  - Recipe: SIMS (Similar Items) with time-based scoring.
  - Scoring Weights:
    - 1-2 weeks since last listened: 0.2
    - 2-4 weeks: 0.4
    - 1-3 months: 0.6
    - 3+ months: 0.8
    - +0.2 for favorites or comedy genre.
- **Recommendation Process**:
  - Query DynamoDB for user interactions via `RecommendationsIndex`.
  - Feed data to Personalize campaign for real-time recommendations.
  - Limit to 5 episodes, filtered by user preferences (e.g., “Not Recently Heard,” “Favorites,” “Favorite Guests”).
  - Generate simple text explanations (e.g., “Recommended because you haven’t listened in 3 months and this is a comedy episode”).
- **Feedback Integration**:
  - Store thumbs-up/thumbs-down via `POST /recommendations/feedback` (see BACKEND_API.md).
  - Update user profile in DynamoDB and trigger weekly Personalize retraining.
- **Fallback**:
  - If Personalize data is insufficient, suggest oldest episodes from subscribed podcasts.

## Implementation
- **Campaign Configuration**:
  - Solution: Trained weekly via EventBridge.
  - Campaign ARN exported for Lambda use (see AWS_CONFIG.md).
- **Lambda Integration** (`recommendationHandler`)**:
  - Fetch user data from DynamoDB.
  - Call Personalize `GetRecommendations` API.
  - Return JSON response with episode details.
- **API Endpoint**:
  - `GET /recommendations`: Query parameters `limit`, `filters` (e.g., `history,tech`).
  - Response: `\`[{ "id": "1", "title": "Test Episode", "podcastName": "Test Podcast", "releaseDate": "2023-01-15", "duration": "45 min", "audioUrl": "http://example.com/episode.mp3" }]\``。

## Testing
- **Unit Tests**:
  - Verify scoring logic and filter application (Vitest).
- **Integration Tests**:
  - Test Personalize API calls and fallback behavior.
- **UI Tests**:
  - Ensure recommendation cards display correctly in Storybook (see UI_TECH.md).

## Optimization
- **Performance**:
  - Cache recommendations in Lambda memory during execution.
  - Batch Personalize calls for multiple users.
  - Use DynamoDB for caching with TTL for recommendations.
- **Cost**:
  - Use free tier where available, batch inference for large datasets.
  - Consider simplified recommendation logic for MVP to reduce Personalize costs.

## Notes for AI Agent
- Configure Personalize datasets and campaign via AWS CDK (see AWS_CONFIG.md).
- Implement Lambda function with TypeScript.
- Test with sample data for comedy podcast focus.
- Commit changes to Git after setup.
- Report issues (e.g., Personalize cold start) in PLAN.md.

## References
- PLAN.md: Development milestones.
- UI_TECH.md: Frontend integration.
- BACKEND_API.md: Recommendation endpoint.
- BACKEND_LOGIC.md: Logic alignment.
- DATABASE.md: Data schema.
- AWS_CONFIG.md: Infrastructure setup.
