# API Gateway Authentication Troubleshooting Guide

## Overview

This guide explains how to view and troubleshoot authentication errors in the Rewind API Gateway layer, which uses AWS Cognito User Pool Authorizer for JWT-based authentication.

## Viewing Authentication Errors

### 1. CloudWatch Logs

After deploying the updated infrastructure with logging enabled, API Gateway will send detailed logs to CloudWatch.

#### Access CloudWatch Logs:

1. **Via AWS Console:**
   ```
   1. Navigate to CloudWatch Console
   2. Go to "Log groups" in the left sidebar
   3. Look for: /aws/apigateway/rewind-api/prod
   4. Click on the log group to view log streams
   ```

2. **Via AWS CLI:**
   ```bash
   # List recent log streams
   aws logs describe-log-streams \
     --log-group-name "/aws/apigateway/rewind-api/prod" \
     --order-by LastEventTime \
     --descending \
     --limit 10

   # View logs from a specific stream
   aws logs filter-log-events \
     --log-group-name "/aws/apigateway/rewind-api/prod" \
     --start-time $(date -u -d '1 hour ago' +%s)000
   ```

### 2. API Gateway Execution Logs

The logs will contain:
- **Authorization headers** (masked for security)
- **Authorizer execution results**
- **HTTP status codes**
- **Error messages**

#### Common Authentication Error Patterns:

```json
// Expired Token
{
  "authorizerError": "The token has expired",
  "httpMethod": "GET",
  "path": "/podcasts",
  "status": 401,
  "error": "Unauthorized"
}

// Invalid Token
{
  "authorizerError": "The token could not be validated",
  "httpMethod": "POST",
  "path": "/podcasts",
  "status": 401,
  "error": "Unauthorized"
}

// Missing Authorization Header
{
  "authorizerError": "Authorization header requires 'Bearer' followed by a token",
  "httpMethod": "GET",
  "path": "/episodes/123",
  "status": 401,
  "error": "Unauthorized"
}
```

### 3. CloudWatch Insights Queries

Use CloudWatch Insights for advanced log analysis:

```sql
-- Find all authentication errors in the last hour
fields @timestamp, @message
| filter @message like /401|Unauthorized|authorizerError/
| sort @timestamp desc
| limit 100

-- Count authentication errors by endpoint
fields @timestamp, httpMethod, path
| filter status = 401
| stats count() by path
| sort count desc

-- Find specific user authentication failures
fields @timestamp, @message
| filter @message like /YOUR_USER_EMAIL/
| filter status = 401
| sort @timestamp desc
```

### 4. CloudWatch Metrics

Monitor authentication metrics in real-time:

1. **4XXError metric**: Shows client errors including authentication failures
2. **Count metric**: Total API calls
3. **Latency metric**: Response times

Create a CloudWatch Dashboard:
```bash
aws cloudwatch put-dashboard \
  --dashboard-name RewindAPIAuth \
  --dashboard-body file://auth-dashboard.json
```

### 5. X-Ray Tracing

With X-Ray enabled, you can trace authentication flows:

1. **Via AWS Console:**
   - Navigate to X-Ray Console
   - Go to "Service Map" to see authentication flow
   - Click on API Gateway node to see error rates

2. **Via AWS CLI:**
   ```bash
   # Get traces with authentication errors
   aws xray get-trace-summaries \
     --time-range-type LastHour \
     --filter-expression "service(\"rewind-api\") AND http.status = 401"
   ```

## Common Authentication Issues and Solutions

### 1. Token Expired (401)
**Error**: "The token has expired"
**Solution**: 
- Refresh the access token using the refresh token
- Frontend should automatically handle token refresh

### 2. Invalid Token Format (401)
**Error**: "Authorization header requires 'Bearer' followed by a token"
**Solution**: 
- Ensure the Authorization header format: `Bearer <token>`
- Check for extra spaces or missing "Bearer" prefix

### 3. Token Not Yet Valid (401)
**Error**: "Token used before issued at claim (iat)"
**Solution**: 
- Check system clock synchronization
- Ensure token is used after its issue time

### 4. Invalid Audience (401)
**Error**: "Token was not issued for this audience"
**Solution**: 
- Verify the token's `aud` claim matches your User Pool Client ID
- Check Cognito configuration

### 5. CORS Preflight Failures
**Error**: CORS errors before authentication
**Solution**: 
- Ensure OPTIONS requests are not authenticated
- Check CORS configuration allows Authorization header

## Testing Authentication

### 1. Test with cURL
```bash
# Get a token (replace with your credentials)
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id YOUR_CLIENT_ID \
  --auth-parameters USERNAME=test@example.com,PASSWORD=YourPassword \
  --query 'AuthenticationResult.AccessToken' \
  --output text)

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://YOUR_API_URL/prod/podcasts
```

### 2. Test Invalid Scenarios
```bash
# Test expired token
curl -H "Authorization: Bearer EXPIRED_TOKEN" \
  https://YOUR_API_URL/prod/podcasts

# Test missing bearer prefix
curl -H "Authorization: $TOKEN" \
  https://YOUR_API_URL/prod/podcasts

# Test no authorization header
curl https://YOUR_API_URL/prod/podcasts
```

## Monitoring Best Practices

1. **Set up CloudWatch Alarms:**
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name "RewindAPI-HighAuthFailures" \
     --alarm-description "Alert when authentication failures exceed threshold" \
     --metric-name 4XXError \
     --namespace AWS/ApiGateway \
     --statistic Sum \
     --period 300 \
     --threshold 50 \
     --comparison-operator GreaterThanThreshold \
     --evaluation-periods 2
   ```

2. **Create Authentication Dashboard:**
   - 401 error rate over time
   - Top failing endpoints
   - Authentication latency
   - Token expiration patterns

3. **Enable Detailed Metrics:**
   - Per-method metrics for granular monitoring
   - Custom metrics for specific auth scenarios

## Debugging Tips

1. **Enable Debug Logging Temporarily:**
   ```typescript
   // In CDK stack (use with caution - logs sensitive data)
   loggingLevel: apigateway.MethodLoggingLevel.INFO,
   dataTraceEnabled: true, // Disable in production
   ```

2. **Use Request IDs:**
   - Every API Gateway request has a unique request ID
   - Find it in response headers: `x-amzn-RequestId`
   - Use it to trace specific failures in logs

3. **Check Cognito User Pool:**
   ```bash
   # Verify user pool configuration
   aws cognito-idp describe-user-pool \
     --user-pool-id YOUR_USER_POOL_ID

   # Check user status
   aws cognito-idp admin-get-user \
     --user-pool-id YOUR_USER_POOL_ID \
     --username test@example.com
   ```

## Security Considerations

1. **Log Retention:**
   - Set appropriate retention periods for logs
   - Consider compliance requirements

2. **Sensitive Data:**
   - Never log full JWT tokens
   - Mask sensitive user information
   - Disable `dataTraceEnabled` in production

3. **Access Control:**
   - Limit who can view CloudWatch logs
   - Use IAM policies to control access

## Next Steps

After setting up logging:

1. Deploy the updated infrastructure:
   ```bash
   npm run deploy:backend
   ```

2. Make some API calls to generate logs

3. Check CloudWatch Logs for authentication events

4. Set up alarms for high failure rates

5. Create a monitoring dashboard for ongoing visibility