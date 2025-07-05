#!/bin/bash

# Setup CloudWatch Log Groups for Rewind App
# This script creates the log groups required for browser logging

set -e

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
LOG_RETENTION_DAYS=${LOG_RETENTION_DAYS:-30}

echo "Setting up CloudWatch Log Groups for Rewind App..."
echo "Region: $AWS_REGION"
echo "Retention: $LOG_RETENTION_DAYS days"
echo ""

# Function to create log group if it doesn't exist
create_log_group() {
    local log_group_name=$1
    local description=$2
    
    echo "Creating log group: $log_group_name"
    
    # Check if log group exists
    if aws logs describe-log-groups --log-group-name-prefix "$log_group_name" --region "$AWS_REGION" --query "logGroups[?logGroupName=='$log_group_name']" --output text | grep -q "$log_group_name"; then
        echo "  ✓ Log group $log_group_name already exists"
    else
        # Create log group
        aws logs create-log-group \
            --log-group-name "$log_group_name" \
            --region "$AWS_REGION"
        echo "  ✓ Created log group: $log_group_name"
    fi
    
    # Set retention policy
    aws logs put-retention-policy \
        --log-group-name "$log_group_name" \
        --retention-in-days "$LOG_RETENTION_DAYS" \
        --region "$AWS_REGION"
    echo "  ✓ Set retention policy: $LOG_RETENTION_DAYS days"
    echo ""
}

# Create all required log groups
create_log_group "/rewind/browser-logs" "General browser logs and debug information"
create_log_group "/rewind/browser-errors" "Browser JavaScript errors and exceptions"
create_log_group "/rewind/auth-errors" "Authentication and authorization errors"
create_log_group "/rewind/api-calls" "API call monitoring and performance metrics"

echo "✅ CloudWatch Log Groups setup complete!"
echo ""
echo "You can view the logs in the AWS Console:"
echo "https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups"
echo ""
echo "To view logs from command line:"
echo "aws logs tail /rewind/auth-errors --follow --region $AWS_REGION"
echo "aws logs tail /rewind/browser-errors --follow --region $AWS_REGION"
echo "aws logs tail /rewind/api-calls --follow --region $AWS_REGION"
echo ""
echo "To create a CloudWatch dashboard:"
echo "scripts/create-logging-dashboard.sh"