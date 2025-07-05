# Playback Resume System Implementation Plan

## Overview

This plan outlines how to implement a robust playback resume system that allows users to continue listening from where they left off after app crashes, page refreshes, or returning to the app later.

## Current State Analysis

### ✅ Already Implemented
- **Backend**: `ListeningHistory` table with playback position tracking
- **API Endpoints**: `savePlaybackProgress` and `getPlaybackProgress` endpoints
- **Progress Tracking**: Automatic progress saving during playback
- **Frontend**: `MediaPlayerContext` and `FloatingMediaPlayer` components

### ❌ Missing Features
- **Resume on app startup** - No mechanism to restore last played episode
- **Automatic progress restoration** - Episodes don't automatically resume from saved position
- **Crash recovery** - No persistence of current player state
- **Latest episode identification** - No way to identify the most recently played episode

## Implementation Strategy

### Phase 1: Backend Enhancements

#### 1.1 Add "Last Played Episode" Tracking
**Location**: `backend/src/services/dynamoService.ts`

**New Method**: `getLastPlayedEpisode(userId: string)`
```typescript
async getLastPlayedEpisode(userId: string): Promise<LastPlayedEpisode | null> {
  // Query ListeningHistory with LastPlayedIndex GSI
  // Return the most recent episode with playback position
}
```

**Enhancement**: Modify `savePlaybackProgress` to update user's last played episode
```typescript
async savePlaybackProgress(
  userId: string,
  episodeId: string,
  podcastId: string,
  position: number,
  duration: number,
): Promise<void> {
  // Save to ListeningHistory table (existing)
  // Update Users table with lastPlayedEpisode info
}
```

#### 1.2 Add API Endpoint for Resume Data
**Location**: `backend/src/handlers/episodeHandler.ts`

**New Route**: `GET /resume` - Returns last played episode with position
```typescript
async function getResumeData(
  userId: string,
  path: string,
): Promise<APIGatewayProxyResult> {
  // Get last played episode from ListeningHistory
  // Include episode details and progress
  // Return null if no recent playback
}
```

#### 1.3 Enhance Users Table Schema
**Location**: `docs/DATABASE.md`

**Add to Users table**:
```typescript
interface User {
  // ... existing fields
  lastPlayedEpisode?: {
    episodeId: string
    podcastId: string
    position: number
    duration: number
    playedAt: string // ISO timestamp
  }
}
```

### Phase 2: Frontend Resume System

#### 2.1 Create Resume Service
**Location**: `frontend/src/services/resumeService.ts`

```typescript
export class ResumeService {
  async getResumeData(): Promise<ResumeData | null>
  async saveCurrentState(episode: Episode, position: number): Promise<void>
  async clearResumeData(): Promise<void>
}
```

#### 2.2 Enhance Media Player Context
**Location**: `frontend/src/context/MediaPlayerContext.tsx`

**Add resume functionality**:
```typescript
interface MediaPlayerContextType {
  // ... existing fields
  resumePlayback: () => Promise<void>
  isResuming: boolean
  canResume: boolean
  resumeData: ResumeData | null
}
```

#### 2.3 Add Resume UI Component
**Location**: `frontend/src/components/ResumePlaybackBar.tsx`

**Features**:
- Shows at app startup if resume data exists
- Displays episode title and progress
- "Resume" and "Dismiss" buttons
- Auto-dismiss after 10 seconds

#### 2.4 Modify App Initialization
**Location**: `frontend/src/main.tsx`

**Add resume initialization**:
```typescript
// Check for resume data on app start
// Show resume UI if available
// Auto-dismiss after 10 seconds
```

### Phase 3: Enhanced Progress Tracking

#### 3.1 Regular Progress Saving
**Location**: `frontend/src/components/FloatingMediaPlayer.tsx`

**Enhancements**:
- Save progress every 30 seconds during playback
- Save progress on pause/stop
- Save progress on app unload/beforeunload

#### 3.2 Browser Storage Backup
**Location**: `frontend/src/services/storageService.ts`

**Features**:
- Store current playback state in localStorage
- Restore from localStorage if API fails
- Sync localStorage with backend periodically

#### 3.3 Progress Restoration
**Location**: `frontend/src/context/MediaPlayerContext.tsx`

**Auto-restore progress when playing an episode**:
```typescript
const playEpisode = async (episode: Episode) => {
  // Get saved progress for this episode
  const progress = await episodeService.getProgress(episode.id)
  // Set initial position if progress exists
  episode.playbackPosition = progress.position
  // Continue with playback
}
```

### Phase 4: User Experience Enhancements

#### 4.1 Visual Progress Indicators
**Location**: `frontend/src/components/EpisodeCard.tsx`

**Show progress on episode cards**:
- Progress bar at bottom of card
- "Resume" badge for partially played episodes
- Checkmark for completed episodes

#### 4.2 Recently Played Section
**Location**: `frontend/src/routes/home.tsx`

