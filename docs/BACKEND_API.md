\# Rewind Backend API Specifications

## Overview
This document outlines the RESTful API endpoints for the Rewind backend, supporting a mobile-first Progressive Web App \(PWA\) for podcast enthusiasts aged 35\+. The API handles podcast management, recommendations, library sharing, and user authentication, integrating with the frontend \(see UI_TECH.md\). All endpoints use JSON for request and response bodies, with standard HTTP status codes.

## Base URL
- **Production**: `https://12c77xnz00.execute-api.us-east-1.amazonaws.com/v1` ✅ DEPLOYED
- **Development**: `http://localhost:3000/v1`

## Authentication - DEPLOYED ✅
- **Method**: Amazon Cognito JWT-based authentication
- **Header**: `Authorization: Bearer <cognito_jwt_token>`
- **Token Validation**: All protected endpoints validate Cognito JWT tokens via API Gateway
- **User Identification**: User ID extracted from Cognito token claims (sub field)
- **Cognito User Pool**: `us-east-1_Cw78Mapt3`
- **Client ID**: `49kf2uvsl9vg08ka6o67ts41jj`
- **Hosted UI**: `https://rewind-730420835413-us-east-1.auth.us-east-1.amazoncognito.com`

## Podcast Management
- **Add Podcast**:
  - URL: `/podcasts`
  - Method: `POST`
  - Authorization: Required
  - Request Body:
    \```
    {
      "rssUrl": "http://example.com/podcast.rss"
    }
    \```
  - Response:
    \```
    {
      "podcastId": "67890",
      "title": "Sample Podcast",
      "rssUrl": "http://example.com/podcast.rss",
      "message": "Podcast added successfully"
    }
    \```
  - Status Codes:
    - `201`: Created
    - `400`: Invalid RSS URL
    - `409`: Podcast already exists
- **Get Podcasts**:
  - URL: `/podcasts`
  - Method: `GET`
  - Authorization: Required
  - Query Parameters:
    - `limit`: Number of results (default: 50)
    - `offset`: Pagination offset (default: 0)
  - Response:
    \```
    {
      "podcasts": [
        {
          "podcastId": "67890",
          "title": "Sample Podcast",
          "rssUrl": "http://example.com/podcast.rss",
          "imageUrl": "http://example.com/image.jpg",
          "description": "Podcast description",
          "episodeCount": 42,
          "unreadCount": 5,
          "lastSynced": "2024-01-15T10:30:00Z"
        }
      ],
      "total": 1,
      "hasMore": false
    }
    \```
  - Status Codes:
    - `200`: Success
    - `401`: Unauthorized
- **Remove Podcast**:
  - URL: `/podcasts/:podcastId`
  - Method: `DELETE`
  - Authorization: Required
  - Response:
    \```
    {
      "message": "Podcast removed successfully"
    }
    \```
  - Status Codes:
    - `200`: Success
    - `404`: Podcast not found
    - `403`: Unauthorized to delete this podcast

## Episodes
- **Get Episodes for Podcast**:
  - URL: `/podcasts/:podcastId/episodes`
  - Method: `GET`
  - Authorization: Required
  - Query Parameters:
    - `limit`: Number of episodes (default: 50)
    - `offset`: Pagination offset (default: 0)
    - `sort`: Sort order (`newest`, `oldest`, default: `newest`)
  - Response:
    \```
    {
      "episodes": [
        {
          "episodeId": "ep123",
          "title": "Episode Title",
          "description": "Episode description",
          "audioUrl": "http://example.com/episode.mp3",
          "duration": "45:30",
          "releaseDate": "2023-01-15T08:00:00Z",
          "imageUrl": "http://example.com/episode-image.jpg",
          "isListened": false,
          "playbackPosition": 0
        }
      ],
      "total": 150,
      "hasMore": true
    }
    \```
  - Status Codes:
    - `200`: Success
    - `404`: Podcast not found

## Recommendations
- **Get Recommendations**:
  - URL: `/recommendations`
  - Method: `GET`
  - Authorization: Required
  - Query Parameters:
    - `limit`: Number of recommendations (default: 10)
    - `filters`: Comma-separated filters (`not_recent`, `favorites`, `comedy`, etc.)
  - Response:
    \```
    {
      "recommendations": [
        {
          "episodeId": "ep123",
          "title": "Test Episode",
          "podcastName": "Test Podcast",
          "podcastId": "pod456",
          "releaseDate": "2023-01-15T08:00:00Z",
          "duration": "45:30",
          "audioUrl": "http://example.com/episode.mp3",
          "imageUrl": "http://example.com/image.jpg",
          "description": "Episode description",
          "reason": "You haven't listened to this comedy episode in 3 months",
          "confidence": 0.85
        }
      ],
      "total": 10
    }
    \```
  - Status Codes:
    - `200`: Success
    - `401`: Unauthorized
- **Submit Feedback**:
  - URL: `/episodes/:episodeId/feedback`
  - Method: `POST`
  - Authorization: Required
  - Request Body:
    \```
    {
      "type": "like|dislike|favorite",
      "rating": 4,
      "comment": "Great episode!"
    }
    \```
  - Response:
    \```
    {
      "message": "Feedback submitted successfully",
      "feedbackId": "fb789"
    }
    \```
  - Status Codes:
    - `201`: Created
    - `400`: Invalid data
    - `404`: Episode not found

## Playback
- **Save Playback Position**:
  - URL: `/episodes/:episodeId/playback`
  - Method: `PUT`
  - Authorization: Required
  - Request Body:
    \```
    {
      "position": 1230.5,
      "duration": 2700.0,
      "isCompleted": false
    }
    \```
  - Response:
    \```
    {
      "message": "Playback position saved"
    }
    \```
  - Status Codes:
    - `200`: Success
    - `404`: Episode not found

- **Get Playback Position**:
  - URL: `/episodes/:episodeId/playback`
  - Method: `GET`
  - Authorization: Required
  - Response:
    \```
    {
      "position": 1230.5,
      "duration": 2700.0,
      "isCompleted": false,
      "lastPlayed": "2024-01-15T14:30:00Z"
    }
    \```
  - Status Codes:
    - `200`: Success
    - `404`: Episode not found or no playback history

## Library Sharing
- **Generate Share Link**:
  - URL: `/share`
  - Method: `POST`
  - Authorization: Required
  - Request Body:
    \```
    {
      "podcastIds": ["67890", "69123"]
    }
    \```
  - Response:
    \```
    {
      "shareId": "abc123",
      "url": "https://rewindpodcast.com/share/abc123",
      "expiresAt": "2024-02-15T10:00:00Z"
    }
    \```
  - Status Codes:
    - `201`: Created
    - `400`: Invalid podcast IDs

- **Get Shared Library**:
  - URL: `/share/:shareId`
  - Method: `GET`
  - Authorization: Not required (public)
  - Response:
    \```
    {
      "podcasts": [
        {
          "podcastId": "67890",
          "title": "Sample Podcast",
          "imageUrl": "http://example.com/image.jpg",
          "description": "Podcast description"
        }
      ],
      "shareId": "abc123",
      "createdAt": "2024-01-15T10:00:00Z"
    }
    \```
  - Status Codes:
    - `200`: Success
    - `404`: Share not found or expired

- **Add Podcasts from Share**:
  - URL: `/share/:shareId/add`
  - Method: `POST`
  - Authorization: Required
  - Response:
    \```
    {
      "message": "Podcasts added to library",
      "addedPodcastIds": ["67890"],
      "skippedPodcastIds": ["69123"],
      "addedCount": 1
    }
    \```
  - Status Codes:
    - `200`: Success
    - `404`: Share not found or expired

## Error Handling
- **Common Errors**:
  - `400`: Bad Request (e.g., invalid JSON, validation errors)
  - `401`: Unauthorized (e.g., missing or invalid Auth0 token)
  - `403`: Forbidden (e.g., insufficient permissions)
  - `404`: Not Found (e.g., resource does not exist)
  - `409`: Conflict (e.g., resource already exists)
  - `429`: Too Many Requests (rate limiting)
  - `500`: Internal Server Error
- **Error Response Format**:
  \```
  {
    "error": {
      "message": "Detailed error message",
      "code": "ERROR_CODE",
      "details": {}
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/api/podcasts"
  }
  \```

## Notes for AI Agent
- Implement endpoints using AWS Lambda with Node.js and TypeScript.
- Use Auth0 JWT validation middleware for protected endpoints.
- Validate all request bodies using a schema library (e.g., Joi or Zod).
- Return consistent JSON responses with standardized error format.
- Store data in DynamoDB following the schema in DATABASE.md.
- Mock endpoints with MSW during frontend development (see UI_TECH.md).
- Implement rate limiting and proper error handling.
- Add comprehensive logging for debugging and monitoring.
- Commit changes to Git after implementing each endpoint.
- Report issues (e.g., unclear data format) in PLAN.md.

## References
- UI_TECH.md: Frontend integration details.
- DATABASE.md: Database schema and storage.
