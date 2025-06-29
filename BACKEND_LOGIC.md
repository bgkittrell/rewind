\# Rewind Backend Logic Specifications

## Overview
This document outlines the business logic for the Rewind backend, supporting a mobile-first Progressive Web App \(PWA\) for podcast enthusiasts aged 35\+. The logic handles podcast ingestion, recommendation generation, library sharing, and user authentication, integrating with the API endpoints \(see BACKEND_API.md\) and database \(see DATABASE.md\).

## Authentication Logic
- **Login Workflow**:
  - Validate email and password against stored user credentials.
  - Generate a JWT token with user ID and email, signed with a secret key (e.g., using `jsonwebtoken`).
  - Return token and user details on success.
  - Handle failures with `401` status if credentials are invalid.
- **Registration Workflow**:
  - Validate email format, password strength, and uniqueness.
  - Hash password using bcrypt before storing in the database.
  - Create new user record with generated ID.
  - Return user ID and confirmation message on success.
- **Token Validation**:
  - Middleware checks JWT in `Authorization` header.
  - Verify token signature and extract user ID.
  - Attach user ID to request object for subsequent logic.

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
  - Implement rate limiting (e.g., 100 requests/hour) using `express-rate-limit`.
  - Return `429` if limit is exceeded.

## Performance Optimization
- **Caching**:
  - Cache frequent queries (e.g., user podcasts, recommendations) using Redis.
  - Set expiration times (e.g., 1 hour for recommendations, 24 hours for podcasts).
- **Asynchronous Processing**:
  - Use queues (e.g., Bull) for RSS ingestion and recommendation updates.
  - Process tasks in the background to avoid blocking API responses.
- **Indexing**:
  - Create database indexes on `userId`, `podcastId`, and `releaseDate` for faster queries.

## Notes for AI Agent
- Implement logic with Node.js and Express.js.
- Use `bcrypt` for password hashing and `jsonwebtoken` for JWT management.
- Integrate with database schema from DATABASE.md.
- Mock API responses with MSW during development (see UI_TECH.md).
- Test logic with unit tests (e.g., Jest) and integration tests.
- Commit changes to Git after implementing each module.
- Report issues (e.g., unclear algorithm requirements) in PLAN.md.

## References
- BACKEND_API.md: API endpoint definitions.
- UI_TECH.md: Frontend integration details.
- DATABASE.md: Database schema and storage.
- PLAN.md: Task list and progress tracking.
