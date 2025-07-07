# Resume Functionality Integration Test Guide

## Overview
This document provides step-by-step integration tests to validate the playback resume functionality.

## Prerequisites
- Backend deployed with `/resume` endpoint
- Frontend deployed with resume components
- Test user account with authentication

## Test Scenarios

### ✅ Test 1: Basic Resume Flow

**Objective**: Verify basic resume functionality works end-to-end

**Steps**:
1. **Login** to the app
2. **Add a podcast** with episodes
3. **Start playing an episode** and listen for >30 seconds
4. **Close the app** (or refresh browser)
5. **Reopen the app**
6. **Verify resume bar appears** at the top
7. **Click "Resume"** button
8. **Verify playback continues** from where you left off

**Expected Results**:
- ✅ Resume bar shows correct episode title and podcast name
- ✅ Progress bar shows correct percentage
- ✅ Time display shows current position and total duration
- ✅ Clicking "Resume" loads episode at exact position
- ✅ Audio starts playing from saved position

### ✅ Test 2: Progress Saving Intervals

**Objective**: Verify progress saves every 30 seconds

**Steps**:
1. **Start playing an episode**
2. **Wait exactly 30 seconds** during playback
3. **Pause the episode**
4. **Refresh the browser**
5. **Check if resume data includes the 30-second mark**

**Expected Results**:
- ✅ Progress is saved at 30-second intervals
- ✅ Resume position reflects the 30-second progress

### ✅ Test 3: Auto-Dismiss Countdown

**Objective**: Verify resume bar auto-dismisses after 10 seconds

**Steps**:
1. **Create resume data** (follow Test 1 steps 1-5)
2. **Reopen the app**
3. **Do not interact** with the resume bar
4. **Wait 10 seconds**
5. **Verify resume bar disappears**

**Expected Results**:
- ✅ Countdown shows "Auto-dismissing in 10s", "9s", etc.
- ✅ Bar automatically disappears after 10 seconds
- ✅ Resume data is cleared after auto-dismiss

### ✅ Test 4: Manual Dismiss

**Objective**: Verify manual dismiss functionality

**Steps**:
1. **Create resume data** (follow Test 1 steps 1-5)
2. **Reopen the app**
3. **Click the "X" dismiss button**
4. **Verify resume bar disappears immediately**
5. **Refresh the browser**
6. **Verify resume bar does not reappear**

**Expected Results**:
- ✅ Resume bar disappears immediately when dismissed
- ✅ Resume data is cleared after manual dismiss
- ✅ Resume bar doesn't show again after refresh

### ✅ Test 5: Minimum Progress Threshold

**Objective**: Verify resume only shows for meaningful progress (>30 seconds)

**Steps**:
1. **Start playing an episode**
2. **Listen for only 15 seconds**
3. **Close the app**
4. **Reopen the app**
5. **Verify no resume bar appears**

**Expected Results**:
- ✅ No resume bar shows for <30 seconds of progress
- ✅ App behaves normally without resume data

### ✅ Test 6: Completed Episode Exclusion

**Objective**: Verify completed episodes don't show in resume

**Steps**:
1. **Play an episode to 95%+ completion**
2. **Close the app**
3. **Reopen the app**
4. **Verify no resume bar appears**

**Expected Results**:
- ✅ Completed episodes (95%+ listened) don't trigger resume
- ✅ App starts fresh without resume prompt

### ✅ Test 7: Cross-Device Resume (if multiple devices available)

**Objective**: Verify resume data syncs across devices

**Steps**:
1. **Device A**: Start playing episode, listen >30 seconds
2. **Device A**: Close app
3. **Device B**: Login with same account
4. **Device B**: Open app
5. **Device B**: Verify resume bar appears

**Expected Results**:
- ✅ Resume data syncs across devices
- ✅ Can resume on different device from exact position

### ✅ Test 8: Progress During Playback

**Objective**: Verify progress saves automatically during playback

