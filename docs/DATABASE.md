# Rewind Database Schema Specifications

## Overview

This document defines the DynamoDB schema for the Rewind backend, a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+. The schema supports user management, podcast storage, episode tracking, listening history, and library sharing, integrating with the API (see BACKEND_API.md) and business logic (see BACKEND_LOGIC.md).

## Database Configuration

- **Engine**: Amazon DynamoDB
- **Access**: Managed via AWS SDK v3 with IAM roles
- **Billing Mode**: Pay-per-request (on-demand)
- **Backup**: Point-in-time recovery enabled
- **Encryption**: AWS managed encryption enabled
- **Region**: us-east-1 (primary)

## 🚀 Currently Implemented Tables

_These tables are deployed and operational:_

### Users ✅ DEPLOYED

- **Description**: Stores user profile information (Cognito handles authentication).
- **Table Name**: `RewindUsers`
- **Partition Key**: `userId` (String) - from Cognito sub claim
- **Attributes**:
  - `userId` (String): Cognito user identifier (sub claim)
  - `email` (String): User email address from Cognito
  - `name` (String): User's display name from Cognito
  - `preferences` (Map): User preferences (notifications, filters, etc.)
  - `createdAt` (String): Profile creation timestamp (ISO format)
  - `updatedAt` (String): Last update timestamp (ISO format)
  - `lastActiveAt` (String): Last activity timestamp (ISO format)
- **Notes**: User authentication handled by Cognito, this stores app-specific profile data.

### Podcasts ✅ DEPLOYED

- **Description**: Stores podcast metadata and user associations.
- **Table Name**: `RewindPodcasts`
- **Partition Key**: `userId` (String)
- **Sort Key**: `podcastId` (String)
- **Attributes**:
  - `userId` (String): Owning user.
  - `podcastId` (String): Unique podcast identifier.
  - `title` (String): Podcast title.
  - `rssUrl` (String): RSS feed URL.
  - `imageUrl` (String): Podcast cover image URL.
  - `description` (String): Podcast description.
  - `episodeCount` (Number): Total number of episodes.
  - `lastSynced` (String): Last synchronization timestamp (ISO format).
  - `createdAt` (String): Addition timestamp (ISO format).
  - `updatedAt` (String): Last update timestamp (ISO format).
- **Global Secondary Index (GSI)**:
  - Index Name: `RssUrlIndex`
  - Partition Key: `rssUrl` (String)
  - For uniqueness checks.

### Episodes ✅ DEPLOYED (Enhanced for Recommendations)

- **Description**: Stores episode details for each podcast with AI-powered guest extraction.
- **Table Name**: `RewindEpisodes`
- **Partition Key**: `podcastId` (String)
- **Sort Key**: `episodeId` (String)
- **Attributes**:
  - `podcastId` (String): Parent podcast.
  - `episodeId` (String): Unique episode identifier.
  - `title` (String): Episode title.
  - `description` (String): Episode description.
  - `audioUrl` (String): Episode audio file URL.
  - `duration` (String): Episode duration (e.g., "45:30").
  - `releaseDate` (String): Episode release date (ISO format).
  - `imageUrl` (String): Episode image URL (optional).
  - `guests` (List): List of guest names (optional, manual).
  - `tags` (List): Episode tags/categories.
  - `createdAt` (String): Addition timestamp (ISO format).
  - **AI Guest Extraction Fields**:
    - `extractedGuests` (List): AI-extracted guest names from title/description.
    - `guestExtractionStatus` (String): 'pending' | 'completed' | 'failed'.
    - `guestExtractionDate` (String): ISO timestamp of extraction.
    - `guestExtractionConfidence` (Number): 0-1 confidence score.
    - `rawGuestData` (String): Raw AI response for debugging.
- **Global Secondary Index (GSI)**:
  - Index Name: `ReleaseDateIndex`
  - Partition Key: `podcastId` (String)
  - Sort Key: `releaseDate` (String)
  - For sorting by release date.
- **DynamoDB Streams**: Enabled for guest extraction pipeline.

### ListeningHistory ✅ DEPLOYED

