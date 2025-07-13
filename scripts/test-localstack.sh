#!/bin/bash

# LocalStack testing script for Rewind project
# This script tests the LocalStack setup and validates AWS services

set -e

echo "🧪 Testing LocalStack setup for Rewind project..."

# Configuration
AWS_ENDPOINT="http://localhost:4566"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="test"
AWS_SECRET_ACCESS_KEY="test"

# Function to test if LocalStack is running
test_localstack_running() {
    echo "🔍 Testing if LocalStack is running..."
    if curl -s $AWS_ENDPOINT/health > /dev/null; then
        echo "✅ LocalStack is running"
        return 0
    else
        echo "❌ LocalStack is not running. Please start it with: npm run localstack:start"
        return 1
    fi
}

# Function to test DynamoDB
test_dynamodb() {
    echo "🔍 Testing DynamoDB..."
    
    # List tables
    TABLES=$(aws dynamodb list-tables \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION \
        --output json \
        --query 'TableNames' 2>/dev/null || echo "[]")
    
    if echo "$TABLES" | grep -q "users"; then
        echo "✅ DynamoDB - Users table exists"
    else
        echo "❌ DynamoDB - Users table missing"
        return 1
    fi
    
    if echo "$TABLES" | grep -q "podcasts"; then
        echo "✅ DynamoDB - Podcasts table exists"
    else
        echo "❌ DynamoDB - Podcasts table missing"
        return 1
    fi
    
    # Test writing and reading data
    aws dynamodb put-item \
        --table-name users \
        --item '{"id": {"S": "test-user-localstack"}, "email": {"S": "test@localstack.com"}}' \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION > /dev/null
    
    ITEM=$(aws dynamodb get-item \
        --table-name users \
        --key '{"id": {"S": "test-user-localstack"}}' \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION \
        --output json 2>/dev/null)
    
    if echo "$ITEM" | grep -q "test@localstack.com"; then
        echo "✅ DynamoDB - Read/Write operations working"
    else
        echo "❌ DynamoDB - Read/Write operations failed"
        return 1
    fi
}

# Function to test Cognito
test_cognito() {
    echo "🔍 Testing Cognito..."
    
    # List user pools
    POOLS=$(aws cognito-idp list-user-pools \
        --max-results 10 \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION \
        --output json 2>/dev/null)
    
    if echo "$POOLS" | grep -q "RewindUserPool"; then
        echo "✅ Cognito - User pool exists"
    else
        echo "❌ Cognito - User pool missing"
        return 1
    fi
    
    # Get user pool ID
    USER_POOL_ID=$(echo "$POOLS" | jq -r '.UserPools[] | select(.Name == "RewindUserPool") | .Id')
    
    if [ "$USER_POOL_ID" != "null" ] && [ -n "$USER_POOL_ID" ]; then
        echo "✅ Cognito - User pool ID: $USER_POOL_ID"
    else
        echo "❌ Cognito - Could not retrieve user pool ID"
        return 1
    fi
}

# Function to test S3
test_s3() {
    echo "🔍 Testing S3..."
    
    # List buckets
    BUCKETS=$(aws s3 ls \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION 2>/dev/null || echo "")
    
    if echo "$BUCKETS" | grep -q "rewind-local-assets"; then
        echo "✅ S3 - Bucket exists"
    else
        echo "❌ S3 - Bucket missing"
        return 1
    fi
    
    # Test file upload
    echo "test content" > /tmp/test-file.txt
    aws s3 cp /tmp/test-file.txt s3://rewind-local-assets/test-file.txt \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION > /dev/null
    
    # Test file download
    aws s3 cp s3://rewind-local-assets/test-file.txt /tmp/test-file-downloaded.txt \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION > /dev/null
    
    if [ -f "/tmp/test-file-downloaded.txt" ]; then
        echo "✅ S3 - File upload/download working"
        rm -f /tmp/test-file.txt /tmp/test-file-downloaded.txt
    else
        echo "❌ S3 - File upload/download failed"
        return 1
    fi
}

# Function to test Lambda (if deployed)
test_lambda() {
    echo "🔍 Testing Lambda..."
    
    # List functions
    FUNCTIONS=$(aws lambda list-functions \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION \
        --output json 2>/dev/null || echo '{"Functions": []}')
    
    FUNCTION_COUNT=$(echo "$FUNCTIONS" | jq '.Functions | length')
    
    if [ "$FUNCTION_COUNT" -gt 0 ]; then
        echo "✅ Lambda - $FUNCTION_COUNT functions found"
    else
        echo "⚠️  Lambda - No functions deployed (this is expected for initial setup)"
    fi
}

# Function to test API Gateway (if deployed)
test_api_gateway() {
    echo "🔍 Testing API Gateway..."
    
    # List APIs
    APIS=$(aws apigateway get-rest-apis \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION \
        --output json 2>/dev/null || echo '{"items": []}')
    
    API_COUNT=$(echo "$APIS" | jq '.items | length')
    
    if [ "$API_COUNT" -gt 0 ]; then
        echo "✅ API Gateway - $API_COUNT APIs found"
    else
        echo "⚠️  API Gateway - No APIs deployed (this is expected for initial setup)"
    fi
}

# Function to show LocalStack status
show_localstack_status() {
    echo "📊 LocalStack Status:"
    
    # Get LocalStack health
    HEALTH=$(curl -s $AWS_ENDPOINT/health 2>/dev/null || echo '{}')
    
    echo "Available services:"
    echo "$HEALTH" | jq -r '. | to_entries[] | select(.value == "available") | "✅ \(.key)"' 2>/dev/null || echo "Could not retrieve service status"
    
    echo ""
    echo "Running services:"
    echo "$HEALTH" | jq -r '. | to_entries[] | select(.value == "running") | "🟢 \(.key)"' 2>/dev/null || echo "Could not retrieve service status"
}

# Main execution
main() {
    echo "🧪 LocalStack Test Suite"
    echo "========================"
    
    # Check if LocalStack is running
    if ! test_localstack_running; then
        exit 1
    fi
    
    echo ""
    show_localstack_status
    
    echo ""
    echo "🔧 Testing AWS Services:"
    echo "========================"
    
    # Test individual services
    local test_passed=0
    local test_total=0
    
    # Core services tests
    ((test_total++))
    if test_dynamodb; then ((test_passed++)); fi
    
    ((test_total++))
    if test_cognito; then ((test_passed++)); fi
    
    ((test_total++))
    if test_s3; then ((test_passed++)); fi
    
    # Optional services tests
    test_lambda
    test_api_gateway
    
    echo ""
    echo "📋 Test Results:"
    echo "================"
    echo "✅ Passed: $test_passed/$test_total core tests"
    
    if [ $test_passed -eq $test_total ]; then
        echo "🎉 All core tests passed! LocalStack is ready for development."
        exit 0
    else
        echo "❌ Some tests failed. Please check the LocalStack setup."
        exit 1
    fi
}

main "$@"