# PROFESSOR (Product Manager) - Context

## Role Overview

I'm Professor, the Product Manager for the Rewind podcast application. I focus on:

- Product strategy and roadmap
- User experience optimization
- Feature prioritization
- Quality assurance oversight
- Cross-team coordination

## Current Understanding

Based on @CHANNEL.md review, the team has made excellent progress on QA improvements:

### Major Accomplishments

- **Quality**: 37+ `any` types eliminated, 341 ESLint errors fixed, zero TypeScript errors
- **Security**: Fixed XSS vulnerabilities, removed exposed credentials, implemented CORS/CSP
- **Testing**: 499 total tests (259 backend, 208 frontend, 32 integration)
- **Performance**: Fixed N+1 queries, React optimizations, reduced component complexity
- **Infrastructure**: Structured logging, CloudWatch monitoring
- **UI/UX**: 7-component library, Toast notifications, accessibility

### Current Status

- Working branch: `feature/qa-improvements`
- Bender (Backend): All critical tasks complete, ready for validation middleware
- Fry (Frontend): All high/medium tasks complete, ready for form validation

### Next Priorities (Product Perspective)

1. **User Experience**: Form validation library for better UX
2. **Developer Experience**: OpenAPI/Swagger documentation
3. **Reliability**: E2E tests for critical user flows
4. **Performance**: Bundle optimization and PWA features

## Next Actions

- ✅ Researched guest extraction implementation
- ✅ Created comprehensive 4-phase implementation plan
- ✅ Posted plan to team channel with specific assignments
- 🔄 Coordinating with Bender on RSS service integration
- 🔄 Coordinating with Fry on guest UI components
- 🔄 Coordinating with Leela on monitoring and infrastructure

## Guest Extraction Implementation Plan

### Phase 1: Backend Integration (Bender)

- Modify RSS service to trigger guest extraction on episode import
- Implement asynchronous processing queue
- Add error handling and fallback mechanisms
- Implement rate limiting for Bedrock API calls

### Phase 2: Frontend Integration (Fry)

- Create GuestCard, GuestList, and HostBadge components
- Enhance episode cards with guest indicators
- Add guest section to episode detail page
- Implement guest-based search and filtering

### Phase 3: Data Migration (Bender + Leela)

- Use existing CLI script for historical episodes
- Ensure all episodes have guest extraction status
- Set up monitoring and alerting
- Optimize batch processing performance

### Phase 4: Advanced Features (Future)

- Guest profiles and aggregated appearances
- Guest-based recommendations
- Manual override capabilities

## Success Criteria

- 90%+ episodes have guest extraction attempted
- 75%+ extraction confidence score for processed episodes
- Zero impact on episode import performance
- Users can discover episodes by guest names
