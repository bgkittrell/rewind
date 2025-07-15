#!/bin/bash

# CLI script for refreshing guest extraction on existing episodes
# Usage: ./scripts/refresh-guest-extraction.sh [limit] [status]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
API_BASE_URL="https://bds33eqtv5.execute-api.us-east-1.amazonaws.com/prod"
EPISODES_TABLE="RewindEpisodes"
RATE_LIMIT_DELAY=1.0  # seconds between requests
BATCH_SIZE=10         # episodes per batch request

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
LIMIT=${1:-100}
STATUS_FILTER=${2:-"missing"}  # "missing", "failed", "pending", or "all"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install it first."
        print_status "Install with: brew install jq"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "All dependencies are available"
}

# Function to get Cognito token for API authentication
get_auth_token() {
    print_status "Getting authentication token..."
    
    # Try to get token from environment first
    if [ -n "$REWIND_AUTH_TOKEN" ]; then
        echo "$REWIND_AUTH_TOKEN"
        return 0
    fi
    
    # Check if we have stored credentials
    if [ -f "$HOME/.rewind/credentials" ]; then
        source "$HOME/.rewind/credentials"
        if [ -n "$REWIND_AUTH_TOKEN" ]; then
            echo "$REWIND_AUTH_TOKEN"
            return 0
        fi
    fi
    
    print_error "No authentication token found."
    print_status "Please set REWIND_AUTH_TOKEN environment variable with a valid Cognito JWT token."
    print_status "You can get this from the browser's localStorage after logging in to the app."
    exit 1
}

# Function to build DynamoDB filter expression
build_filter_expression() {
    case "$STATUS_FILTER" in
        "missing")
            echo "attribute_not_exists(guestExtractionStatus)"
            ;;
        "failed")
            echo "guestExtractionStatus = :failed"
            ;;
        "pending")
            echo "guestExtractionStatus = :pending"
            ;;
        "all")
            echo "attribute_not_exists(guestExtractionStatus) OR guestExtractionStatus = :failed OR guestExtractionStatus = :pending"
            ;;
        *)
            print_error "Invalid status filter: $STATUS_FILTER"
            print_status "Valid options: missing, failed, pending, all"
            exit 1
            ;;
    esac
}

# Function to build expression attribute values
build_expression_values() {
    case "$STATUS_FILTER" in
        "missing")
            echo '{}'
            ;;
        "failed")
            echo '{":failed": {"S": "failed"}}'
            ;;
        "pending")
            echo '{":pending": {"S": "pending"}}'
            ;;
        "all")
            echo '{":failed": {"S": "failed"}, ":pending": {"S": "pending"}}'
            ;;
    esac
}

# Function to get episodes from DynamoDB
get_episodes() {
    print_status "Fetching episodes from DynamoDB (limit: $LIMIT, status: $STATUS_FILTER)..."
    
    FILTER_EXPRESSION=$(build_filter_expression)
    EXPRESSION_VALUES=$(build_expression_values)
    
    local aws_cmd="aws dynamodb scan --table-name $EPISODES_TABLE --filter-expression \"$FILTER_EXPRESSION\" --projection-expression \"podcastId, episodeId, title, description, guestExtractionStatus\" --max-items $LIMIT"
    
    if [ "$EXPRESSION_VALUES" != "{}" ]; then
        aws_cmd="$aws_cmd --expression-attribute-values '$EXPRESSION_VALUES'"
    fi
    
    # Execute the command and capture the result
    local result=$(eval "$aws_cmd" 2>&1)
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        print_error "Failed to fetch episodes from DynamoDB"
        print_error "$result"
        exit 1
    fi
    
    # Parse and count results
    local episode_count=$(echo "$result" | jq '.Items | length')
    print_success "Found $episode_count episodes to process"
    
    # Return the items
    echo "$result" | jq -r '.Items'
}

# Function to convert DynamoDB item to API format
convert_episode_format() {
    local episode="$1"
    
    # Extract values from DynamoDB format
    local podcastId=$(echo "$episode" | jq -r '.podcastId.S // .podcastId')
    local episodeId=$(echo "$episode" | jq -r '.episodeId.S // .episodeId')
    local title=$(echo "$episode" | jq -r '.title.S // .title // ""')
    local description=$(echo "$episode" | jq -r '.description.S // .description // ""')
    
    # Create API-compatible JSON (API expects episodeId, title, description)
    jq -n --arg episodeId "$episodeId" --arg title "$title" --arg description "$description" '{
        episodeId: $episodeId,
        title: $title,
        description: $description
    }'
}

# Function to process a single episode
process_episode() {
    local episode="$1"
    local auth_token="$2"
    
    local episode_data=$(convert_episode_format "$episode")
    local podcast_id=$(echo "$episode_data" | jq -r '.podcastId')
    local episode_id=$(echo "$episode_data" | jq -r '.episodeId')
    local episode_title=$(echo "$episode_data" | jq -r '.title')
    
    print_status "Processing episode: $podcast_id/$episode_id - $(echo "$episode_title" | cut -c1-50)..."
    
    # Make API request
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $auth_token" \
        -d "$episode_data" \
        "$API_BASE_URL/recommendations/extract-guests")
    
    local body=$(echo "$response" | head -n -1)
    local status_code=$(echo "$response" | tail -n 1)
    
    case "$status_code" in
        200)
            local guests=$(echo "$body" | jq -r '.guests // [] | join(", ")')
            local confidence=$(echo "$body" | jq -r '.confidence // 0')
            print_success "✓ Episode $podcast_id/$episode_id: Found guests [$guests] (confidence: $confidence)"
            return 0
            ;;
        429)
            print_warning "⚠ Rate limited. Waiting 30 seconds..."
            sleep 30
            return 1  # Retry
            ;;
        401|403)
            print_error "✗ Authentication failed. Please check your auth token."
            return 2  # Fatal error
            ;;
        *)
            print_error "✗ Episode $podcast_id/$episode_id failed with status $status_code: $body"
            return 1  # Retry
            ;;
    esac
}

