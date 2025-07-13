# LocalStack Setup for Rewind Project

This guide explains how to set up and use LocalStack to simulate AWS services locally for the Rewind project.

## Overview

LocalStack is a cloud service emulator that runs in a single container on your laptop or in your CI environment. It provides local AWS services for testing and development without needing to deploy to the actual AWS cloud.

## Prerequisites

- Docker and Docker Compose installed
- AWS CLI installed (`aws --version`)
- Node.js and npm installed
- `jq` command-line JSON processor (for testing scripts)

### Installing Prerequisites

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install awscli jq curl
```

**macOS:**

```bash
brew install awscli jq
```

**Windows:**

```bash
# Using chocolatey
choco install awscli jq

# Or using winget
winget install Amazon.AWSCLI
winget install jqlang.jq
```

## Quick Start

### 1. Start LocalStack

```bash
# Start LocalStack container
npm run localstack:start

# Initialize AWS resources (tables, user pool, etc.)
npm run localstack:init

# Or do both in one command
npm run localstack:setup
```

### 2. Test the Setup

```bash
# Run comprehensive tests
npm run localstack:test

# Check LocalStack logs
npm run localstack:logs
```

### 3. Use in Development

Set your environment variables to point to LocalStack:

```bash
# Load local environment
export $(cat .env.local | xargs)

# Your application will now use LocalStack endpoints
npm run dev
```

## Available Scripts

| Script                       | Description                       |
| ---------------------------- | --------------------------------- |
| `npm run localstack:start`   | Start LocalStack container        |
| `npm run localstack:stop`    | Stop LocalStack container         |
| `npm run localstack:restart` | Restart LocalStack container      |
| `npm run localstack:init`    | Initialize AWS resources          |
| `npm run localstack:setup`   | Start + Initialize in one command |
| `npm run localstack:test`    | Run comprehensive tests           |
| `npm run localstack:logs`    | View LocalStack logs              |
| `npm run localstack:reset`   | Reset everything and start fresh  |

## Configuration

### Environment Variables

The `.env.local` file contains all necessary configuration:

```env
# LocalStack Configuration
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=us-east-1
NODE_ENV=development
IS_LOCAL=true
```

### Services Included

LocalStack simulates these AWS services for the Rewind project:

- **DynamoDB** - Data storage (users, podcasts, episodes, etc.)
- **Cognito** - User authentication and authorization
- **Lambda** - Serverless functions
- **API Gateway** - HTTP API endpoints
- **S3** - File storage
- **Bedrock** - AI/ML services
- **EventBridge** - Event-driven architecture
- **Personalize** - Recommendation engine
- **IAM** - Identity and access management
- **CloudWatch Logs** - Logging

## AWS Resources Created

### DynamoDB Tables

| Table Name         | Primary Key | GSI               | Purpose                |
| ------------------ | ----------- | ----------------- | ---------------------- |
| `users`            | `id`        | -                 | User profiles          |
| `podcasts`         | `id`        | -                 | Podcast metadata       |
| `episodes`         | `id`        | `podcastId-index` | Episode data           |
| `listeningHistory` | `id`        | `userId-index`    | User listening history |
| `shares`           | `id`        | -                 | Shared content         |

### Cognito Resources

- **User Pool**: `RewindUserPool`
- **User Pool Client**: `RewindWebClient`
- **Identity Pool**: For federated identities

### S3 Buckets

- **rewind-local-assets**: For storing audio files, images, and other assets

## Testing

### Automated Tests

```bash
# Run all LocalStack tests
npm run localstack:test
```

The test suite validates:

- ✅ LocalStack is running
- ✅ DynamoDB tables exist and work
- ✅ Cognito user pool is configured
- ✅ S3 bucket operations work
- ✅ Service endpoints are accessible

### Manual Testing

```bash
# Test DynamoDB
aws dynamodb list-tables --endpoint-url http://localhost:4566

# Test Cognito
aws cognito-idp list-user-pools --max-results 10 --endpoint-url http://localhost:4566

# Test S3
aws s3 ls --endpoint-url http://localhost:4566
```

## Development Integration

### Backend Services

The backend automatically detects LocalStack when:

- `NODE_ENV=development`
- `IS_LOCAL=true`

The `awsConfig.ts` utility handles this configuration:

```typescript
import { createDynamoDBClient, getEnvironmentConfig } from './utils/awsConfig'

// Automatically uses LocalStack in development
const client = createDynamoDBClient()
const config = getEnvironmentConfig()
```

### Frontend Integration

For frontend testing, configure your API calls to use LocalStack endpoints:

```javascript
// In development, API calls will go through LocalStack
const API_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:4566/restapis/[API_ID]/prod/_user_request_'
    : 'https://your-api-gateway-url.com'
```

## Troubleshooting

### Common Issues

**1. LocalStack won't start**

```bash
# Check Docker is running
docker ps

# Check port availability
lsof -i :4566

# Reset everything
npm run localstack:reset
```

**2. AWS CLI errors**

```bash
# Verify AWS CLI configuration
aws configure list

# Set temporary credentials
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
```

**3. Permission errors**

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Check Docker permissions
sudo usermod -aG docker $USER
```

**4. Services not responding**

```bash
# Check LocalStack health
curl http://localhost:4566/health

# View detailed logs
npm run localstack:logs
```

### Debugging

**Enable debug mode:**

```bash
# Edit .env.local
DEBUG=1

# Restart LocalStack
npm run localstack:restart
```

**Check service status:**

```bash
# LocalStack health endpoint
curl -s http://localhost:4566/health | jq

# Container logs
docker logs localstack_main
```

## Data Persistence

LocalStack is configured with persistence enabled, so your data will survive container restarts. Data is stored in:

- **Linux/macOS**: `./volume/` directory
- **Windows**: Docker volume

To reset all data:

```bash
npm run localstack:reset
```

## Production vs Development

| Feature     | Development (LocalStack) | Production (AWS)      |
| ----------- | ------------------------ | --------------------- |
| Endpoint    | `http://localhost:4566`  | AWS service endpoints |
| Credentials | `test/test`              | IAM roles/credentials |
| Data        | Local storage            | AWS managed storage   |
| Costs       | Free                     | AWS pricing           |
| Performance | Local network            | AWS performance       |

## Best Practices

1. **Always test locally first** before deploying to AWS
2. **Use environment variables** to switch between local and production
3. **Keep LocalStack updated** for latest AWS feature support
4. **Monitor resource usage** - LocalStack can be resource-intensive
5. **Use separate data** for different feature branches

## Advanced Usage

### Custom Initialization

Add custom initialization scripts to `scripts/localstack-init.sh`:

```bash
# Add custom resources
create_custom_resources() {
    # Your custom LocalStack setup
    echo "Creating custom resources..."
}
```

### Integration with CI/CD

```yaml
# .github/workflows/test.yml
- name: Start LocalStack
  run: |
    npm run localstack:start
    npm run localstack:init
    npm run localstack:test
```

### Multiple Environments

```bash
# Different configurations for different environments
cp .env.local .env.local.feature-branch
# Edit .env.local.feature-branch
npm run localstack:start
```

## Support

For issues with LocalStack setup:

1. Check the [LocalStack documentation](https://docs.localstack.cloud/)
2. Review the test output: `npm run localstack:test`
3. Check container logs: `npm run localstack:logs`
4. Reset and try again: `npm run localstack:reset`

## Web UI

LocalStack provides a web interface at:

- **URL**: http://localhost:8080
- **Features**: Resource browser, logs, metrics
- **Credentials**: No authentication required in development
