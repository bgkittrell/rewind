# Debugging Authentication Errors at API Gateway Layer

## Current Authentication Setup

Your API Gateway is configured with:
- **Cognito User Pool Authorizer** (`RewindCognitoAuthorizer`)
- **Authorization Type**: `COGNITO` for protected endpoints
- **Cache TTL**: 0 seconds (good for debugging)
- **Identity Source**: `method.request.header.Authorization`

## 1. Enable API Gateway Logging

First, enable detailed logging for your API Gateway:

### A. Enable CloudWatch Logs for API Gateway

Add this to your `infra/lib/rewind-backend-stack.ts`:

```typescript
// Add this after creating the API Gateway
const apiLogGroup = new logs.LogGroup(this, 'ApiGatewayLogs', {
  logGroupName: `/aws/apigateway/${api.restApiId}`,
  retention: logs.RetentionDays.ONE_WEEK,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
})

// Enable detailed CloudWatch logging
const deployment = new apigateway.Deployment(this, 'ApiDeployment', {
  api,
  stageName: 'prod',
})

const stage = new apigateway.Stage(this, 'ApiStage', {
  deployment,
  stageName: 'prod',
  loggingLevel: apigateway.MethodLoggingLevel.INFO,
  dataTraceEnabled: true,
  metricsEnabled: true,
  accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
  accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
    caller: false,
    httpMethod: true,
    ip: true,
    protocol: true,
    requestTime: true,
    resourcePath: true,
    responseLength: true,
    status: true,
    user: true,
    requestId: true,
    extendedRequestId: true,
    errorMessage: true,
    errorMessageString: true,
  }),
})
```

### B. View API Gateway Logs

```bash
# View API Gateway access logs
aws logs describe-log-groups --log-group-name-prefix "/aws/apigateway"

# Stream logs in real-time
aws logs tail "/aws/apigateway/YOUR_API_ID" --follow

# View specific time range
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/YOUR_API_ID" \
  --start-time 1640995200000 \
  --end-time 1640995800000 \
  --filter-pattern "ERROR"
```

## 2. Check Cognito Authentication Errors

### A. View Cognito User Pool Logs

```bash
# Get your User Pool ID from CDK output
aws cognito-idp describe-user-pool --user-pool-id YOUR_USER_POOL_ID

# Check Cognito events
aws logs filter-log-events \
  --log-group-name "/aws/cognito/userpools/YOUR_USER_POOL_ID" \
  --filter-pattern "ERROR"
```

### B. Debug Authorization Header

Common authorization header issues:

```bash
# Correct format
Authorization: Bearer <JWT_TOKEN>

# Check if token is valid
aws cognito-idp get-user --access-token YOUR_ACCESS_TOKEN
```

## 3. Lambda Function Logs

### A. View Auth Handler Logs

```bash
# Find your Lambda function
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `RewindBackendStack-AuthHandler`)]'

# View logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/RewindBackendStack-AuthHandler" \
  --filter-pattern "ERROR"

# Stream logs
aws logs tail "/aws/lambda/RewindBackendStack-AuthHandler" --follow
```

### B. Debug Lambda Context

Add debug logging to your Lambda handlers:

```typescript
// Add this to your protected Lambda handlers
console.log('Event:', JSON.stringify(event, null, 2))
console.log('Authorization header:', event.headers.Authorization)
console.log('Request context:', JSON.stringify(event.requestContext, null, 2))
```

## 4. Common Authentication Error Patterns

### A. 401 Unauthorized Errors

**Check for these patterns in logs:**

```bash
# API Gateway logs
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/YOUR_API_ID" \
  --filter-pattern "401"

# Look for specific error messages
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/YOUR_API_ID" \
  --filter-pattern "Unauthorized"
```

**Common causes:**
- Missing Authorization header
- Invalid JWT token format
- Expired token
- Wrong token type (ID token vs Access token)

### B. 403 Forbidden Errors

