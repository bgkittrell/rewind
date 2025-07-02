# Rewind Backend Logic Specifications

## Overview

This document outlines the business logic for the Rewind backend, supporting a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+. The logic handles podcast ingestion, recommendation generation, library sharing, and user authentication, integrating with the API endpoints (see BACKEND_API.md) and database (see DATABASE.md).

## Authentication Logic

- **Cognito Integration**:
  - All authentication handled by Cognito User Pool service.
  - Users authenticate via Cognito hosted UI or AWS Amplify SDK.
  - Cognito returns JWT tokens with user claims (sub, email, name).
- **Token Validation**:
  - API Gateway HTTP API validates Cognito JWT tokens automatically.
  - Built-in JWT authorizer verifies token signature using Cognito issuer.
  - User ID from token `sub` claim available in Lambda event context.
  - No Lambda function needed for token validation.
- **User Profile Management**:
  - Create user profile in DynamoDB on first login using Cognito claims.
  - Update profile information from Cognito token on subsequent requests.
  - Store app-specific preferences and settings.

## Podcast Processing Logic

- **RSS Feed Ingestion**:
  - Fetch RSS feed from provided URL using `rss-parser` or similar library.
  - Extract podcast metadata (title, description, image) and episode details (title, audio URL, duration, release date).
  - Validate feed structure and handle errors (e.g., invalid XML).
  - Store podcast and episodes in database with unique IDs.
- **Episode Sync**:
  - Periodically check RSS feed for updates (e.g., every 24 hours).
  - Compare existing episodes with new feed data.
  - Add new episodes and update metadata as needed.
- **Remove Podcast**:
  - Delete podcast and associated episodes from database.
  - Invalidate any cached data or recommendations tied to the podcast.

## Recommendation Logic

- **Algorithm**:
  - Use a hybrid approach combining collaborative filtering and content-based filtering.
  - Analyze user feedback (ratings, comments) and podcast metadata (tags, genres).
  - Weight recent episodes higher for users aged 35+.
- **Generation Process**:
  - Query database for user’s listened episodes and feedback.
  - Match against similar podcasts using cosine similarity on metadata vectors.
  - Filter by user preferences (e.g., `history,tech`) and limit to 5 recommendations.
  - Cache results for 1 hour to reduce load.
- **Feedback Processing**:
  - Store rating and comment in database linked to episode and user.
  - Update user profile with feedback for future recommendations.
  - Trigger re-computation of recommendations if rating threshold is met.

## Library Sharing Logic

- **Generate Share Link**:
  - Validate provided podcast IDs belong to the user.
  - Generate a unique `shareId` (e.g., UUID).
  - Store `shareId` with associated podcast IDs and expiration (e.g., 7 days).
  - Return share URL for the user.
- **Add Podcasts from Share**:
  - Validate `shareId` exists and is not expired.
  - Check if podcasts are already in the user’s library.
  - Add new podcasts to the user’s library and update database.
  - Return success message with added podcast IDs.

## Error Handling Logic

- **Validation**:
  - Use schema validation (e.g., Joi) for all request bodies.
  - Return `400` with error details if validation fails.
- **Database Errors**:
  - Catch and log database connection or query errors.
  - Return `500` with generic error message to client.
- **Rate Limiting**:
  - Implement rate limiting at API Gateway level (10,000 requests/second).
  - Use DynamoDB for user-specific rate limiting if needed.
  - Return `429` if limit is exceeded with retry-after headers.

## Performance Optimization

- **Lambda Performance**:
  - Use provisioned concurrency for frequently accessed functions.
  - Optimize cold start times with minimal dependencies.
  - Implement connection pooling for DynamoDB operations.
- **Database Optimization**:
  - Use DynamoDB Global Secondary Indexes for efficient queries.
  - Implement batch operations to reduce API calls.
  - Use DynamoDB Streams for real-time data processing.
- **Caching**:
  - Use Lambda memory for short-term caching during execution.
  - Implement CloudFront caching for static responses.
  - Cache Cognito JWKS keys with TTL.

## Notes for AI Agent

- Implement logic with Node.js Lambda functions and TypeScript.
- Use Cognito JWT validation with API Gateway built-in authorizer (no additional libraries needed).
- Integrate with DynamoDB schema from DATABASE.md.
- Use AWS SDK v3 for all database operations.
- Implement proper error handling and logging.
- Mock API responses with MSW during development (see UI_TECH.md).
- Test logic with unit tests (Vitest) and integration tests.
- Use dependency injection patterns for testability.
- Commit changes to Git after implementing each module.
- Report issues (e.g., unclear algorithm requirements) in PLAN.md.

## References

- BACKEND_API.md: API endpoint definitions.
- UI_TECH.md: Frontend integration details.
- DATABASE.md: Database schema and storage.
- PLAN.md: Task list and progress tracking.
