#!/bin/bash

# Rewind App Deployment Script
# This script deploys the Rewind app to AWS using CDK
# Usage: ./scripts/deploy.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
NODE_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_ACTUAL=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_ACTUAL" -lt "$NODE_VERSION" ]; then
        log_error "Node.js version $NODE_VERSION or higher is required (found: $NODE_ACTUAL)"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        log_warning "CDK CLI not found globally, will use npx"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    npm ci
    log_success "Dependencies installed"
}

# Run validation
run_validation() {
    log_info "Running validation checks..."
    
    # Lint and format check
    log_info "Running lint and format checks..."
    npm run lint
    npm run format:check
    
    # Build check
    log_info "Building all components..."
    npm run build
    
    # Run tests
    log_info "Running tests..."
    npm run test
    
    log_success "Validation completed"
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure..."
    
    cd infra
    
    # Build infrastructure code
    npm run build
    
    # Deploy stacks
    if command -v cdk &> /dev/null; then
        cdk deploy --all --require-approval never
    else
        npx cdk deploy --all --require-approval never
    fi
    
    cd ..
    
    log_success "Infrastructure deployed"
}

# Get CDK outputs
get_cdk_outputs() {
    log_info "Retrieving CDK outputs..."
    
    # Get outputs from CloudFormation stacks
    FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name RewindFrontendStack \
        --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
        --output text)
    
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name RewindFrontendStack \
        --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
        --output text)
    
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name RewindBackendStack \
        --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
        --output text)
    
    USER_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name RewindDataStack \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
        --output text)
    
    USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
        --stack-name RewindDataStack \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
        --output text)
    
    IDENTITY_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name RewindDataStack \
        --query "Stacks[0].Outputs[?OutputKey=='IdentityPoolId'].OutputValue" \
        --output text)
    
    # Validate outputs
    if [ -z "$FRONTEND_BUCKET" ] || [ -z "$API_URL" ] || [ -z "$USER_POOL_ID" ]; then
        log_error "Failed to retrieve required CDK outputs"
        exit 1
    fi
    
    log_success "CDK outputs retrieved"
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend..."
    
    cd frontend
    
    # Create production environment file
    cat > .env.production << EOF
VITE_API_BASE_URL=$API_URL
VITE_AWS_REGION=$AWS_REGION
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
EOF
    
    # Validate API URL format
    echo "API URL: $API_URL"
    if [[ ! "$API_URL" =~ ^https://.*\.execute-api\..*\.amazonaws\.com/.*$ ]]; then
        log_error "Invalid API URL format: $API_URL"
        exit 1
    fi
    
    # Build frontend
    npm run build
    
    # Upload to S3
    aws s3 sync dist/ s3://$FRONTEND_BUCKET/ --delete
    
    # Invalidate CloudFront
    if [ -n "$DISTRIBUTION_ID" ]; then
        log_info "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*" > /dev/null
    fi
    
    cd ..
    
    log_success "Frontend deployed"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Wait for CloudFront invalidation
    log_info "Waiting for CloudFront invalidation to complete..."
    sleep 30
    
    # Check API health
    API_HEALTH_URL="${API_URL}health"
    log_info "Checking API health at: $API_HEALTH_URL"
    
    # Test direct API call
    if curl -f -s "$API_HEALTH_URL" > /dev/null; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        exit 1
    fi
    
    # Test CORS headers
    log_info "Testing CORS headers..."
    CORS_TEST=$(curl -s -H "Origin: https://$DISTRIBUTION_ID.cloudfront.net" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Content-Type,Authorization" \
        -X OPTIONS "$API_HEALTH_URL" -I)
    
    if echo "$CORS_TEST" | grep -q "Access-Control-Allow-Origin"; then
        log_success "CORS headers present"
    else
        log_warning "CORS headers not found in response"
        echo "CORS Response: $CORS_TEST"
    fi
    
    # Check frontend
    FRONTEND_URL=$(aws cloudformation describe-stacks \
        --stack-name RewindFrontendStack \
        --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" \
        --output text)
    
    log_info "Checking frontend at: $FRONTEND_URL"
    
    if curl -f -s "$FRONTEND_URL" > /dev/null; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check failed (may be due to CloudFront propagation delay)"
    fi
    
    log_success "Health checks completed"
}

# Display deployment info
display_deployment_info() {
    log_success "Deployment completed successfully!"
    echo
    echo "Deployment Information:"
    echo "======================"
    echo "Environment: $ENVIRONMENT"
    echo "AWS Region: $AWS_REGION"
    echo "Frontend URL: $FRONTEND_URL"
    echo "API URL: $API_URL"
    echo "S3 Bucket: $FRONTEND_BUCKET"
    if [ -n "$DISTRIBUTION_ID" ]; then
        echo "CloudFront Distribution: $DISTRIBUTION_ID"
    fi
    echo
    echo "Cognito Configuration:"
    echo "User Pool ID: $USER_POOL_ID"
    echo "User Pool Client ID: $USER_POOL_CLIENT_ID"
    echo "Identity Pool ID: $IDENTITY_POOL_ID"
    echo
}

# Main deployment function
main() {
    log_info "Starting Rewind deployment for environment: $ENVIRONMENT"
    
    check_prerequisites
    install_dependencies
    run_validation
    deploy_infrastructure
    get_cdk_outputs
    deploy_frontend
    run_health_checks
    display_deployment_info
    
    log_success "Deployment completed successfully!"
}

# Help function
show_help() {
    echo "Rewind App Deployment Script"
    echo
    echo "Usage: $0 [environment]"
    echo
    echo "Arguments:"
    echo "  environment    Deployment environment (default: production)"
    echo
    echo "Environment Variables:"
    echo "  AWS_REGION     AWS region to deploy to (default: us-east-1)"
    echo
    echo "Examples:"
    echo "  $0                    # Deploy to production"
    echo "  $0 staging           # Deploy to staging"
    echo "  AWS_REGION=us-west-2 $0  # Deploy to us-west-2"
    echo
}

# Parse command line arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Run main function
main