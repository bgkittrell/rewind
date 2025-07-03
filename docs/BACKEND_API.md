# Rewind Backend API Specifications

## Overview

This document outlines the RESTful API endpoints for the Rewind backend, supporting a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+. The API handles podcast management, recommendations, library sharing, and user authentication, integrating with the frontend (see UI_TECH.md). All endpoints use JSON for request and response bodies, with standard HTTP status codes.

## Base URL

- **Production**: `https://12c77xnz00.execute-api.us-east-1.amazonaws.com/v1` ✅ DEPLOYED
- **Development**: `https://12c77xnz00.execute-api.us-east-1.amazonaws.com/v1`

## Authentication - DEPLOYED ✅

- **Method**: Amazon Cognito JWT-based authentication
- **Header**: `Authorization: Bearer <cognito_jwt_token>`
- **Token Validation**: All protected endpoints validate Cognito JWT tokens via API Gateway REST API with Cognito User Pool authorizer
- **User Identification**: User ID extracted from Cognito token claims (sub field)

### Current Working Configuration ✅ DEPLOYED

- **Cognito User Pool**: `us-east-1_Cw78Mapt3`
- **User Pool Client**: `49kf2uvsl9vg08ka6o67ts41jj`
- **Identity Pool**: `us-east-1:c78b0b1e-1234-5678-9abc-def012345678` (auto-generated)
- **Hosted UI Domain**: `rewind-730420835413-us-east-1.auth.us-east-1.amazoncognito.com`
- **Region**: `us-east-1`

### Authentication Flow

1. **User Registration**: POST `/auth/signup` with email, password, and name
2. **Email Verification**: POST `/auth/confirm` with email and confirmation code
3. **User Login**: POST `/auth/signin` with email and password
4. **Token Usage**: Include `Authorization: Bearer <access_token>` in all protected API calls
5. **Token Refresh**: Use refresh token to get new access tokens (30-day validity)

### Security Configuration

- **Password Policy**: 8+ characters, uppercase, lowercase, numbers required
- **MFA**: Disabled (can be enabled later)
- **Account Recovery**: Email-only recovery
- **Token Expiration**:
  - Access Token: 1 hour
  - Refresh Token: 30 days
  - ID Token: 1 hour
- **OAuth Scopes**: `email`, `openid`, `profile`
- **Callback URLs**: `http://localhost:5173` (dev), `https://app.rewind.com` (prod)

### Environment Variables

```bash
# Frontend (auto-generated in .env.production)
VITE_USER_POOL_ID=us-east-1_Cw78Mapt3
VITE_USER_POOL_CLIENT_ID=49kf2uvsl9vg08ka6o67ts41jj
VITE_IDENTITY_POOL_ID=us-east-1:xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_AWS_REGION=us-east-1

# Backend (injected via CDK)
USER_POOL_ID=us-east-1_Cw78Mapt3
USER_POOL_CLIENT_ID=49kf2uvsl9vg08ka6o67ts41jj
```

## 🚀 Currently Implemented Endpoints

### Podcast Management - DEPLOYED ✅

- **Add Podcast**:
  - URL: `/podcasts`
  - Method: `POST`
  - Authorization: Required
  - Request Body:
    ```json
    {
      "rssUrl": "http://example.com/podcast.rss"
    }
    ```
  - Response:
    ```json
    {
      "data": {
        "podcastId": "67890",
        "title": "Sample Podcast",
        "rssUrl": "http://example.com/podcast.rss",
        "message": "Podcast added successfully"
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "path": "/podcasts"
    }
    ```
  - Status Codes:
    - `201`: Created
    - `400`: Invalid RSS URL or validation error
    - `409`: Podcast already exists
    - `401`: Unauthorized

- **Get Podcasts**:
  - URL: `/podcasts`
  - Method: `GET`
  - Authorization: Required
  - Query Parameters:
    - `limit`: Number of results (default: 50) - _Not yet implemented_
    - `offset`: Pagination offset (default: 0) - _Not yet implemented_
  - Response:
    ```json
    {
      "data": {
        "podcasts": [
          {
            "podcastId": "67890",
            "title": "Sample Podcast",
            "rssUrl": "http://example.com/podcast.rss",
            "imageUrl": "http://example.com/image.jpg",
            "description": "Podcast description",
            "episodeCount": 42,
            "createdAt": "2024-01-15T10:30:00Z",
            "lastUpdated": "2024-01-15T10:30:00Z"
          }
        ],
        "total": 1,
        "hasMore": false
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "path": "/podcasts"
    }
    ```
  - Status Codes:
    - `200`: Success
    - `401`: Unauthorized

- **Remove Podcast**:
  - URL: `/podcasts/{podcastId}`
  - Method: `DELETE`
  - Authorization: Required
  - Response:
    ```json
    {
      "data": {
        "message": "Podcast deleted successfully"
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "path": "/podcasts/67890"
    }
    ```
  - Status Codes:
    - `200`: Success
    - `404`: Podcast not found
    - `403`: Unauthorized to delete this podcast
    - `401`: Unauthorized

### Authentication Endpoints - DEPLOYED ✅

