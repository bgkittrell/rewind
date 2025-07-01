# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rewind is a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+ to rediscover older episodes. The project uses AWS serverless architecture with a React frontend and Node.js Lambda backend.

## Development Commands

### Project Setup

```bash
# Initialize the project structure (not yet implemented)
npm init -y
npm install -g aws-cdk
npm install typescript ts-node @types/node
npx tsc --init
```

### Frontend Development (when implemented)

```bash
# Development server
npm run dev

# Production build
npm run build

# Run tests
npm run test

# Storybook for component development
npm run storybook

# Test coverage
npm run test -- --coverage
```

### Backend Development (when implemented)

```bash
# Run backend tests
npm run test

# Local Lambda emulation (with serverless-offline)
npm run dev:backend
```

### Infrastructure (AWS CDK)

```bash
# Bootstrap CDK (one-time setup)
cdk bootstrap aws://<account-id>/us-east-1

# Synthesize CloudFormation templates
cdk synth

# Deploy all stacks
cdk deploy --all

# Destroy infrastructure
cdk destroy
```

## Architecture Overview

This is a documentation-heavy project currently in the planning phase. The architecture follows a serverless pattern:

### Project Structure (Planned)

- `frontend/` - React PWA with Router 7, TypeScript, Tailwind CSS, Vite
- `backend/` - Node.js Lambda functions with TypeScript
- `infra/` - AWS CDK infrastructure definitions
- `tests/` - Unit and integration tests
- `docs/` - Comprehensive documentation (current state)

### Technology Stack

- **Frontend**: Router 7, TypeScript, Tailwind CSS, Vite, PWA with Workbox
- **Backend**: Node.js 18.x Lambda functions, TypeScript
- **Database**: DynamoDB with pay-per-request billing
- **Infrastructure**: AWS (S3, CloudFront, API Gateway, Lambda, DynamoDB, Personalize)
- **Testing**: Storybook, Vitest, MSW for API mocking
- **Authentication**: Amazon Cognito with JWT

### Key AWS Services

- **Frontend Hosting**: S3 + CloudFront + Route 53
- **Backend**: API Gateway + Lambda functions
- **Database**: DynamoDB with streams for ML pipeline
- **ML/AI**: AWS Personalize for recommendation engine
- **Scheduling**: EventBridge for daily RSS feed updates
- **Monitoring**: CloudWatch logs and alarms

## Development Guidelines

### Documentation Management
- **Regularly update the docs when making core changes** - The documentation should always be an accurate representation of the app
- Update PLAN.md, PROJECT_STRUCTURE.md, and other relevant docs when implementing new features
- Keep CLAUDE.md current with latest development practices and project status

### Frontend Development