# Function to process episodes in batches
process_episodes_batch() {
    local episodes="$1"
    local auth_token="$2"
    
    print_status "Processing episodes in batches of $BATCH_SIZE..."
    
    local total_episodes=$(echo "$episodes" | jq '. | length')
    local processed=0
    local successful=0
    local failed=0
    
    # Process episodes in batches
    for ((i=0; i<total_episodes; i+=BATCH_SIZE)); do
        local batch=$(echo "$episodes" | jq ".[$i:$((i+BATCH_SIZE))]")
        local batch_size=$(echo "$batch" | jq '. | length')
        
        print_status "Processing batch $((i/BATCH_SIZE+1)) ($batch_size episodes)..."
        
        # Convert batch to API format
        local batch_data=$(echo "$batch" | jq -r '.[] | @base64' | while read -r episode; do
            echo "$episode" | base64 -d | convert_episode_format "$(echo "$episode" | base64 -d)"
        done | jq -s '.')
        
        # Make batch API request
        local response=$(curl -s -w "\n%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $auth_token" \
            -d "$batch_data" \
            "$API_BASE_URL/recommendations/batch-extract-guests")
        
        local body=$(echo "$response" | head -n -1)
        local status_code=$(echo "$response" | tail -n 1)
        
        case "$status_code" in
            200)
                local batch_results=$(echo "$body" | jq -r '.results // []')
                local batch_successful=$(echo "$batch_results" | jq '[.[] | select(.guests | length > 0)] | length')
                print_success "✓ Batch completed: $batch_successful/$batch_size episodes processed successfully"
                successful=$((successful + batch_successful))
                ;;
            429)
                print_warning "⚠ Rate limited. Waiting 60 seconds..."
                sleep 60
                continue  # Retry this batch
                ;;
            401|403)
                print_error "✗ Authentication failed. Please check your auth token."
                return 1
                ;;
            *)
                print_error "✗ Batch failed with status $status_code: $body"
                failed=$((failed + batch_size))
                ;;
        esac
        
        processed=$((processed + batch_size))
        
        # Rate limiting between batches
        if [ $processed -lt $total_episodes ]; then
            print_status "Waiting ${RATE_LIMIT_DELAY}s before next batch..."
            sleep $RATE_LIMIT_DELAY
        fi
    done
    
    print_success "Processing complete: $successful successful, $failed failed out of $total_episodes episodes"
}

# Function to process episodes individually (fallback)
process_episodes_individual() {
    local episodes="$1"
    local auth_token="$2"
    
    print_status "Processing episodes individually..."
    
    local total_episodes=$(echo "$episodes" | jq '. | length')
    local processed=0
    local successful=0
    local failed=0
    
    echo "$episodes" | jq -r '.[] | @base64' | while read -r episode; do
        episode_data=$(echo "$episode" | base64 -d)
        
        local retries=0
        local max_retries=3
        
        while [ $retries -lt $max_retries ]; do
            if process_episode "$episode_data" "$auth_token"; then
                successful=$((successful + 1))
                break
            elif [ $? -eq 2 ]; then
                # Fatal error (auth failure)
                exit 1
            else
                retries=$((retries + 1))
                if [ $retries -lt $max_retries ]; then
                    print_warning "Retrying... ($retries/$max_retries)"
                    sleep $((retries * 5))  # Exponential backoff
                else
                    failed=$((failed + 1))
                fi
            fi
        done
        
        processed=$((processed + 1))
        
        # Rate limiting between individual requests
        if [ $processed -lt $total_episodes ]; then
            sleep $RATE_LIMIT_DELAY
        fi
    done
    
    print_success "Processing complete: $successful successful, $failed failed out of $total_episodes episodes"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [limit] [status]"
    echo ""
    echo "Arguments:"
    echo "  limit   - Maximum number of episodes to process (default: 100)"
    echo "  status  - Filter episodes by status (default: missing)"
    echo "            Options: missing, failed, pending, all"
    echo ""
    echo "Environment variables:"
    echo "  REWIND_AUTH_TOKEN - JWT token for API authentication"
    echo ""
    echo "Examples:"
    echo "  $0                    # Process first 100 episodes without guest extraction"
    echo "  $0 50                 # Process first 50 episodes without guest extraction"
    echo "  $0 25 failed          # Process first 25 episodes with failed extraction"
    echo "  $0 100 all            # Process first 100 episodes with any status"
}

# Main execution
main() {
    echo "🎧 Rewind Guest Extraction Refresh Script"
    echo "========================================="
    
    # Show usage if help requested
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_usage
        exit 0
    fi
    
    # Check dependencies
    check_dependencies
    
    # Get authentication token
    auth_token=$(get_auth_token)
    
    # Get episodes to process
    episodes=$(get_episodes)
    
    # Check if we have any episodes
    episode_count=$(echo "$episodes" | jq '. | length')
    if [ "$episode_count" -eq 0 ]; then
        print_warning "No episodes found matching the criteria"
        exit 0
    fi
    
    # Process episodes using batch API (preferred) or individual API (fallback)
    print_status "Starting guest extraction for $episode_count episodes..."
    
    if [ "$episode_count" -ge "$BATCH_SIZE" ]; then
        process_episodes_batch "$episodes" "$auth_token"
    else
        process_episodes_individual "$episodes" "$auth_token"
    fi
    
    print_success "Guest extraction refresh completed!"
}

# Run main function
main "$@"