- **Sign Up**:
  - URL: `/auth/signup`
  - Method: `POST`
  - Authorization: Not required
  - Request Body:
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePassword123",
      "name": "John Doe"
    }
    ```
  - Response:
    ```json
    {
      "message": "User created successfully",
      "userSub": "cognito-user-id",
      "emailVerificationRequired": true
    }
    ```

- **Sign In**:
  - URL: `/auth/signin`
  - Method: `POST`
  - Authorization: Not required
  - Request Body:
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePassword123"
    }
    ```
  - Response:
    ```json
    {
      "message": "Sign in successful",
      "tokens": {
        "accessToken": "cognito-access-token",
        "refreshToken": "cognito-refresh-token",
        "idToken": "cognito-id-token"
      },
      "user": {
        "id": "cognito-user-id",
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
    ```

- **Confirm Email**:
  - URL: `/auth/confirm`
  - Method: `POST`
  - Authorization: Not required
  - Request Body:
    ```json
    {
      "email": "user@example.com",
      "confirmationCode": "123456"
    }
    ```

- **Resend Confirmation**:
  - URL: `/auth/resend`
  - Method: `POST`
  - Authorization: Not required
  - Request Body:
    ```json
    {
      "email": "user@example.com"
    }
    ```

### Health Check - DEPLOYED ✅

- **Health Check**:
  - URL: `/health`
  - Method: `GET`
  - Authorization: Not required
  - Response:
    ```json
    {
      "status": "healthy",
      "timestamp": "2024-01-15T10:30:00Z",
      "version": "1.0.0"
    }
    ```

## 📋 Planned Future Endpoints

_These endpoints are documented for future implementation but are not yet available:_

### Episodes (Phase 2 - Planned)

- **Get Episodes for Podcast**:
  - URL: `/podcasts/{podcastId}/episodes`
  - Method: `GET`
  - Authorization: Required
  - Query Parameters:
    - `limit`: Number of episodes (default: 50)
    - `offset`: Pagination offset (default: 0)
    - `sort`: Sort order (`newest`, `oldest`, default: `newest`)
  - Response:
    ```json
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
    ```
  - Status Codes:
    - `200`: Success
    - `404`: Podcast not found

### Recommendations (Phase 3 - Planned)

- **Get Recommendations**:
  - URL: `/recommendations`
  - Method: `GET`
  - Authorization: Required
  - Query Parameters:
    - `limit`: Number of recommendations (default: 10)
    - `filters`: Comma-separated filters (`not_recent`, `favorites`, `comedy`, etc.)
  - Response:
    ```json
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
    ```

- **Submit Feedback**:
  - URL: `/episodes/{episodeId}/feedback`
  - Method: `POST`
  - Authorization: Required
  - Request Body:
    ```json
    {
      "type": "like|dislike|favorite",
      "rating": 4,
      "comment": "Great episode!"
    }
    ```

### Playback (Phase 2 - Planned)

- **Save Playback Position**:
  - URL: `/episodes/{episodeId}/playback`
  - Method: `PUT`
  - Authorization: Required
  - Request Body:
    ```json
    {
      "position": 1230.5,
      "duration": 2700.0,
      "isCompleted": false
    }
    ```

- **Get Playback Position**:
  - URL: `/episodes/{episodeId}/playback`
  - Method: `GET`
  - Authorization: Required

### Library Sharing (Phase 3 - Planned)

- **Generate Share Link**:
  - URL: `/share`
  - Method: `POST`
  - Authorization: Required
  - Request Body:
    ```json
    {
      "podcastIds": ["67890", "69123"]
    }
    ```

- **Get Shared Library**:
  - URL: `/share/{shareId}`
  - Method: `GET`
  - Authorization: Not required (public)

- **Add Podcasts from Share**:
  - URL: `/share/{shareId}/add`
  - Method: `POST`
  - Authorization: Required

## Error Handling

- **Common Errors**:
  - `400`: Bad Request (e.g., invalid JSON, validation errors)
  - `401`: Unauthorized (e.g., missing or invalid Cognito token)
  - `403`: Forbidden (e.g., insufficient permissions)
  - `404`: Not Found (e.g., resource does not exist)
  - `409`: Conflict (e.g., resource already exists)
  - `429`: Too Many Requests (rate limiting)
  - `500`: Internal Server Error

- **Error Response Format**:
  ```json
  {
    "error": {
      "message": "Detailed error message",
      "code": "ERROR_CODE",
      "details": {}
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/api/podcasts"
  }
  ```

## Implementation Status

### Current Implementation (Phase 1 - Complete ✅)

- ✅ Podcast Management (Add, Get, Delete)
- ✅ Authentication (Cognito integration)
- ✅ Error handling and logging
- ✅ CORS configuration
- ✅ Health check endpoint

### Next Phase (Phase 2 - In Development)

- 🚧 Episode management and RSS parsing
- 🚧 Audio playback position tracking
- 🚧 Basic episode recommendations

### Future Phases (Phase 3+ - Planned)

- 📋 Advanced recommendation engine with AWS Personalize
- 📋 Library sharing functionality
- 📋 User favorites and feedback system
- 📋 Push notifications

## Notes for AI Agent

- Implement endpoints using AWS Lambda with Node.js and TypeScript.
- Use Cognito JWT validation via API Gateway REST API authorizer (not HTTP API).
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
- INFRASTRUCTURE.md: AWS infrastructure setup.
- PLAN.md: Development phases and progress tracking.
