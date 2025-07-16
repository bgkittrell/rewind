#!/bin/bash

# Guest Extraction Queue Monitor
# Real-time monitoring script for SQS queue health and processing status

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Queue URLs
MAIN_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/730420835413/guest-extraction-queue"
DLQ_URL="https://sqs.us-east-1.amazonaws.com/730420835413/guest-extraction-dlq"

# Function to get queue attribute
get_queue_attribute() {
    local queue_url=$1
    local attribute=$2
    aws sqs get-queue-attributes \
        --queue-url "$queue_url" \
        --attribute-names "$attribute" \
        --query "Attributes.$attribute" \
        --output text 2>/dev/null || echo "Error"
}

# Function to get CloudWatch metric
get_metric() {
    local metric_name=$1
    local queue_name=$2
    local start_time=$(date -u -v-5M +%Y-%m-%dT%H:%M:%S)
    local end_time=$(date -u +%Y-%m-%dT%H:%M:%S)
    
    aws cloudwatch get-metric-statistics \
        --namespace AWS/SQS \
        --metric-name "$metric_name" \
        --dimensions Name=QueueName,Value="$queue_name" \
        --start-time "$start_time" \
        --end-time "$end_time" \
        --period 300 \
        --statistics Maximum \
        --query 'Datapoints[0].Maximum' \
        --output text 2>/dev/null || echo "0"
}

# Function to display queue status
display_queue_status() {
    echo -e "${BLUE}=== Guest Extraction Queue Monitor ===${NC}"
    echo -e "${BLUE}Timestamp: $(date)${NC}"
    echo ""
    
    # Get queue metrics
    local main_msgs=$(get_queue_attribute "$MAIN_QUEUE_URL" "ApproximateNumberOfMessages")
    local processing_msgs=$(get_queue_attribute "$MAIN_QUEUE_URL" "ApproximateNumberOfMessagesNotVisible")
    local delayed_msgs=$(get_queue_attribute "$MAIN_QUEUE_URL" "ApproximateNumberOfMessagesDelayed")
    local dlq_msgs=$(get_queue_attribute "$DLQ_URL" "ApproximateNumberOfMessages")
    
    # Get queue age
    local oldest_msg_age=$(get_metric "ApproximateAgeOfOldestMessage" "guest-extraction-queue")
    
    # Display main queue status
    echo -e "${GREEN}📬 Main Queue Status:${NC}"
    echo -e "  Pending Messages: $main_msgs"
    echo -e "  Processing Messages: $processing_msgs"
    echo -e "  Delayed Messages: $delayed_msgs"
    
    if [ "$oldest_msg_age" != "0" ] && [ "$oldest_msg_age" != "Error" ]; then
        # Convert float to integer for bash arithmetic
        local age_seconds=$(printf "%.0f" "$oldest_msg_age" 2>/dev/null || echo "0")
        local age_minutes=$((age_seconds / 60))
        if [ $age_minutes -gt 30 ]; then
            echo -e "  ${RED}⚠️  Oldest Message Age: ${age_minutes}m (HIGH)${NC}"
        elif [ $age_minutes -gt 15 ]; then
            echo -e "  ${YELLOW}⚠️  Oldest Message Age: ${age_minutes}m (MEDIUM)${NC}"
        else
            echo -e "  ${GREEN}✅ Oldest Message Age: ${age_minutes}m (OK)${NC}"
        fi
    else
        echo -e "  ${GREEN}✅ No aging messages${NC}"
    fi
    
    echo ""
    
    # Display DLQ status
    echo -e "${YELLOW}💀 Dead Letter Queue Status:${NC}"
    echo -e "  Failed Messages: $dlq_msgs"
    
    if [ "$dlq_msgs" -gt 0 ]; then
        echo -e "  ${RED}⚠️  WARNING: $dlq_msgs messages failed processing!${NC}"
        echo -e "  ${RED}💡 Run: aws sqs receive-message --queue-url $DLQ_URL --max-number-of-messages 1${NC}"
    else
        echo -e "  ${GREEN}✅ No failed messages${NC}"
    fi
    
    echo ""
    
    # Display processing health
    # Convert potential floats to integers for bash arithmetic
    local main_msgs_int=$(printf "%.0f" "$main_msgs" 2>/dev/null || echo "0")
    local processing_msgs_int=$(printf "%.0f" "$processing_msgs" 2>/dev/null || echo "0")
    local total_active=$((main_msgs_int + processing_msgs_int))
    echo -e "${BLUE}📊 Processing Health:${NC}"
    
    if [ $total_active -eq 0 ]; then
        echo -e "  ${GREEN}✅ System Idle - No messages to process${NC}"
    elif [ $total_active -lt 10 ]; then
        echo -e "  ${GREEN}✅ Normal Load - $total_active active messages${NC}"
    elif [ $total_active -lt 50 ]; then
        echo -e "  ${YELLOW}⚠️  Medium Load - $total_active active messages${NC}"
    else
        echo -e "  ${RED}🔥 High Load - $total_active active messages${NC}"
    fi
    
    # Display recommendations
    echo ""
    echo -e "${BLUE}💡 Quick Actions:${NC}"
    echo -e "  Monitor Lambda: aws logs tail /aws/lambda/rewind-backend-guestExtractionProcessor --follow"
    echo -e "  Check DLQ: aws sqs receive-message --queue-url $DLQ_URL --max-number-of-messages 1"
    echo -e "  Redrive DLQ: aws sqs start-message-move-task --source-arn arn:aws:sqs:us-east-1:730420835413:guest-extraction-dlq --destination-arn arn:aws:sqs:us-east-1:730420835413:guest-extraction-queue"
}

# Function to check AWS CLI and credentials
check_aws_setup() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not installed${NC}"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        echo -e "${YELLOW}💡 Run: aws configure${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ AWS CLI configured${NC}"
}

# Main monitoring loop
main() {
    # Check prerequisites
    check_aws_setup
    
    # Parse command line arguments
    local refresh_interval=15
    local once_flag=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --once)
                once_flag=true
                shift
                ;;
            --interval)
                refresh_interval="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [--once] [--interval SECONDS]"
                echo "  --once: Run once and exit"
                echo "  --interval: Refresh interval in seconds (default: 30)"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Main monitoring loop
    while true; do
        clear
        display_queue_status
        
        if [ "$once_flag" = true ]; then
            break
        fi
        
        echo ""
        echo -e "${BLUE}Refreshing in ${refresh_interval}s... (Press Ctrl+C to exit)${NC}"
        sleep "$refresh_interval"
    done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${GREEN}👋 Monitoring stopped${NC}"; exit 0' INT

# Run main function with all arguments
main "$@"