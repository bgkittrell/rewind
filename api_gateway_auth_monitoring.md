# API Gateway Authentication Error Monitoring Guide

## Overview
Your API Gateway now has comprehensive logging enabled to help you monitor authentication errors in real-time. This guide shows you how to use these new monitoring capabilities.

## What Was Added to Your Infrastructure

### 1. Enhanced API Gateway Logging
- **Access Logs**: Detailed authentication context for every request
- **Execution Logs**: Step-by-step API Gateway processing information
- **X-Ray Tracing**: Distributed tracing across API Gateway and Lambda
- **CloudWatch Metrics**: Built-in metrics for error monitoring

### 2. Authentication-Specific Log Fields
```json
{
  "requestTime": "2024-01-15T10:30:00Z",
  "requestId": "abc123",
  "httpMethod": "GET",
  "resourcePath": "/podcasts",
  "sourceIp": "192.168.1.100",
  "user": "john.doe@example.com",
  "userArn": "arn:aws:sts::123456789012:assumed-role/...",
  "cognitoIdentityId": "us-east-1:12345678-1234-1234-1234-123456789012",
  "authorizer.principalId": "user123",
  "authorizer.claims": "{\"sub\":\"12345\",\"email\":\"john.doe@example.com\"}",
  "status": "401",
  "error.message": "Unauthorized",
  "error.messageString": "Missing Authentication Token"
}
```

## Quick Start Commands

### 1. Deploy the Enhanced Monitoring
```bash
# Deploy the updated stack
cd infra
npm run deploy

# Wait for deployment to complete
# The new log groups will be created automatically
```

### 2. Find Your API Gateway ID
```bash
# Get your API Gateway ID from the stack outputs
aws cloudformation describe-stacks \
  --stack-name RewindBackendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text | cut -d'/' -f3 | cut -d'.' -f1
```

### 3. Monitor Authentication Errors in Real-Time
```bash
# Get the API Gateway ID
API_ID=$(aws cloudformation describe-stacks \
  --stack-name RewindBackendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text | cut -d'/' -f3 | cut -d'.' -f1)

# Stream authentication errors live
aws logs tail "/aws/apigateway/${API_ID}/access" \
  --filter-pattern '{ $.status = "401" || $.status = "403" }' \
  --follow
```

## Authentication Error Monitoring Commands

### 1. View Recent Authentication Failures
```bash
# Last hour of 401 errors
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/${API_ID}/access" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern '{ $.status = "401" }'

# Last hour of 403 errors  
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/${API_ID}/access" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern '{ $.status = "403" }'
```

### 2. Authentication Error Patterns
```bash
# Missing Authorization header
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/${API_ID}/access" \
  --filter-pattern '"Missing Authentication Token"'

# Invalid token format
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/${API_ID}/access" \
  --filter-pattern '"Invalid token"'

# Expired tokens
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/${API_ID}/access" \
  --filter-pattern '"Token expired"'
```

### 3. User-Specific Authentication Issues
```bash
# Find all failed requests for a specific user
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/${API_ID}/access" \
  --filter-pattern '{ $.user = "john.doe@example.com" && ($.status = "401" || $.status = "403") }'

# Find all failed requests from a specific IP
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/${API_ID}/access" \
  --filter-pattern '{ $.sourceIp = "192.168.1.100" && ($.status = "401" || $.status = "403") }'
```

## Lambda Authentication Handler Monitoring

### 1. View Auth Handler Logs
```bash
# Find the auth handler function name
AUTH_FUNCTION=$(aws lambda list-functions \
  --query 'Functions[?starts_with(FunctionName, `RewindBackendStack-AuthHandler`)].FunctionName' \
  --output text)

# Stream auth handler logs
aws logs tail "/aws/lambda/${AUTH_FUNCTION}" --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/${AUTH_FUNCTION}" \
  --filter-pattern "ERROR"
```

### 2. Debug Specific Authentication Issues
```bash
# Sign-in failures
aws logs filter-log-events \
  --log-group-name "/aws/lambda/${AUTH_FUNCTION}" \
  --filter-pattern '"POST /auth/signin"'

# Invalid credentials
aws logs filter-log-events \
  --log-group-name "/aws/lambda/${AUTH_FUNCTION}" \
  --filter-pattern '"NotAuthorizedException"'
```

