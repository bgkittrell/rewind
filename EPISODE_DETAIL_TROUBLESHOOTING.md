# Episode Detail Page Troubleshooting Guide

## Issue Description

The episode detail page is showing "Unknown Podcast" and "Invalid Date" instead of the actual episode details, indicating that the API is not returning the expected data.

## Root Cause Analysis

### 1. API Configuration

- **Frontend Route**: `/episode/:episodeId` (configured in main.tsx)
- **API Call**: `GET /episodes/${episodeId}` (in episodeService.ts)
- **Backend Route**: `GET /episodes/{episodeId}` (configured in infrastructure)
- **Handler**: `getEpisodeById` function in episodeHandler.ts

### 2. Data Flow Issues

The problem appears to be in the `getEpisodeById` function in the backend, which:

1. Fetches all user podcasts
2. Iterates through each podcast to find the episode
3. Calls `dynamoService.getEpisodeById(podcast.podcastId, episodeId)`

### 3. Potential Issues

#### A. Missing Episode Data

- The episode might not exist in the database
- The episode might belong to a different user
- The episode ID might be invalid

#### B. Invalid Release Date

- The `releaseDate` field might be null, empty, or in an invalid format
- The `formatDate` function fails when the date is invalid

#### C. Missing Podcast Information

- The podcast lookup fails to find the correct podcast
- The podcast ID relationship is broken

## Debugging Steps

### 1. Check API Response

Add console logging to the frontend to see what data is being returned:

```typescript
// In episode-detail.tsx, add this to loadEpisodeDetails:
console.log('Episode data received:', episodeData)
console.log('Podcast data found:', podcastData)
```

### 2. Check Backend Logs

The backend handler should log errors when episodes are not found. Check CloudWatch logs for:

- "Episode not found or access denied"
- "Error getting episode:"

### 3. Verify Database State

Check if the episode exists in DynamoDB:

- Verify the episode ID is correct
- Check if the episode belongs to the user's podcasts
- Verify the release date format

## Recommended Fixes

### 1. Improve Error Handling in Frontend

```typescript
// In episode-detail.tsx, improve the formatDate function:
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString || dateString.trim() === '') {
    return 'Date Unknown'
  }

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch (error) {
    return 'Date Unknown'
  }
}
```

### 2. Add Better Error Messages

```typescript
// Show specific error messages for different failure cases
if (!episode) {
  return (
    <div className="px-4 py-6">
      <div className="mb-4 py-4 px-4 bg-red-50 border-l-4 border-red-500">
        <p className="text-sm text-red-800">
          Episode not found. It may have been deleted or you may not have access to it.
        </p>
      </div>
    </div>
  )
}
```

### 3. Improve Backend Logging

```typescript
// In episodeHandler.ts, add better logging:
async function getEpisodeById(episodeId: string, userId: string, path: string) {
  console.log(`Getting episode ${episodeId} for user ${userId}`)

  try {
    const userPodcasts = await dynamoService.getPodcastsByUser(userId)
    console.log(`Found ${userPodcasts.length} podcasts for user`)

    for (const podcast of userPodcasts) {
      console.log(`Checking podcast ${podcast.podcastId} for episode ${episodeId}`)
      try {
        const episode = await dynamoService.getEpisodeById(podcast.podcastId, episodeId)
        if (episode) {
          console.log(`Found episode ${episodeId} in podcast ${podcast.podcastId}`)
          return createSuccessResponse(episode, 200, path)
        }
      } catch (error) {
        console.log(`Episode ${episodeId} not found in podcast ${podcast.podcastId}`)
        continue
      }
    }

    console.log(`Episode ${episodeId} not found in any user podcast`)
    return createErrorResponse('Episode not found or access denied', 'NOT_FOUND', 404, path)
  } catch (error) {
    console.error('Error getting episode:', error)
    return createErrorResponse('Failed to get episode', 'INTERNAL_ERROR', 500, path)
  }
}
```

### 4. Add Fallback Values

```typescript
// In episode-detail.tsx, add fallback values:
<p className="text-lg text-gray-700 mb-3 font-medium">
  {podcast?.title || 'Unknown Podcast'}
</p>
<div className="flex items-center space-x-3 text-sm text-gray-500 mb-4">
  <span>{formatDate(episode.releaseDate)}</span>
  <span>•</span>
  <span>{episode.duration || 'Unknown duration'}</span>
</div>
```

## Testing Steps

1. **Verify API Connection**
   - Test the health endpoint: `GET /health`
   - Test user authentication
   - Test podcast listing: `GET /podcasts`

2. **Test Episode Access**
   - Try accessing a known episode ID
   - Check if the episode exists in the database
   - Verify the user has access to the episode

3. **Test Data Format**
   - Check the format of episode data returned by the API
   - Verify all required fields are present
   - Test with episodes that have different data formats

## Prevention Measures

1. **Input Validation**
   - Validate episode IDs before processing
   - Check required fields before saving episodes
   - Sanitize date formats during RSS parsing

2. **Better Error Handling**
   - Always provide fallback values for missing data
   - Show user-friendly error messages
   - Log detailed error information for debugging

3. **Data Consistency**
   - Ensure all episodes have valid release dates
   - Maintain referential integrity between podcasts and episodes
   - Regularly validate data integrity

## Next Steps

1. Add the recommended logging to identify the specific issue
2. Deploy the improved error handling
3. Test with different episode IDs to isolate the problem
4. Consider adding a data validation script to fix any corrupted data
