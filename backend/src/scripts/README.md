# Episode Deduplication Migration Script

## Overview

This script deduplicates existing episodes in the DynamoDB Episodes table by:

1. **Scanning all episodes** in the database
2. **Grouping episodes** by podcast and natural key (title + release date hash)
3. **Merging duplicates** by keeping the oldest episode (preserves listening history)
4. **Adding natural keys** to episodes that don't have them
5. **Removing duplicate episodes** from the database

## Prerequisites

- Node.js and npm installed
- AWS credentials configured
- Access to the DynamoDB Episodes table

## Setup

1. Install dependencies:

   ```bash
   npm install @aws-sdk/client-dynamodb @aws-sdk/util-dynamodb
   npm install --save-dev @types/node ts-node
   ```

2. Set environment variables:
   ```bash
   export AWS_REGION=us-east-1
   export EPISODES_TABLE=RewindEpisodes
   ```

## Running the Migration

### Dry Run (Recommended First)

```bash
# Review the script before running
cat backend/src/scripts/deduplicate-episodes.ts

# Run with dry-run flag (add this to the script)
npx ts-node backend/src/scripts/deduplicate-episodes.ts --dry-run
```

### Production Run

```bash
# Backup your data first!
aws dynamodb create-backup --table-name RewindEpisodes --backup-name "pre-deduplication-backup"

# Run the migration
npx ts-node backend/src/scripts/deduplicate-episodes.ts
```

## What the Script Does

### 1. Natural Key Generation

- Creates a unique key based on normalized title + release date
- Example: "The Joe Rogan Experience #1234" + "2023-10-15" → MD5 hash

### 2. Duplicate Detection

- Groups episodes by podcast ID + natural key
- Identifies groups with multiple episodes (duplicates)

### 3. Duplicate Resolution

- **Keeps the oldest episode** (preserves listening history and progress)
- **Updates it with the latest information** from duplicates
- **Removes duplicate episodes** from the database

### 4. Statistics Tracking

- Total episodes processed
- Duplicates found and removed
- Episodes updated with natural keys
- Any errors encountered

## Expected Output

```
🚀 Starting episode deduplication migration...
Scanning all episodes...
Found 150 episodes so far...
Found 300 episodes so far...
Total episodes found: 450

Starting deduplication process...
Processing duplicate group 1/200: podcast123:a1b2c3d4... (3 duplicates)
  Merged 3 duplicates for: The Best Podcast Ever - Episode 1
Processing duplicate group 2/200: podcast123:e5f6g7h8... (2 duplicates)
  Merged 2 duplicates for: The Best Podcast Ever - Episode 2
...
Processed 200/200 groups...
Deduplication complete!

=== Deduplication Statistics ===
Total episodes scanned: 450
Duplicates found: 75
Episodes removed: 75
Episodes updated: 200
Errors: 0
Final episode count: 375
✅ Migration completed successfully!
```

## Safety Features

- **Preserves listening history** by keeping the oldest episode
- **Updates with latest information** from the most recent duplicate
- **Continues on errors** - doesn't stop if one episode fails
- **Detailed logging** of all operations
- **Statistics tracking** for verification

## Rollback Plan

If issues occur:

1. **Stop the script** (Ctrl+C)
2. **Restore from backup**:
   ```bash
   aws dynamodb restore-table-from-backup \
     --target-table-name RewindEpisodes \
     --backup-arn arn:aws:dynamodb:region:account:table/RewindEpisodes/backup/backup-name
   ```

## Post-Migration Verification

1. **Check episode counts** in the database
2. **Verify no duplicates** exist for a few podcasts
3. **Test sync functionality** with a podcast
4. **Check listening history** still works

## Notes

- The script uses MD5 hashing for natural keys (32 characters)
- Episodes without natural keys will have them added
- The script is designed to be idempotent (can be run multiple times safely)
- Consider running during low-traffic hours