**Check for:**
- Cognito User Pool configuration mismatch
- Authorizer configuration issues
- Resource-based access denials

```bash
# Check for 403 errors
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/YOUR_API_ID" \
  --filter-pattern "403"
```

### C. 500 Internal Server Errors

**Check Lambda function logs:**
```bash
aws logs filter-log-events \
  --log-group-name "/aws/lambda/RewindBackendStack-AuthHandler" \
  --filter-pattern "500"
```

## 5. Test Authentication Endpoints

### A. Test Auth Endpoints Directly

```bash
# Test sign up
curl -X POST "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TempPassword123!","name":"Test User"}'

# Test sign in
curl -X POST "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TempPassword123!"}'
```

### B. Test Protected Endpoints

```bash
# Test with valid token
curl -X GET "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/podcasts" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Test without token (should return 401)
curl -X GET "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/podcasts"
```

## 6. Debug with AWS Console

### A. API Gateway Console
1. Go to API Gateway console
2. Select your API
3. Go to "Stages" → "prod" → "Logs/Tracing"
4. Enable CloudWatch Logs and X-Ray tracing
5. Check "Log full requests/responses data"

### B. CloudWatch Console
1. Go to CloudWatch → Log groups
2. Look for:
   - `/aws/apigateway/YOUR_API_ID`
   - `/aws/lambda/RewindBackendStack-AuthHandler`
   - `/aws/cognito/userpools/YOUR_USER_POOL_ID`

### C. Cognito Console
1. Go to Cognito → User pools
2. Select your user pool
3. Check "Sign-in experience" settings
4. Verify App client settings
5. Check "User pool properties"

## 7. Enable X-Ray Tracing

Add X-Ray tracing to your CDK stack:

```typescript
// Add to your API Gateway configuration
const api = new apigateway.RestApi(this, 'RewindApi', {
  // ... existing config
  deployOptions: {
    stageName: 'prod',
    tracingEnabled: true, // Enable X-Ray tracing
  },
})

// Enable tracing on Lambda functions
const podcastFunction = new NodejsFunction(this, 'PodcastHandler', {
  // ... existing config
  tracing: lambda.Tracing.ACTIVE,
})
```

## 8. Monitor Real-Time Errors

### A. CloudWatch Dashboard

Create a dashboard to monitor auth errors:

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "RewindAuthErrors" \
  --dashboard-body file://dashboard.json
```

### B. CloudWatch Alarms

Set up alarms for auth failures:

```bash
# Create alarm for 401 errors
aws cloudwatch put-metric-alarm \
  --alarm-name "RewindAPI-401-Errors" \
  --alarm-description "Alert on 401 errors" \
  --metric-name "4XXError" \
  --namespace "AWS/ApiGateway" \
  --statistic "Sum" \
  --period 300 \
  --threshold 5 \
  --comparison-operator "GreaterThanThreshold"
```

## 9. Quick Debugging Commands

```bash
# Get API Gateway ID
aws apigateway get-rest-apis --query 'items[?name==`Rewind API`].id' --output text

# Get recent errors
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/$(aws apigateway get-rest-apis --query 'items[?name==`Rewind API`].id' --output text)" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"

# Check Lambda function errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/RewindBackendStack-AuthHandler" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"
```

## 10. Common Issues and Solutions

### Issue: "Missing Authentication Token"
**Solution:** Check if Authorization header is properly formatted

### Issue: "Invalid signature"
**Solution:** Verify the JWT token hasn't expired and is properly formatted

### Issue: "User pool does not exist"
**Solution:** Check Cognito User Pool configuration in CDK

### Issue: "Access denied"
**Solution:** Check IAM permissions for Lambda execution role

## Next Steps

1. Enable logging as shown above
2. Deploy the updated stack
3. Monitor logs during authentication attempts
4. Use the debugging commands to identify specific error patterns
5. Check both API Gateway and Lambda logs for complete error context