## CloudWatch Dashboards

### 1. Create Authentication Monitoring Dashboard
```bash
# Create dashboard configuration
cat > auth-dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApiGateway", "4XXError", "ApiName", "Rewind API"],
          ["AWS/ApiGateway", "5XXError", "ApiName", "Rewind API"],
          ["AWS/ApiGateway", "Count", "ApiName", "Rewind API"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "API Gateway Errors"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '/aws/apigateway/${API_ID}/access'\n| filter status in [\"401\", \"403\"]\n| stats count() by bin(5m)",
        "region": "us-east-1",
        "title": "Authentication Failures Over Time"
      }
    }
  ]
}
EOF

# Deploy dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "RewindAuthErrors" \
  --dashboard-body file://auth-dashboard.json
```

### 2. Set Up CloudWatch Alarms
```bash
# Alarm for high authentication failure rate
aws cloudwatch put-metric-alarm \
  --alarm-name "RewindAPI-AuthFailures" \
  --alarm-description "Alert on high authentication failures" \
  --metric-name "4XXError" \
  --namespace "AWS/ApiGateway" \
  --statistic "Sum" \
  --period 300 \
  --threshold 10 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions Name=ApiName,Value="Rewind API" \
  --alarm-actions "arn:aws:sns:us-east-1:YOUR_ACCOUNT:alerts"
```

## X-Ray Tracing

### 1. View Authentication Traces
```bash
# Get recent traces with authentication errors
aws xray get-trace-summaries \
  --time-range-type TimeRangeByStartTime \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --filter-expression 'error = true AND annotation.http.status_code = 401'
```

### 2. Analyze Specific Trace
```bash
# Get detailed trace information
aws xray batch-get-traces --trace-ids TRACE_ID_FROM_ABOVE
```

## Testing Your Monitoring Setup

### 1. Generate Test Authentication Errors
```bash
# Test without Authorization header (should generate 401)
curl -X GET "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/podcasts"

# Test with invalid token (should generate 401)
curl -X GET "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/podcasts" \
  -H "Authorization: Bearer invalid_token"
```

### 2. Verify Logs Are Captured
```bash
# Check if the test requests appear in logs
aws logs filter-log-events \
  --log-group-name "/aws/apigateway/${API_ID}/access" \
  --start-time $(date -d '5 minutes ago' +%s)000 \
  --filter-pattern '{ $.resourcePath = "/podcasts" }'
```

## Common Authentication Error Patterns

### 1. Missing Authorization Header
```json
{
  "status": "401",
  "error.message": "Unauthorized",
  "error.messageString": "Missing Authentication Token"
}
```

### 2. Invalid Token Format
```json
{
  "status": "401", 
  "error.message": "Unauthorized",
  "error.messageString": "Invalid token"
}
```

### 3. Expired Token
```json
{
  "status": "401",
  "error.message": "Unauthorized", 
  "error.messageString": "Token expired"
}
```

### 4. Insufficient Permissions
```json
{
  "status": "403",
  "error.message": "Forbidden",
  "authorizer.principalId": "user123"
}
```

## Troubleshooting Common Issues

### 1. No Logs Appearing
- Ensure the stack has been deployed with the new logging configuration
- Check CloudWatch Log Groups exist: `/aws/apigateway/${API_ID}/access`
- Verify API Gateway CloudWatch role permissions

### 2. Missing Authentication Context
- Check if requests include proper `Authorization` header
- Verify Cognito User Pool configuration
- Ensure JWT tokens are properly formatted

### 3. High Error Rates
- Monitor for token expiration patterns
- Check frontend token refresh logic
- Verify Cognito User Pool settings

## Next Steps

1. **Deploy the enhanced monitoring** using `npm run deploy`
2. **Test the monitoring** by making requests to your API
3. **Set up alerts** for authentication failure thresholds
4. **Create CloudWatch dashboards** for ongoing monitoring
5. **Integrate with your CI/CD pipeline** for automated monitoring

## Log Group Names Reference

After deployment, you'll have these log groups:
- `/aws/apigateway/${API_ID}/access` - Access logs with authentication context
- `/aws/apigateway/${API_ID}/execution` - Execution logs for debugging
- `/aws/lambda/RewindBackendStack-AuthHandler*` - Lambda authentication handler logs

Use these log group names in your monitoring scripts and dashboards.