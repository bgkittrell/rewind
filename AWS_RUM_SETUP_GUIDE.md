# AWS RUM Setup Guide for Rewind App

## Overview

This guide explains how to set up AWS RUM (Real User Monitoring) for the Rewind app to troubleshoot the "Unable to load recommendations - Unauthorized access" issue you're experiencing.

## What AWS RUM Provides

AWS RUM will help you:

- Track client-side errors and their context
- Monitor API call performance and failures
- Understand user interactions leading to errors
- Identify patterns in authentication failures
- Get detailed error stack traces and user environment data

## Architecture

The RUM setup includes:

1. **RUM App Monitor** - Collects client-side telemetry
2. **Identity Pool** - Provides authentication for RUM data collection
3. **IAM Roles** - Permissions for authenticated and unauthenticated users
4. **CloudWatch Integration** - Stores and analyzes RUM data
5. **X-Ray Integration** - Distributed tracing for performance analysis

## Infrastructure Components

### 1. RUM App Monitor

- **Name**: `rewind-rum-{region}`
- **Domain**: Your CloudFront distribution domain
- **Telemetries**: Errors, Performance, HTTP requests
- **Sampling Rate**: 100% (for troubleshooting)

### 2. Identity Pool

- **Purpose**: Authenticate RUM data collection
- **Configuration**: Allows unauthenticated users to send RUM data
- **Integration**: Links to existing Cognito User Pool

### 3. IAM Roles

- **Unauthenticated Role**: For anonymous RUM data collection
- **Authenticated Role**: For logged-in users
- **Permissions**: RUM data submission, CloudWatch Logs, X-Ray tracing

## Deployment Steps

### 1. Deploy Infrastructure

```bash
# Build the infrastructure
cd infra
npm run build

# Deploy all stacks (including the new monitoring stack)
npm run deploy
```

### 2. Configure Frontend Environment

After deployment, get the RUM configuration from the AWS Console or CDK outputs:

```bash
# Get the RUM configuration values
aws rum get-app-monitor --name rewind-rum-us-east-1
aws cognito-identity describe-identity-pool --identity-pool-id <identity-pool-id>
```

Update your `.env` file:

```env
VITE_RUM_APPLICATION_ID=your-actual-rum-app-id
VITE_RUM_IDENTITY_POOL_ID=your-actual-identity-pool-id
VITE_RUM_REGION=us-east-1
```

### 3. Build and Deploy Frontend

```bash
# Build frontend with RUM configuration
cd frontend
npm run build

# Deploy to S3/CloudFront
aws s3 sync dist/ s3://your-frontend-bucket/
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Monitoring and Troubleshooting

### 1. RUM Data Collection

The RUM service automatically tracks:

- **API Calls**: All requests to your backend API
- **Errors**: JavaScript errors, API failures, network issues
- **Performance**: Page load times, API response times
- **User Actions**: Navigation, clicks, form submissions
- **Authentication Events**: Login, logout, token refresh

### 2. Recommendation-Specific Events

Special tracking for the recommendation system:

- `recommendation_event.load_attempt` - When user tries to load recommendations
- `recommendation_event.load_success` - Successful recommendation loading
- `recommendation_event.load_error` - Failed recommendation loading with error details

### 3. Viewing RUM Data

#### AWS Console

1. Go to CloudWatch RUM in the AWS Console
2. Select your RUM application
3. View dashboards for errors, performance, and user sessions

#### CloudWatch Logs

RUM data is also stored in CloudWatch Logs at:

- Log Group: `/aws/rum/rewind-rum-{region}`
- Contains detailed error information and user context

#### X-Ray Traces

For detailed performance analysis:

1. Go to X-Ray in the AWS Console
2. View traces for your RUM application
3. Analyze API call chains and identify bottlenecks

## Troubleshooting the Authorization Issue

### Key Metrics to Monitor

1. **Authentication Errors**
   - Check for 401/403 responses on `/recommendations` endpoint
   - Monitor JWT token validation failures
   - Track user authentication state

2. **API Call Patterns**
   - Request headers (presence of Authorization header)
   - Token expiration timing
   - Request/response correlation

3. **Client-Side Context**
   - User agent information
   - Network conditions
   - JavaScript errors preceding API calls

### Common Issues and Solutions

#### 1. Missing Authorization Header

**Symptoms**: 401 Unauthorized without auth header
**RUM Data**: API calls with `hasAuth: false`
**Solution**: Check AuthContext token management

#### 2. Expired Tokens

**Symptoms**: 403 Forbidden with valid header format
**RUM Data**: Pattern of failures after specific time periods
**Solution**: Implement token refresh mechanism

#### 3. Token Format Issues

**Symptoms**: 401 with malformed token
**RUM Data**: Consistent failures with specific token patterns
**Solution**: Validate JWT token structure

#### 4. CORS Issues

**Symptoms**: Network errors on API calls
**RUM Data**: Network errors instead of HTTP status codes
**Solution**: Check API Gateway CORS configuration

## Custom RUM Events

The setup includes custom events for detailed tracking:

### Authentication Events

```javascript
rumService.recordAuthEvent('login', { userId: 'user123' })
rumService.recordAuthEvent('auth_error', { error: 'Token expired' })
```

### API Call Events

```javascript
rumService.recordApiCall('GET /recommendations', url, 'GET', 200, 1500, {
  hasAuth: true,
  filters: { limit: 10, not_recent: true },
})
```

### Recommendation Events

```javascript
rumService.recordRecommendationEvent('load_error', {
  error: 'Unauthorized access',
  filters: { limit: 10 },
})
```

## Data Analysis Queries

### CloudWatch Insights Queries

Find authentication errors:

```sql
fields @timestamp, @message
| filter @message like /auth_error/
| sort @timestamp desc
| limit 100
```

Track API failures:

```sql
fields @timestamp, @message
| filter @message like /api_call/ and @message like /statusCode.*[45][0-9][0-9]/
| sort @timestamp desc
| limit 100
```

Monitor recommendation loading:

```sql
fields @timestamp, @message
| filter @message like /recommendation_event/
| stats count() by eventType
```

## Performance Optimization

### Sampling Rate

- **Production**: Set to 0.1 (10%) for cost optimization
- **Troubleshooting**: Set to 1.0 (100%) for complete data
- **Development**: Set to 0.05 (5%) for minimal overhead

### Data Retention

- **RUM Data**: 30 days by default
- **CloudWatch Logs**: Configurable (recommend 7-30 days)
- **Cost**: Monitor usage and adjust retention as needed

## Cost Considerations

- **RUM Events**: ~$0.10 per 100,000 events
- **CloudWatch Logs**: ~$0.50 per GB
- **X-Ray Traces**: ~$5.00 per 1 million traces
- **Storage**: Minimal cost for short-term troubleshooting

## Next Steps

1. **Deploy the infrastructure** with the new monitoring stack
2. **Configure frontend environment** with RUM credentials
3. **Test the application** to generate RUM data
4. **Monitor RUM dashboard** for authentication patterns
5. **Analyze error patterns** to identify root cause
6. **Implement fixes** based on RUM insights

## Support

For issues with this setup:

1. Check CloudWatch RUM service limits
2. Verify IAM permissions for RUM roles
3. Ensure frontend environment variables are set correctly
4. Monitor browser console for RUM initialization errors

The RUM setup provides comprehensive monitoring to identify and resolve the authorization issue you're experiencing with the recommendations feature.