**Steps**:
1. **Start playing an episode**
2. **Play for 2 minutes** (4 save cycles at 30-second intervals)
3. **Pause the episode**
4. **Check backend** (via API call or database) for latest progress
5. **Verify progress matches current position**

**Expected Results**:
- ✅ Progress saves every 30 seconds automatically
- ✅ Latest progress matches audio player position
- ✅ No manual intervention required

### ✅ Test 9: Error Handling

**Objective**: Verify graceful handling of errors

**Steps**:
1. **Disconnect internet**
2. **Try to fetch resume data** (app startup)
3. **Verify app doesn't crash**
4. **Reconnect internet**
5. **Try again**

**Expected Results**:
- ✅ App handles network errors gracefully
- ✅ No crashes or broken states
- ✅ Resume works when connectivity restored

### ✅ Test 10: Episode/Podcast Deletion

**Objective**: Verify behavior when resumed content no longer exists

**Steps**:
1. **Create resume data for an episode**
2. **Delete the podcast/episode from backend**
3. **Reopen the app**
4. **Verify graceful handling**

**Expected Results**:
- ✅ App handles missing content gracefully
- ✅ No resume bar shows for deleted content
- ✅ No error states or crashes

## API Testing

### Backend Endpoint Tests

**Test Resume API directly**:
```bash
# Get resume data
curl -H "Authorization: Bearer <token>" \
  https://your-api-url/resume

# Expected responses:
# - 200 with resume data object
# - 200 with null (no resume data)
# - 401 for invalid auth
# - 500 for server errors
```

**Test Progress Saving**:
```bash
# Save progress
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"position":150,"duration":300,"podcastId":"test-id"}' \
  https://your-api-url/episodes/episode-id/progress
```

## Performance Testing

### Load Time Impact
1. **Measure app startup time** without resume feature
2. **Measure app startup time** with resume feature
3. **Verify impact is <100ms**

### Progress Save Performance
1. **Monitor API response times** for progress saves
2. **Verify saves complete in <500ms**
3. **Test with poor network conditions**

## Browser Compatibility

Test the resume functionality across:
- ✅ Chrome (desktop & mobile)
- ✅ Firefox (desktop & mobile)  
- ✅ Safari (desktop & mobile)
- ✅ Edge (desktop)

## Accessibility Testing

1. **Screen reader compatibility** with resume bar
2. **Keyboard navigation** for resume buttons
3. **High contrast mode** support
4. **ARIA labels** are properly announced

## Success Criteria

All tests must pass with:
- ✅ **Functional Requirements**: Resume works as designed
- ✅ **Performance**: No significant impact on app startup
- ✅ **Reliability**: Error handling prevents crashes
- ✅ **User Experience**: Intuitive and helpful functionality
- ✅ **Accessibility**: Works with assistive technologies

## Test Data Cleanup

After testing:
1. **Clear test listening history**
2. **Remove test podcasts**
3. **Reset test user data**
4. **Verify clean state for next test run**

## Automated Test Command

```bash
# Run all resume-related tests
npm test -- --grep "resume"

# Run backend tests only
cd backend && npm test

# Run frontend tests only  
cd frontend && npm test

# Run integration tests
npm run test:e2e
```

## Troubleshooting

**Resume bar doesn't appear**:
- Check if progress >30 seconds
- Verify episode not completed (>95%)
- Check network connectivity
- Verify authentication is valid

**Resume starts from wrong position**:
- Check if progress was saved properly
- Verify 30-second save intervals working
- Check browser localStorage backup

**Auto-dismiss not working**:
- Verify timer is running
- Check if component unmounted early
- Test with different browser tab focus states

## Results Documentation

For each test scenario, document:
- ✅ **Pass/Fail Status**
- 📝 **Notes and Observations**  
- 🐛 **Issues Found**
- 🔧 **Fixes Applied**
- ⚡ **Performance Metrics**

This comprehensive test suite ensures the resume functionality works reliably across all user scenarios and edge cases.