# Rewind Backend

A serverless backend for the Rewind podcast app built with AWS Lambda, DynamoDB, and TypeScript.

## Architecture

- **Lambda Functions**: Serverless handlers for API endpoints
- **DynamoDB**: NoSQL database for storing user data, podcasts, episodes, and listening history
- **API Gateway**: RESTful API with Cognito authentication
- **TypeScript**: Full type safety and modern JavaScript features

## API Endpoints

### Podcasts
- `GET /podcasts` - Get user's podcast library
- `GET /podcasts/{podcastId}` - Get specific podcast details
- `POST /podcasts` - Add new podcast by RSS URL
- `DELETE /podcasts/{podcastId}` - Remove podcast from library

### Episodes
- `GET /podcasts/{podcastId}/episodes` - Get episodes for a podcast
- `GET /episodes/{episodeId}/playback` - Get playback position
- `PUT /episodes/{episodeId}/playback` - Save playback position
- `POST /episodes/{episodeId}/feedback` - Submit episode feedback

### Recommendations
- `GET /recommendations` - Get personalized episode recommendations

### Library Sharing
- `POST /share` - Generate shareable library link
- `GET /share/{shareId}` - View shared library
- `POST /share/{shareId}/add` - Add podcasts from shared library

## Services

### Database Service
Base class for DynamoDB operations with query, put, update, delete methods.

### User Service
User profile management and authentication integration.

### Podcast Service
Podcast CRUD operations, RSS URL validation, and library management.

### Episode Service
Episode data management and playback tracking.

## Authentication

Uses AWS Cognito JWT tokens via API Gateway authorizer. User information is extracted from JWT claims.

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm run test

# Type checking
npm run typecheck

# Lint code
npm run lint
```

## Testing

Uses Vitest for unit testing with mocked services. Tests cover:
- API endpoint handlers
- Authentication flows
- Database operations
- Error handling

## Deployment

Deployment is handled via AWS CDK in the `infra/` directory. The backend Lambda functions are deployed as part of the CDK stack.

## Environment Variables

- `AWS_REGION` - AWS region for DynamoDB
- `USERS_TABLE` - DynamoDB Users table name
- `PODCASTS_TABLE` - DynamoDB Podcasts table name
- `EPISODES_TABLE` - DynamoDB Episodes table name
- `LISTENING_HISTORY_TABLE` - DynamoDB ListeningHistory table name
- `USER_FAVORITES_TABLE` - DynamoDB UserFavorites table name
- `USER_FEEDBACK_TABLE` - DynamoDB UserFeedback table name
- `SHARES_TABLE` - DynamoDB Shares table name