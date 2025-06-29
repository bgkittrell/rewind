\# Rewind Backend API Specifications

## Overview
This document outlines the RESTful API endpoints for the Rewind backend, supporting a mobile-first Progressive Web App \(PWA\) for podcast enthusiasts aged 35\+. The API handles podcast management, recommendations, library sharing, and user authentication, integrating with the frontend \(see UI_TECH.md\). All endpoints use JSON for request and response bodies, with standard HTTP status codes.

## Base URL
- **Production**: `https://api.rewindpodcast.com/v1`
- **Development**: `http://localhost:3000/v1`

## Authentication
- **Method**: JWT-based authentication.
- **Header**: `Authorization: Bearer <token>`
- **Endpoints**:
  - **Login**:
    - URL: `/auth/login`
    - Method: `POST`
    - Request Body:
      \```
      {
        "email": "user@example.com",
        "password": "securepassword"
      }
      \```
    - Response:
      \```
      {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "userId": "12345",
        "email": "user@example.com"
      }
      \```
    - Status Codes:
      - `200`: Success
      - `401`: Invalid credentials
  - **Register**:
    - URL: `/auth/register`
    - Method: `POST`
    - Request Body:
      \```
      {
        "email": "user@example.com",
        "password": "securepassword",
        "name": "John Doe"
      }
      \```
    - Response:
      \```
      {
        "userId": "12345",
        "email": "user@example.com",
        "message": "Registration successful"
      }
      \```
    - Status Codes:
      - `201`: Created
      - `400`: Invalid data

## Podcast Management
- **Add Podcast**:
  - URL: `/podcasts/add`
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
      "rssUrl": "http://example.com/podcast.rss"
    }
    \```
  - Status Codes:
    - `200`: Success
    - `400`: Invalid RSS URL
- **Get Podcasts**:
  - URL: `/podcasts`
  - Method: `GET`
  - Authorization: Required
  - Query Parameters:
    - `limit`: Number of results (default: 10)
    - `offset`: Pagination offset (default: 0)
  - Response:
    \```
    {
      "podcasts": [
        {
          "podcastId": "67890",
          "title": "Sample Podcast",
          "rssUrl": "http://example.com/podcast.rss",
          "unreadCount": 5
        }
      ],
      "total": 1
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
      "message": "Podcast removed"
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
    - `limit`: Number of recommendations (default: 5)
    - `filters`: Comma-separated tags (e.g., `history,tech`)
  - Response:
    \```
    [
      {
        "id": "1",
        "title": "Test Episode",
        "podcastName": "Test Podcast",
        "releaseDate": "2023-01-15",
        "duration": "45 min",
        "audioUrl": "http://example.com/episode.mp3"
      }
    ]
    \```
  - Status Codes:
    - `200`: Success
    - `401`: Unauthorized
- **Submit Feedback**:
  - URL: `/recommendations/feedback`
  - Method: `POST`
  - Authorization: Required
  - Request Body:
    \```
    {
      "episodeId": "1",
      "rating": 4,
      "comment": "Great episode!"
    }
    \```
  - Response:
    \```
    {
      "message": "Feedback submitted"
    }
    \```
  - Status Codes:
    - `200`: Success
    - `400`: Invalid data

## Library Sharing
- **Generate Share Link**:
  - URL: `/share/generate`
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
      "url": "https://rewindpodcast.com/share/abc123"
    }
    \```
  - Status Codes:
    - `200`: Success
    - `400`: Invalid podcast IDs
- **Add Podcasts from Share**:
  - URL: `/share/:shareId`
  - Method: `POST`
  - Authorization: Required
  - Response:
    \```
    {
      "message": "Podcasts added to library",
      "addedPodcastIds": ["67890", "69123"]
    }
    \```
  - Status Codes:
    - `200`: Success
    - `404`: Share ID not found

## Error Handling
- **Common Errors**:
  - `400`: Bad Request (e.g., invalid JSON)
  - `401`: Unauthorized (e.g., missing or invalid token)
  - `403`: Forbidden (e.g., insufficient permissions)
  - `404`: Not Found (e.g., resource does not exist)
  - `500`: Internal Server Error
- **Error Response Format**:
  \```
  {
    "error": "Detailed error message",
    "code": "error_code"
  }
  \```

## Notes for AI Agent
- Implement endpoints with Express.js or similar framework.
- Use JWT middleware for authentication (e.g., `jsonwebtoken`).
- Validate all request bodies using a schema (e.g., Joi or Yup).
- Return consistent JSON responses with appropriate status codes.
- Store podcast data and user libraries in a database (see DATABASE.md).
- Mock endpoints with MSW during frontend development (see UI_TECH.md).
- Commit changes to Git after implementing each endpoint.
- Report issues (e.g., unclear data format) in PLAN.md.

## References
- UI_TECH.md: Frontend integration details.
- DATABASE.md: Database schema and storage.