- **Description**: Tracks episode playback and completion status.
- **Table Name**: `RewindListeningHistory`
- **Partition Key**: `userId` (String)
- **Sort Key**: `episodeId` (String)
- **Attributes**:
  - `userId` (String): User identifier
  - `episodeId` (String): Episode identifier
  - `podcastId` (String): Parent podcast identifier
  - `playbackPosition` (Number): Current playback position in seconds
  - `duration` (Number): Total episode duration in seconds
  - `isCompleted` (Boolean): Whether episode was fully listened
  - `lastPlayed` (String): Last playback timestamp (ISO format)
  - `firstPlayed` (String): First playback timestamp (ISO format)
  - `playCount` (Number): Number of times played
  - `createdAt` (String): Record creation timestamp
  - `updatedAt` (String): Last update timestamp
- **Global Secondary Index (GSI)**:
  - Index Name: `LastPlayedIndex`
  - Partition Key: `userId` (String)
  - Sort Key: `lastPlayed` (String)
  - For recent listening activity queries

### Shares ✅ DEPLOYED

- **Description**: Stores share links and associated podcast IDs.
- **Table Name**: `RewindShares`
- **Partition Key**: `shareId` (String)
- **Attributes**:
  - `shareId` (String): Unique share identifier.
  - `userId` (String): Creating user.
  - `podcastIds` (List): Array of podcast IDs being shared.
  - `expiresAt` (String): Share expiration timestamp (ISO format).
  - `createdAt` (String): Creation timestamp (ISO format).
- **Time To Live**: Configured on `expiresAt` attribute for automatic cleanup
- **Global Secondary Index (GSI)**:
  - Index Name: `UserSharesIndex`
  - Partition Key: `userId` (String)
  - Sort Key: `createdAt` (String)
  - For user's share history.

### UserFavorites ✅ DEPLOYED

- **Description**: Tracks user favorites and ratings for recommendation engine.
- **Table Name**: `RewindUserFavorites`
- **Partition Key**: `userId` (String)
- **Sort Key**: `itemId` (String) - can be episodeId or podcastId
- **Attributes**:
  - `userId` (String): User identifier
  - `itemId` (String): Episode or podcast ID
  - `itemType` (String): "episode" or "podcast"
  - `isFavorite` (Boolean): Whether item is favorited
  - `rating` (Number): User rating (1-5, optional)
  - `tags` (List): User-applied tags
  - `favoritedAt` (String): When favorited
  - `createdAt` (String): Record creation timestamp
  - `updatedAt` (String): Last update timestamp
- **Global Secondary Index (GSI)**:
  - Index Name: `ItemTypeIndex`
  - Partition Key: `userId` (String)
  - Sort Key: `itemType` (String)
  - For filtering by favorites type

### GuestAnalytics ✅ DEPLOYED

- **Description**: Tracks guest popularity and user preferences for recommendations.
- **Table Name**: `RewindGuestAnalytics`
- **Partition Key**: `userId` (String)
- **Sort Key**: `guestName` (String)
- **Attributes**:
  - `userId` (String): User identifier
  - `guestName` (String): Guest name (normalized)
  - `episodeIds` (List): Episodes featuring this guest
  - `listenCount` (Number): Times user listened to this guest
  - `favoriteCount` (Number): Times user favorited episodes with this guest
  - `lastListenDate` (String): Last time user listened to this guest
  - `averageRating` (Number): Average rating for episodes with this guest
  - `createdAt` (String): Record creation timestamp
  - `updatedAt` (String): Last update timestamp

### UserFeedback ✅ DEPLOYED

- **Description**: Stores user feedback on episodes for recommendation engine.
- **Table Name**: `RewindUserFeedback`
- **Partition Key**: `userId` (String)
- **Sort Key**: `episodeId#feedbackId` (String)
- **Attributes**:
  - `userId` (String): Providing user
  - `episodeId` (String): Targeted episode
  - `feedbackId` (String): Unique feedback identifier
  - `type` (String): Feedback type ("like", "dislike", "favorite")
  - `rating` (Number): User rating (0-5)
  - `comment` (String): User comment (optional)
  - `createdAt` (String): Feedback timestamp (ISO format)
- **Notes**: Composite sort key combines `episodeId` and `feedbackId` for uniqueness

## Relationships

- **One-to-Many**: `Users` to `Podcasts` (accessed via `userId` partition key)
- **One-to-Many**: `Podcasts` to `Episodes` (accessed via `podcastId` partition key)
- **One-to-Many**: `Users` to `ListeningHistory` (accessed via `userId` partition key)
- **One-to-Many**: `Users` to `UserFavorites` (accessed via `userId` partition key)
- **One-to-Many**: `Users` to `GuestAnalytics` (accessed via `userId` partition key)
- **One-to-Many**: `Users` to `UserFeedback` (accessed via `userId` partition key)
- **One-to-Many**: `Users` to `Shares` via `UserSharesIndex` GSI