**Add recently played episodes**:
- Show last 5 played episodes
- Include progress indicators
- Quick resume functionality

## Technical Implementation Details

### Data Flow

1. **User starts playing episode**
   - Episode loads in media player
   - Progress is fetched and applied
   - Regular progress saving begins

2. **Progress tracking during playback**
   - Save progress every 30 seconds
   - Save on pause/stop/seek
   - Update localStorage backup

3. **App crash/close**
   - Browser beforeunload event saves current state
   - localStorage maintains backup data

4. **App restart**
   - Check for resume data via API
   - Fallback to localStorage if API fails
   - Show resume UI if data exists

### Database Optimization

**Existing GSI Usage**:
- `LastPlayedIndex` on `ListeningHistory` table
- Query by `userId` and sort by `lastPlayed` DESC
- Limit 1 to get most recent episode

**New Indexes (if needed)**:
- Consider adding `ResumeIndex` if query patterns require it

### API Endpoints

**New Endpoints**:
```
GET /resume - Get resume data for current user
POST /resume/dismiss - Mark resume data as dismissed
```

**Enhanced Endpoints**:
```
PUT /episodes/{episodeId}/progress - Enhanced with user's last played tracking
```

### Error Handling

**Graceful Degradation**:
- If API fails, use localStorage backup
- If no resume data, start fresh
- If episode no longer exists, clear resume data

**Edge Cases**:
- Episode deleted after being saved as last played
- User switches devices
- Multiple tabs/sessions

## Implementation Timeline

### Week 1: Backend Infrastructure
- [ ] Add `getLastPlayedEpisode` method to dynamoService
- [ ] Enhance `savePlaybackProgress` with last played tracking
- [ ] Add `/resume` API endpoint
- [ ] Update API tests

### Week 2: Frontend Resume System
- [ ] Create `ResumeService` class
- [ ] Enhance `MediaPlayerContext` with resume functionality
- [ ] Add `ResumePlaybackBar` component
- [ ] Update app initialization flow

### Week 3: Progress Enhancements
- [ ] Implement regular progress saving (30-second intervals)
- [ ] Add localStorage backup system
- [ ] Implement automatic progress restoration
- [ ] Add visual progress indicators

### Week 4: UX Polish
- [ ] Create recently played section
- [ ] Add comprehensive error handling
- [ ] Performance optimization and testing

## Testing Strategy

### Unit Tests
- ResumeService methods
- MediaPlayerContext resume functionality
- Progress saving/restoration logic

### Integration Tests
- API endpoints for resume data
- End-to-end resume flow
- Error scenarios and fallbacks

### User Acceptance Tests
- Resume after app crash
- Resume after page refresh
- Resume after closing browser tab
- Resume with offline/online transitions

## Success Metrics

- **User Retention**: Measure if resume feature increases app usage
- **Engagement**: Track completion rates of resumed episodes
- **Performance**: Monitor API response times for resume data
- **Reliability**: Track success rate of resume functionality

## Future Enhancements

### Phase 5: Advanced Features
- **Cross-device resume**: Sync resume data across devices
- **Smart resume**: Resume from optimal position (skip ads, intros)
- **Multiple resume slots**: Allow users to have multiple "bookmarks"
- **Resume collections**: Save multiple episodes as a playlist

### Phase 6: Analytics Integration
- Track resume usage patterns
- A/B test resume UI variations
- Analyze impact on user engagement
- Optimize based on user behavior

## Notes

- **Storage**: Resume data is stored in existing `ListeningHistory` table
- **Performance**: Minimal impact on app startup (single API call), progress saved every 30 seconds
- **Backwards Compatible**: Existing users will see resume data from their history
- **Privacy**: Resume data is user-specific and follows existing auth patterns
- **Offline Support**: localStorage backup ensures functionality without internet

## Implementation Checklist

### Prerequisites
- [ ] Review existing `ListeningHistory` table structure
- [ ] Confirm `LastPlayedIndex` GSI is properly configured
- [ ] Verify current progress saving is working correctly

### Development Tasks
- [ ] Backend: Add resume data methods
- [ ] Backend: Add resume API endpoint
- [ ] Frontend: Create resume service
- [ ] Frontend: Enhance media player context
- [ ] Frontend: Add resume UI component
- [ ] Frontend: Modify app initialization
- [ ] Frontend: Add progress backup system
- [ ] Frontend: Implement automatic progress restoration
- [ ] Testing: Add unit and integration tests
- [ ] Documentation: Update API docs
- [ ] Deployment: Test in staging environment

### Validation
- [ ] Test resume after app crash
- [ ] Test resume after page refresh
- [ ] Test resume with network issues
- [ ] Test resume with deleted episodes
- [ ] Test resume across different browsers
- [ ] Verify performance impact is minimal
- [ ] Confirm 30-second progress saving works correctly

This plan provides a comprehensive approach to implementing robust playback resume functionality that will significantly improve the user experience in the Rewind app.