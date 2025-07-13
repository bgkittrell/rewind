#!/bin/bash

# LocalStack initialization script for Rewind project
# This script creates the necessary AWS resources in LocalStack

set -e

echo "🚀 Initializing LocalStack for Rewind project..."

# Configuration
AWS_ENDPOINT="http://localhost:4566"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="test"
AWS_SECRET_ACCESS_KEY="test"

# Function to wait for LocalStack to be ready
wait_for_localstack() {
    echo "⏳ Waiting for LocalStack to be ready..."
    until curl -s $AWS_ENDPOINT > /dev/null 2>&1; do
        sleep 2
    done
    echo "✅ LocalStack is ready!"
}

# Function to create DynamoDB tables
create_dynamodb_tables() {
    echo "📊 Creating DynamoDB tables..."
    
    # Users table
    aws dynamodb create-table \
        --table-name users \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
        --key-schema \
            AttributeName=id,KeyType=HASH \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION

    # Podcasts table
    aws dynamodb create-table \
        --table-name podcasts \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
        --key-schema \
            AttributeName=id,KeyType=HASH \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION

    # Episodes table
    aws dynamodb create-table \
        --table-name episodes \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
            AttributeName=podcastId,AttributeType=S \
        --key-schema \
            AttributeName=id,KeyType=HASH \
        --global-secondary-indexes \
            IndexName=podcastId-index,KeySchema=[{AttributeName=podcastId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION

    # Listening History table
    aws dynamodb create-table \
        --table-name listeningHistory \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
            AttributeName=userId,AttributeType=S \
        --key-schema \
            AttributeName=id,KeyType=HASH \
        --global-secondary-indexes \
            IndexName=userId-index,KeySchema=[{AttributeName=userId,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION

    # Shares table
    aws dynamodb create-table \
        --table-name shares \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
        --key-schema \
            AttributeName=id,KeyType=HASH \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION

    echo "✅ DynamoDB tables created successfully!"
}

# Function to create Cognito User Pool
create_cognito_user_pool() {
    echo "🔐 Creating Cognito User Pool..."
    
    # Create User Pool
    USER_POOL_ID=$(aws cognito-idp create-user-pool \
        --pool-name RewindUserPool \
        --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
        --auto-verified-attributes email \
        --username-attributes email \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION \
        --output text \
        --query 'UserPool.Id')

    echo "User Pool ID: $USER_POOL_ID"

    # Create User Pool Client
    USER_POOL_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
        --user-pool-id $USER_POOL_ID \
        --client-name RewindWebClient \
        --generate-secret false \
        --explicit-auth-flows ALLOW_USER_SRP_AUTH ALLOW_USER_PASSWORD_AUTH ALLOW_ADMIN_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION \
        --output text \
        --query 'UserPoolClient.ClientId')

    echo "User Pool Client ID: $USER_POOL_CLIENT_ID"

    # Save IDs to environment file
    echo "USER_POOL_ID=$USER_POOL_ID" >> .env.local
    echo "USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID" >> .env.local

    echo "✅ Cognito User Pool created successfully!"
}

# Function to create S3 bucket for file storage
create_s3_bucket() {
    echo "🪣 Creating S3 bucket..."
    
    aws s3 mb s3://rewind-local-assets \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION

    echo "✅ S3 bucket created successfully!"
}

# Function to create sample data
create_sample_data() {
    echo "📝 Creating sample data..."
    
    # Create a sample user
    aws dynamodb put-item \
        --table-name users \
        --item '{
            "id": {"S": "test-user-1"},
            "email": {"S": "test@example.com"},
            "name": {"S": "Test User"},
            "createdAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
        }' \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION

    # Create a sample podcast
    aws dynamodb put-item \
        --table-name podcasts \
        --item '{
            "id": {"S": "test-podcast-1"},
            "title": {"S": "Test Podcast"},
            "description": {"S": "A test podcast for LocalStack"},
            "author": {"S": "Test Author"},
            "rssUrl": {"S": "https://example.com/feed.xml"},
            "imageUrl": {"S": "https://example.com/image.jpg"},
            "createdAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
        }' \
        --endpoint-url $AWS_ENDPOINT \
        --region $AWS_REGION

    echo "✅ Sample data created successfully!"
}

# Main execution
main() {
    wait_for_localstack
    create_dynamodb_tables
    create_cognito_user_pool
    create_s3_bucket
    create_sample_data
    
    echo "🎉 LocalStack initialization complete!"
    echo "📊 DynamoDB Tables: users, podcasts, episodes, listeningHistory, shares"
    echo "🔐 Cognito User Pool: RewindUserPool"
    echo "🪣 S3 Bucket: rewind-local-assets"
    echo "🌐 LocalStack Web UI: http://localhost:8080"
    echo "🔗 AWS Services Endpoint: http://localhost:4566"
}

main "$@"