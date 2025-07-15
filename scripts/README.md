# Rewind Scripts

This directory contains utility scripts for managing the Rewind application.

## Guest Extraction Refresh Script

### Overview

The `refresh-guest-extraction.sh` script allows you to trigger guest extraction for existing episodes in the database.

### Prerequisites

- AWS CLI configured with appropriate credentials
- `jq` command-line JSON processor
- Valid Cognito JWT token for API authentication

### Installation

```bash
# Install dependencies (macOS)
brew install awscli jq

# Configure AWS credentials
aws configure

# Make script executable (already done)
chmod +x scripts/refresh-guest-extraction.sh
```

### Authentication

The script requires a valid Cognito JWT token. You can provide this in several ways:

1. **Environment variable (recommended):**

   ```bash
   export REWIND_AUTH_TOKEN="your-jwt-token-here"
   ```

2. **Stored credentials file:**

   ```bash
   mkdir -p ~/.rewind
   echo "REWIND_AUTH_TOKEN=your-jwt-token-here" > ~/.rewind/credentials
   ```

3. **Get token from browser:**
   - Log in to the Rewind app
   - Open browser dev tools
   - Go to Application > Local Storage
   - Copy the value from the authentication token

### Usage

```bash
# Basic usage - process first 100 episodes without guest extraction
./scripts/refresh-guest-extraction.sh

# Process specific number of episodes
./scripts/refresh-guest-extraction.sh 50

# Process episodes with specific status
./scripts/refresh-guest-extraction.sh 25 failed

# Process episodes with any status
./scripts/refresh-guest-extraction.sh 100 all
```

### Status Filters

- `missing` (default) - Episodes without guest extraction
- `failed` - Episodes with failed guest extraction
- `pending` - Episodes with pending guest extraction
- `all` - All episodes regardless of status

### Examples

```bash
# Process first 100 episodes without guest extraction
./scripts/refresh-guest-extraction.sh

# Process first 50 episodes without guest extraction
./scripts/refresh-guest-extraction.sh 50

# Process first 25 episodes with failed extraction
./scripts/refresh-guest-extraction.sh 25 failed

# Process first 100 episodes with any status
./scripts/refresh-guest-extraction.sh 100 all
```

### Features

- **Batch processing** - Uses batch API when possible for efficiency
- **Rate limiting** - Respects API rate limits with automatic delays
- **Error handling** - Retries failed requests with exponential backoff
- **Progress tracking** - Shows detailed progress and results
- **Colored output** - Easy to read status messages
- **Flexible filtering** - Multiple status filter options

### Configuration

You can modify these variables in the script:

- `RATE_LIMIT_DELAY=1.0` - Seconds between requests
- `BATCH_SIZE=10` - Episodes per batch request
- `API_BASE_URL` - API endpoint URL

### Output

The script provides colored output for different message types:

- 🔵 **INFO** - General information
- 🟢 **SUCCESS** - Successful operations
- 🟡 **WARNING** - Warnings and rate limiting
- 🔴 **ERROR** - Errors and failures

### Cost Estimation

Each guest extraction costs approximately $0.00025 in Bedrock charges:

- 100 episodes: ~$0.025
- 1000 episodes: ~$0.25
- 10000 episodes: ~$2.50

### Troubleshooting

1. **Authentication errors**: Ensure your JWT token is valid and not expired
2. **Rate limiting**: The script handles this automatically, but you can increase delays if needed
3. **AWS credentials**: Ensure AWS CLI is configured with appropriate permissions
4. **Dependencies**: Make sure `jq` is installed (`brew install jq`)

### Security

- Never commit JWT tokens to version control
- Use environment variables or credential files for tokens
- Tokens should be treated as sensitive data and rotated regularly