## Query Patterns

### Currently Supported

- **Get user podcasts**: Query `Podcasts` table with `userId` partition key ✅
- **Get podcast episodes**: Query `Episodes` table with `podcastId` partition key ✅
- **Get user listening history**: Query `ListeningHistory` table with `userId` partition key ✅
- **Get episode playback position**: Direct query on `ListeningHistory` with `userId` and `episodeId` ✅
- **Check podcast uniqueness**: Query `RssUrlIndex` GSI with `rssUrl` ✅
- **Get shared library**: Direct query on `Shares` with `shareId` ✅
- **Get recent listening activity**: Query `LastPlayedIndex` GSI with `userId` and sort by `lastPlayed` ✅
- **Get user favorites by type**: Query `ItemTypeIndex` GSI with `userId` and `itemType` ✅
- **Get user shares**: Query `UserSharesIndex` GSI with `userId` ✅
- **Get guest analytics**: Query `GuestAnalytics` table with `userId` partition key ✅
- **Get user feedback**: Query `UserFeedback` table with `userId` partition key ✅

## Current CDK Implementation Status

### Deployed Tables

```typescript
// Currently deployed in RewindDataStack
this.tables = {
  users: Table(RewindUsers), // ✅ Deployed
  podcasts: Table(RewindPodcasts), // ✅ Deployed with RssUrlIndex
  episodes: Table(RewindEpisodes), // ✅ Deployed with ReleaseDateIndex & DynamoDB Streams
  listeningHistory: Table(RewindListeningHistory), // ✅ Deployed with LastPlayedIndex
  shares: Table(RewindShares), // ✅ Deployed with UserSharesIndex
  userFavorites: Table(RewindUserFavorites), // ✅ Deployed with ItemTypeIndex
  guestAnalytics: Table(RewindGuestAnalytics), // ✅ Deployed
  userFeedback: Table(RewindUserFeedback), // ✅ Deployed
}
```

### ✅ All Tables Implemented

All tables for the recommendation engine are now implemented and ready for deployment.

## Data Migration

- **Initial Setup**:
  - Create tables with partition keys, sort keys, and GSIs using AWS CDK v2 ✅
  - Enable DynamoDB Streams for recommendation engine data pipeline. _Planned_
- **Schema Updates**:
  - Use AWS CloudFormation or CDK to apply changes.
  - Back up data using DynamoDB backup before updates.

## Implementation Roadmap

### Phase 1 - Complete ✅

- ✅ Basic table structure (Users, Podcasts, Episodes, ListeningHistory, Shares)
- ✅ Primary key configurations
- ✅ Basic GSIs (RssUrlIndex, ReleaseDateIndex)
- ✅ TTL configuration for Shares

### Phase 2 - Complete ✅

- ✅ Add missing GSIs (LastPlayedIndex, UserSharesIndex)
- ✅ Enable DynamoDB Streams for recommendation engine
- ✅ Implement episode data population from RSS feeds

### Phase 3 - Complete ✅

- ✅ Add UserFavorites table with ItemTypeIndex GSI
- ✅ Add GuestAnalytics table for recommendation engine
- ✅ Add UserFeedback table for recommendation engine
- ✅ Implement advanced query patterns for personalization

### Next Steps - Ready for Implementation

- 🚧 Deploy updated CDK stack
- 🚧 Update backend TypeScript types
- 🚧 Create database service methods for new tables
- 🚧 Implement AWS Bedrock integration for guest extraction

## Notes for AI Agent

- Implement schema with DynamoDB using AWS CDK v2 ✅
- Use AWS SDK v3 for all database operations ✅
- Ensure partition keys are optimized for query patterns listed above ✅
- Use batch operations where possible to reduce API calls
- Implement proper error handling for DynamoDB operations ✅
- Test queries with the DynamoDB SDK and sample data
- Set up DynamoDB streams for recommendation engine data pipeline _Planned_
- Commit schema changes to Git after each update ✅
- Report issues (e.g., unclear attribute requirements) in PLAN.md

## References

- BACKEND_API.md: API endpoint definitions and data formats
- BACKEND_LOGIC.md: Business logic implementation details
- AWS_CONFIG.md: DynamoDB CDK infrastructure setup
- RECOMMENDATION_ENGINE.md: ML pipeline and data requirements
- UI_TECH.md: Frontend integration details
- PLAN.md: Task list and progress tracking
