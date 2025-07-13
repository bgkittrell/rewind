# LocalStack Integration with GitHub Actions

This document summarizes the integration of LocalStack testing into the existing GitHub Actions workflows.

## 🔧 **Changes Made**

### 1. Updated `deploy.yml` Workflow

The existing `deploy.yml` workflow has been enhanced to include LocalStack testing in the `validate` job:

#### New Steps Added:
- **Set up LocalStack for backend tests**: Uses the existing `npm run localstack:setup` command
- **Run LocalStack integration tests**: Executes `npm run localstack:test` and backend integration tests
- **Cleanup LocalStack**: Ensures proper cleanup with `npm run localstack:stop`

### 2. Enhanced Backend Testing

#### Added to `backend/package.json`:
- New script: `test:integration` for running integration tests against LocalStack

#### Created `backend/vitest.integration.config.ts`:
- Vitest configuration for integration tests
- Environment variables for LocalStack connectivity
- Test timeout configuration for AWS service calls

#### Updated `.env.local`:
- LocalStack environment configuration
- AWS credentials for testing
- Service endpoints configuration

## 🚀 **How It Works**

### In GitHub Actions:

1. **Install Dependencies**: LocalStack CLI and AWS CLI are installed
2. **Start LocalStack**: Uses existing `npm run localstack:setup` command
3. **Run Tests**: Executes both the existing LocalStack tests and backend integration tests
4. **Cleanup**: Stops LocalStack containers properly

### Locally:

You can run the same tests locally using:

```bash
# Start LocalStack
npm run localstack:setup

# Run LocalStack tests
npm run localstack:test

# Run backend integration tests
cd backend
npm run test:integration

# Stop LocalStack
npm run localstack:stop
```

## 📋 **Existing LocalStack Infrastructure**

The project already had comprehensive LocalStack setup:

- **Docker Compose**: `docker-compose.localstack.yml` with proper service configuration
- **Initialization Script**: `scripts/localstack-init.sh` for setting up AWS resources
- **Test Script**: `scripts/test-localstack.sh` for comprehensive testing
- **NPM Scripts**: Various commands for LocalStack lifecycle management

## 🔍 **What Gets Tested**

The integration includes testing of:

- **DynamoDB**: Tables creation and data operations
- **S3**: Bucket operations and file storage
- **Lambda**: Function deployment and execution
- **API Gateway**: REST API endpoints
- **Cognito**: User authentication services
- **EventBridge**: Event processing
- **Personalize**: Recommendation services
- **Bedrock**: AI/ML services

## 🎯 **Benefits**

1. **Consistent Testing**: Same LocalStack setup works both locally and in CI/CD
2. **Faster Feedback**: AWS services are tested without real AWS resources
3. **Cost Effective**: No AWS charges for testing
4. **Isolation**: Each test run starts with a clean environment
5. **Reliability**: Tests run consistently across different environments

## 🔧 **Configuration**

### Environment Variables:
- `AWS_ACCESS_KEY_ID=test`
- `AWS_SECRET_ACCESS_KEY=test`
- `AWS_DEFAULT_REGION=us-east-1`
- `LOCALSTACK_ENDPOINT=http://localhost:4566`

### Services Enabled:
- dynamodb, lambda, apigateway, cognito-idp, bedrock, events, personalize, sts, iam, logs, s3

## 📝 **Next Steps**

1. **Create Integration Tests**: Add `.integration.test.ts` files in the backend
2. **Test Real Scenarios**: Test actual Lambda functions against LocalStack
3. **Database Seeding**: Add test data setup for comprehensive testing
4. **Performance Testing**: Monitor test execution time and optimize if needed

## 🐛 **Troubleshooting**

- **LocalStack not starting**: Check Docker is running and ports are available
- **Tests failing**: Verify environment variables and service configuration
- **Slow tests**: Adjust timeout values in `vitest.integration.config.ts`
- **Permission errors**: Ensure proper AWS credentials are set for LocalStack