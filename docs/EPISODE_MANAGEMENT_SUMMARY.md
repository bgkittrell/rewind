# Episode Management - Quick Reference

## 🎯 Problem Statement
- **UI Ready**: EpisodeCard and FloatingMediaPlayer components fully implemented
- **Gap**: Backend has no episode APIs - can't serve episode data to frontend
- **Impact**: Beautiful media player with no episodes to play

## ✅ Current Assets
- **Database**: Episodes table already deployed (`RewindEpisodes`)
- **RSS Service**: Basic podcast parsing in `rssService.ts`
- **DynamoDB Service**: Podcast operations in `dynamoService.ts`
- **Frontend**: Complete episode UI components ready

## 🔧 Implementation Strategy (5 Days)

### Day 1: Backend Foundation
- **Extend RSS Service**: Parse individual episodes from RSS feeds
- **Extend DynamoDB Service**: Episode CRUD + progress tracking operations

### Day 2: API & Infrastructure  
- **Create Episode Handler**: Full REST API for episodes
- **Update CDK Stack**: Add Lambda, API Gateway routes, permissions

### Day 3: Frontend Integration
- **Episode Service**: Frontend API client
- **Library Enhancement**: Expandable podcasts with episode lists
- **MediaPlayer Connection**: Real audio playback with progress sync

### Day 4-5: Testing & Polish
- **Automatic Sync**: Episodes populate when adding podcasts
- **End-to-End Testing**: Complete user workflows
- **Performance**: Loading states, pagination, error handling

## 📊 Key Technical Decisions

### RSS Processing
- **Scope**: Last 50 episodes per podcast (configurable)
- **Data**: Title, description, audio URL, duration, release date, image
- **Batch Storage**: DynamoDB batch operations (25 items max)

### Progress Tracking
- **Frequency**: Save every 10 seconds during playback
- **Storage**: User + Episode + Position in `ListeningHistory` table
- **Restoration**: Load saved position when starting episode

### Frontend Strategy
- **Lazy Loading**: Episodes load only when podcast expanded
- **Pagination**: 20 episodes per page with "Load More"
- **State Management**: React Context for media player state

## 🚀 Success Metrics
- [ ] User adds podcast → Episodes appear automatically
- [ ] User plays episode → Audio starts immediately  
- [ ] User pauses → Position saved within 1 second
- [ ] User returns → Position restored accurately
- [ ] Performance → Episode lists load in <3 seconds

## 📋 Implementation Files

### Backend Changes
- `backend/src/services/rssService.ts` - Add episode parsing
- `backend/src/services/dynamoService.ts` - Add episode operations
- `backend/src/handlers/episodeHandler.ts` - New API handler
- `backend/src/types/index.ts` - Add Episode types
- `infra/lib/rewind-backend-stack.ts` - Add infrastructure

### Frontend Changes
- `frontend/src/services/episodeService.ts` - New API client
- `frontend/src/routes/library.tsx` - Add episode loading
- `frontend/src/context/MediaPlayerContext.tsx` - Enhance context
- `frontend/src/components/EpisodeCard.tsx` - Connect to real data

## 🔗 Related Documents
- **Technical Plan**: `docs/EPISODE_MANAGEMENT_PLAN.md`
- **Implementation Tasks**: `docs/EPISODE_IMPLEMENTATION_CHECKLIST.md`  
- **Sprint Plan**: `NEXT_ACTIONS.md`
- **Overall Roadmap**: `docs/PLAN.md`

---

**Current Status**: Ready to begin implementation
**Estimated Timeline**: 4-5 days for complete episode management
**Next Phase**: Basic recommendation system and PWA features