- Use React Router with `clientLoader` and `clientAction` for business logic
- Business logic goes in service layer (`src/services/`)
- Use MSW to mock API calls during development and testing
- Follow mobile-first responsive design principles
- Implement PWA features early (service worker, offline capability)
- Use @tabler/icons-react for all icons (consistent, accessible icon system)
- Follow red color scheme (#eb4034 primary, #c72e20 secondary)

### Backend Development

- Lambda functions should be in `backend/src/handlers/`
- Shared business logic in `backend/src/services/`
- Use TypeScript with proper error handling
- Follow RESTful API conventions defined in BACKEND_API.md

### Testing Strategy

- Component testing with Storybook
- Unit tests with Vitest
- Integration tests for API endpoints
- Use MSW for API mocking in tests

### Infrastructure

- All infrastructure defined as AWS CDK TypeScript code
- Deploy to `dev` stage first, then `prod`
- Monitor costs closely (budget alerts at $50/month)

## Important Files

### Documentation Files (Current State)

- `PLAN.md` - Master development plan with milestones and tasks
- `PROJECT_STRUCTURE.md` - Detailed project organization
- `UI_TECH.md` - Frontend technical specifications
- `BACKEND_API.md` - API endpoint specifications
- `INFRASTRUCTURE.md` - AWS architecture details
- `DATABASE.md` - DynamoDB schema design

### Configuration Files (To Be Created)

- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite build configuration with PWA plugin
- `tailwind.config.js` - Tailwind CSS configuration
- `cdk.json` - CDK configuration

## Development Workflow

1. **Planning Phase** (Current): All specifications documented in markdown files
2. **Setup Phase**: Initialize directory structure per PROJECT_STRUCTURE.md
3. **Frontend Development**: Build React components per UI_TECH.md specifications
4. **Backend Development**: Implement Lambda functions per BACKEND_API.md
5. **Infrastructure**: Deploy via CDK per INFRASTRUCTURE.md
6. **Testing**: Comprehensive testing per UI_TECH.md guidelines

## Recent Updates (Fixed Issues)

### Technology Stack Corrections
- Updated from "Router 7" to React Router v7 throughout documentation
- Standardized on Vitest for all unit/integration testing, Storybook for component testing
- Updated to AWS CDK v2 with modern construct patterns
- Removed Redis dependencies (not needed for v1)

### Authentication Architecture
- Migrated from Auth0 to Amazon Cognito JWT authentication
- Updated database schema to remove password fields (handled by Cognito)
- Added proper Cognito integration documentation

### API Consistency
- Consolidated and standardized all API endpoints in BACKEND_API.md
- Added missing critical endpoints (playback tracking, episode feedback)
- Standardized error response format across all endpoints

### Database Schema
- Added missing tables: ListeningHistory, UserFavorites
- Removed authentication-related fields (handled by Auth0)
- Added proper Global Secondary Indexes for efficient queries
- Updated with complete query patterns

### Infrastructure
- Completed AWS_CONFIG.md with full CDK v2 implementation
- Added comprehensive stack definitions with proper TypeScript examples
- Updated to latest AWS construct patterns and best practices

### Documentation Completeness
- Fixed truncated UI_DESIGN.md file
- Completed ERROR_HANDLING.md with comprehensive error scenarios
- Created missing THIRD_PARTY_INTEGRATIONS.md file
- All documentation files now complete and consistent

## Current Project Status

**Phase**: Frontend Development In Progress

### Completed ✅
- **Planning and Design**: All specifications complete and reviewed
- **Documentation Review**: Comprehensive fixes and consistency improvements
- **Architecture Decisions**: Technology stack finalized and documented
- **Database Design**: Complete schema with all necessary tables and relationships
- **API Specifications**: Consistent endpoint definitions with proper error handling
- **Infrastructure Design**: Full AWS CDK v2 implementation ready
- **Project Setup**: Frontend workspace initialized with React Router v7, TypeScript, Tailwind CSS
- **Core Components**: Auth, PWA features, side navigation, floating media player
- **Library Functionality**: Complete podcast browsing with episode management

### In Progress 🚧
1. **Library Features** (Recently Completed)
   - ✅ Podcast list view with thumbnails and metadata
   - ✅ Podcast detail pages with episode browsing
   - ✅ Episode search functionality within podcasts
   - ✅ Date sorting (newest/oldest first)
   - ✅ Infinite scroll for episode lists
   - ✅ Scroll position persistence using localStorage
   - ✅ Mobile-first responsive design

### Next Steps 🚀
1. **Frontend Enhancements**
   - Search functionality across all podcasts
   - Enhanced media player features
   - Offline capabilities and PWA optimization

2. **Backend Development**
   - API endpoints for podcast and episode management
   - User authentication with Cognito
   - Recommendation engine integration

3. **Infrastructure Deployment**
   - AWS CDK deployment
   - Production environment setup

## Notes

- Project documentation has been comprehensively reviewed and corrected
- All critical inconsistencies and missing pieces have been addressed
- Currently ready for project setup and initialization phase
- When implementing, follow the detailed specifications in the documentation files
- Use the task tracking in PLAN.md to monitor development progress
- All development should follow mobile-first principles for the target demographic (35+ podcast enthusiasts)
