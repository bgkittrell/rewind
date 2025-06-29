\# Rewind Database Schema Specifications

## Overview
This document defines the DynamoDB schema for the Rewind backend, a mobile-first Progressive Web App \(PWA\) for podcast enthusiasts aged 35\+. The schema supports user management, podcast storage, episode tracking, recommendation data, and library sharing, integrating with the API \(see BACKEND_API.md\) and business logic \(see BACKEND_LOGIC.md\).

## Database Configuration
- **Engine**: Amazon DynamoDB
- **Access**: Managed via AWS SDK or Boto3 with IAM roles.
- **Caching**: Redis for temporary storage of recommendations and user data.

## Tables

### Users
- **Description**: Stores user account information.
- **Partition Key**: `userId` \(String\)
- **Attributes**:
  - `userId` \(String\): Unique user identifier.
  - `email` \(String\): User email address.
  - `passwordHash` \(String\): Hashed password using bcrypt.
  - `name` \(String\): User’s full name.
  - `createdAt` \(String\): Account creation timestamp (ISO format).
  - `updatedAt` \(String\): Last update timestamp (ISO format).
- **Notes**: No secondary index needed; queries by `userId` are direct.

### Podcasts
- **Description**: Stores podcast metadata and user associations.
- **Partition Key**: `userId` \(String\)
- **Sort Key**: `podcastId` \(String\)
- **Attributes**:
  - `userId` \(String\): Owning user.
  - `podcastId` \(String\): Unique podcast identifier.
  - `title` \(String\): Podcast title.
  - `rssUrl` \(String\): RSS feed URL.
  - `imageUrl` \(String\): Podcast cover image URL.
  - `description` \(String\): Podcast description.
  - `lastSynced` \(String\): Last synchronization timestamp (ISO format).
  - `createdAt` \(String\): Addition timestamp (ISO format).
  - `updatedAt` \(String\): Last update timestamp (ISO format).
- **Global Secondary Index (GSI)**:
  - Index Name: `RssUrlIndex`
  - Partition Key: `rssUrl` \(String\)
  - For uniqueness checks.

### Episodes
- **Description**: Stores episode details for each podcast.
- **Partition Key**: `podcastId` \(String\)
- **Sort Key**: `episodeId` \(String\)
- **Attributes**:
  - `podcastId` \(String\): Parent podcast.
  - `episodeId` \(String\): Unique episode identifier.
  - `title` \(String\): Episode title.
  - `audioUrl` \(String\): Episode audio file URL.
  - `duration` \(String\): Episode duration (e.g., "45 min").
  - `releaseDate` \(String\): Episode release date (ISO format).
  - `description` \(String\): Episode description.
  - `createdAt` \(String\): Addition timestamp (ISO format).
- **Global Secondary Index (GSI)**:
  - Index Name: `ReleaseDateIndex`
  - Partition Key: `podcastId` \(String\)
  - Sort Key: `releaseDate` \(String\)
  - For sorting by release date.

### UserFeedback
- **Description**: Stores user feedback on episodes.
- **Partition Key**: `userId` \(String\)
- **Sort Key**: `episodeId#feedbackId` \(String\)
- **Attributes**:
  - `userId` \(String\): Providing user.
  - `episodeId` \(String\): Targeted episode.
  - `feedbackId` \(String\): Unique feedback identifier.
  - `rating` \(Number\): User rating (0-5).
  - `comment` \(String\): User comment.
  - `createdAt` \(String\): Feedback timestamp (ISO format).
- **Notes**: Composite sort key combines `episodeId` and `feedbackId` for uniqueness.

### Shares
- **Description**: Stores share links and associated podcast IDs.
- **Partition Key**: `userId` \(String\)
- **Sort Key**: `shareId` \(String\)
- **Attributes**:
  - `userId` \(String\): Creating user.
  - `shareId` \(String\): Unique share identifier.
  - `podcastIds` \(List\): Array of podcast IDs being shared.
  - `expiresAt` \(String\): Share expiration timestamp (ISO format).
  - `createdAt` \(String\): Creation timestamp (ISO format).
- **Global Secondary Index (GSI)**:
  - Index Name: `ExpiresAtIndex`
  - Partition Key: `expiresAt` \(String\)
  - For cleanup of expired shares.

### RecommendationsCache
- **Description**: Stores cached recommendation data (optional, for Redis).
- **Key-Value Pairs** (Redis):
  - Key: `recommendations:userId`
  - Value: JSON string of recommendation array.
  - TTL: 1 hour.
- **Note**: Managed separately from DynamoDB for performance.

## Relationships
- **One-to-Many**: `Users` to `Podcasts` (accessed via `userId` partition key).
- **One-to-Many**: `Podcasts` to `Episodes` (accessed via `podcastId` partition key).
- **Many-to-Many**: `Users` to `Episodes` via `UserFeedback` (queried by `userId` and `episodeId`).

## Data Migration
- **Initial Setup**:
  - Create tables with partition keys, sort keys, and GSIs using AWS CDK or CLI.
  - Seed with default admin user if needed.
- **Schema Updates**:
  - Use AWS CloudFormation or CDK to apply changes.
  - Back up data using DynamoDB backup before updates.

## Notes for AI Agent
- Implement schema with DynamoDB using AWS CDK.
- Use Redis for caching recommendations and user data.
- Ensure partition keys are optimized for query patterns.
- Test queries with the DynamoDB SDK and sample data.
- Commit schema changes to Git after each update.
- Report issues (e.g., unclear attribute requirements) in PLAN.md.

## References
- BACKEND_API.md: API endpoint definitions.
- BACKEND_LOGIC.md: Business logic details.
- UI_TECH.md: Frontend integration details.
- PLAN.md: Task list and progress tracking.
