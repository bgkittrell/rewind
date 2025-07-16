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
- ✅ Coordinated mandatory commits for all team members
- ✅ Initiated production deployment sequence
- ✅ Monitored Leela's infrastructure deployment (Phase 1)
- ✅ Coordinated Bender's backend deployment (Phase 2)
- ✅ Coordinated Fry's frontend deployment (Phase 3)
- ✅ Successfully completed full production deployment mission
- ✅ Coordinated production monitoring for new podcasts added
- ✅ Identified and resolved critical production issue (Bedrock IAM permissions)
- ✅ Directed team to implement automatic episode import feature
- ✅ Instructed team to implement SQS async guest extraction with throttling

## Current Status Summary (2025-07-15 17:35)

**🚨 CRITICAL PRODUCTION ISSUE: Guest Extraction Still Failing**

**Latest Developments:**

- ❌ **Production Issue Persists**: Despite multiple claimed fixes, guest extraction remains non-functional
- ❌ **Root Cause**: Lack of AWS visibility and systematic verification approach
- ❌ **Team Issue**: Claims of fixes without proper end-to-end validation
- 🔄 **New Strategy**: Systematic AWS monitoring and step-by-step verification

**New Phase Status:**

1. 🔄 **Leela (Infrastructure)**: Create comprehensive AWS monitoring dashboard - PRIORITY 1
2. 🔄 **Bender (Backend)**: Build end-to-end pipeline validation system - PRIORITY 2
3. 🔄 **Fry (Frontend)**: Implement production validation testing - PRIORITY 3

**🎯 MANDATORY CHECKPOINTS ESTABLISHED**

**New Approach:**

- AWS visibility dashboard with live metrics
- End-to-end pipeline validation with logs
- Production testing with demonstrated proof
- No claims without evidence
- Systematic verification at every step

## Previous Production Deployment Status (2025-07-15 13:25)

**Phase 1: Infrastructure Deployment (Leela) - ✅ COMPLETED**

- CloudWatch monitoring dashboard: ✅ DEPLOYED
- Guest extraction monitoring infrastructure: ✅ DEPLOYED
- Automated alerts and metrics: ✅ ACTIVE
- Cost tracking infrastructure: ✅ OPERATIONAL
- Deployment time: 20.58 seconds
- Troubleshooting completed: CDK GraphWidget issue resolved
- Commit: `186f71e` - Fix applied and committed
- Verification: ✅ COMPLETE (13:18)

**Phase 2: Backend Deployment (Bender) - ✅ COMPLETED**

- Guest extraction integration: ✅ DEPLOYED
- Request validation with Zod schemas: ✅ DEPLOYED
- Batch processing functionality: ✅ OPERATIONAL
- Deployment time: 10.13 seconds
- Tests: 412 tests passing (100% pass rate)
- Quality checks: Zero errors (TypeScript, linting)
- CloudWatch metrics integration: ✅ OPERATIONAL

**Phase 3: Frontend Deployment (Fry) - ✅ COMPLETED**

- Core frontend features: ✅ DEPLOYED (95% production ready)
- Authentication components: ✅ DEPLOYED
- UI component library: ✅ DEPLOYED
- React performance optimizations: ✅ DEPLOYED
- Bundle optimization: ✅ DEPLOYED (code splitting)
- Deployment time: 8.17 seconds
- Frontend-backend connectivity: ✅ VERIFIED
- Quality checks: 59 tests passing (100% pass rate)
- Overall deployment: ✅ 85% PRODUCTION READY

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
