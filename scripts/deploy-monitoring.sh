#!/bin/bash

# Deploy Enhanced API Gateway Authentication Monitoring
# This script deploys the enhanced monitoring setup and provides immediate feedback

set -e

echo "🚀 Deploying Enhanced API Gateway Authentication Monitoring..."

# Change to infrastructure directory
cd "$(dirname "$0")/../infra"

# Deploy the CDK stack
echo "📦 Deploying CDK stack with enhanced logging..."
npm run deploy

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete..."
sleep 5

# Get API Gateway ID
echo "🔍 Getting API Gateway ID..."
API_ID=$(aws cloudformation describe-stacks \
  --stack-name RewindBackendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text | cut -d'/' -f3 | cut -d'.' -f1)

if [ -z "$API_ID" ]; then
  echo "❌ Could not retrieve API Gateway ID. Check your deployment."
  exit 1
fi

echo "✅ API Gateway ID: $API_ID"

# Check if log groups were created
echo "🔍 Checking CloudWatch Log Groups..."
ACCESS_LOG_GROUP="/aws/apigateway/${API_ID}/access"
EXECUTION_LOG_GROUP="/aws/apigateway/${API_ID}/execution"

if aws logs describe-log-groups --log-group-name-prefix "$ACCESS_LOG_GROUP" --query 'logGroups[0].logGroupName' --output text | grep -q "$ACCESS_LOG_GROUP"; then
  echo "✅ Access log group created: $ACCESS_LOG_GROUP"
else
  echo "⚠️  Access log group not found. It may take a few minutes to appear."
fi

if aws logs describe-log-groups --log-group-name-prefix "$EXECUTION_LOG_GROUP" --query 'logGroups[0].logGroupName' --output text | grep -q "$EXECUTION_LOG_GROUP"; then
  echo "✅ Execution log group created: $EXECUTION_LOG_GROUP"
else
  echo "⚠️  Execution log group not found. It may take a few minutes to appear."
fi

# Get Lambda function name
echo "🔍 Finding Lambda function names..."
AUTH_FUNCTION=$(aws lambda list-functions \
  --query 'Functions[?starts_with(FunctionName, `RewindBackendStack-AuthHandler`)].FunctionName' \
  --output text)

if [ -n "$AUTH_FUNCTION" ]; then
  echo "✅ Auth handler function: $AUTH_FUNCTION"
else
  echo "⚠️  Auth handler function not found."
fi

# Test API Gateway health endpoint
echo "🔍 Testing API Gateway health endpoint..."
API_URL=$(aws cloudformation describe-stacks \
  --stack-name RewindBackendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

if curl -s "${API_URL}health" | grep -q "healthy"; then
  echo "✅ API Gateway health check passed"
else
  echo "⚠️  API Gateway health check failed"
fi

# Test authentication error logging
echo "🧪 Testing authentication error logging..."
echo "Making a request without authorization to generate a 401 error..."

# Make request without auth header to generate 401
curl -s -o /dev/null -w "%{http_code}" "${API_URL}podcasts" > /tmp/test_response.txt
RESPONSE_CODE=$(cat /tmp/test_response.txt)
rm -f /tmp/test_response.txt

if [ "$RESPONSE_CODE" = "401" ]; then
  echo "✅ Authentication error generated successfully (HTTP 401)"
  echo "⏳ Waiting 30 seconds for logs to appear..."
  sleep 30
  
  # Check if the error appears in logs
  echo "🔍 Checking if error appears in access logs..."
  if aws logs filter-log-events \
    --log-group-name "$ACCESS_LOG_GROUP" \
    --start-time $(date -d '2 minutes ago' +%s)000 \
    --filter-pattern '{ $.status = "401" }' \
    --query 'events[0].message' \
    --output text | grep -q "401"; then
    echo "✅ Authentication error successfully logged!"
  else
    echo "⚠️  Error not found in logs yet. May take a few minutes to appear."
  fi
else
  echo "⚠️  Unexpected response code: $RESPONSE_CODE"
fi

# Create monitoring commands file
echo "📝 Creating monitoring commands file..."
cat > ../auth-monitoring-commands.sh << EOF
#!/bin/bash

# Quick Authentication Error Monitoring Commands
# API Gateway ID: $API_ID

# Real-time authentication error monitoring
echo "🔴 Streaming authentication errors (Ctrl+C to stop)..."
aws logs tail "/aws/apigateway/${API_ID}/access" \\
  --filter-pattern '{ \$.status = "401" || \$.status = "403" }' \\
  --follow

# To run other commands, comment out the streaming command above and uncomment below:

# # Recent authentication failures (last hour)
# aws logs filter-log-events \\
#   --log-group-name "/aws/apigateway/${API_ID}/access" \\
#   --start-time \$(date -d '1 hour ago' +%s)000 \\
#   --filter-pattern '{ \$.status = "401" || \$.status = "403" }'

# # Lambda auth handler errors
# aws logs filter-log-events \\
#   --log-group-name "/aws/lambda/${AUTH_FUNCTION}" \\
#   --filter-pattern "ERROR"

# # Test authentication error generation
# curl -X GET "${API_URL}podcasts"  # Should return 401
EOF

chmod +x ../auth-monitoring-commands.sh

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📊 Monitoring Setup:"
echo "   • API Gateway ID: $API_ID"
echo "   • Access Logs: $ACCESS_LOG_GROUP"
echo "   • Execution Logs: $EXECUTION_LOG_GROUP"
echo "   • Auth Handler: $AUTH_FUNCTION"
echo ""
echo "🔧 Quick Start:"
echo "   1. Run: ./auth-monitoring-commands.sh"
echo "   2. Open CloudWatch Console: https://console.aws.amazon.com/cloudwatch/"
echo "   3. Check X-Ray Console: https://console.aws.amazon.com/xray/"
echo ""
echo "📖 Full Guide: See 'api_gateway_auth_monitoring.md' for detailed instructions"
echo ""
echo "✅ Your API Gateway authentication monitoring is now active!"