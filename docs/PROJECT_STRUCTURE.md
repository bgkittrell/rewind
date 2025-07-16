# Rewind Project Structure

## Overview

This document outlines the directory structure and file organization of the Rewind podcast discovery app, a mobile-first Progressive Web App (PWA) for podcast enthusiasts aged 35+. The project is organized into distinct layers for frontend, backend, infrastructure, and documentation.

## Current Project Structure

```
rewind-cursor/
├── README.md                           # Project overview and setup instructions
├── package.json                        # Root package.json with workspace configuration
├── package-lock.json                   # Root dependency lock file
├── tsconfig.json                       # Root TypeScript configuration
├── .cursor/                            # Cursor IDE configuration
│   └── rules/                          # Cursor rules for AI assistant
├── docs/                               # 📚 Documentation
│   ├── README.md                       # Documentation index
│   ├── PLAN.md                         # Project plan and roadmap
│   ├── PROJECT_STRUCTURE.md            # This file
│   ├── BACKEND_API.md                  # API specifications
│   ├── BACKEND_LOGIC.md                # Business logic documentation
│   ├── DATABASE.md                     # Database schema and design
│   ├── DEPLOYMENT_PLAN.md              # Deployment strategy
│   ├── DEPLOYMENT_SETUP.md             # Deployment setup guide
│   ├── ERROR_HANDLING.md               # Error handling patterns
│   ├── INFRASTRUCTURE.md               # AWS infrastructure details
│   ├── LIBRARY_SHARING.md              # Library sharing features
│   ├── PWA_FEATURES.md                 # Progressive Web App features
│   ├── RECOMMENDATION_ENGINE.md        # Recommendation algorithm
│   ├── THIRD_PARTY_INTEGRATIONS.md     # External service integrations
│   ├── UI_DESIGN.md                    # UI/UX design specifications
│   ├── UI_TECH.md                      # Frontend technology stack
│   └── AWS_CONFIG.md                   # AWS service configurations
├── frontend/                           # 🎨 Frontend Application (React/Vite)
│   ├── package.json                    # Frontend dependencies
│   ├── index.html                      # Main HTML template
│   ├── vite.config.ts                  # Vite configuration
│   ├── tsconfig.json                   # TypeScript config for frontend
│   ├── tsconfig.node.json              # TypeScript config for Node.js
│   ├── tailwind.config.js              # Tailwind CSS configuration
│   ├── postcss.config.js               # PostCSS configuration
│   ├── playwright.config.ts            # Playwright E2E test configuration
│   ├── public/                         # Static assets
│   │   ├── manifest.json               # PWA manifest (generated)
│   │   └── icons/                      # PWA icons (generated)
│   ├── src/                            # Source code
│   │   ├── main.tsx                    # Application entry point
│   │   ├── index.css                   # Global styles
│   │   ├── vite-env.d.ts               # Vite environment types
│   │   ├── components/                 # React components
│   │   │   ├── Header.tsx              # App header with navigation
│   │   │   ├── BottomActionBar.tsx     # Bottom navigation bar
│   │   │   ├── PodcastCard.tsx         # Podcast display card
│   │   │   ├── EpisodeCard.tsx         # Episode display card
│   │   │   ├── AddPodcastModal.tsx     # Add podcast modal
│   │   │   ├── FloatingMediaPlayer.tsx # Media player component
│   │   │   ├── EpisodeSyncIndicator.tsx # Episode sync status indicator
│   │   │   ├── PWAUpdater.tsx          # PWA update notifications
│   │   │   ├── Home/                   # Home page components
│   │   │   ├── MediaPlayer/            # Media player sub-components
│   │   │   ├── guest/                  # Guest-related components
│   │   │   ├── ui/                     # Reusable UI components
│   │   │   └── auth/                   # Authentication components
│   │   │       ├── AuthModal.tsx       # Authentication modal
│   │   │       ├── LoginForm.tsx       # Login form
│   │   │       ├── SignupForm.tsx      # Signup form
│   │   │       └── ConfirmEmailForm.tsx # Email confirmation
│   │   ├── context/                    # React context providers
│   │   │   ├── AuthContext.tsx         # Authentication state management
│   │   │   └── MediaPlayerContext.tsx  # Media player state management
│   │   ├── routes/                     # React Router pages
│   │   │   ├── root.tsx                # Root layout component
│   │   │   ├── home.tsx                # Home page with recommendations
│   │   │   ├── library.tsx             # User's podcast library
│   │   │   ├── search.tsx              # Search for podcasts
│   │   │   └── error-page.tsx          # Error boundary page
│   │   ├── hooks/                      # Custom React hooks
│   │   │   ├── useAudioPlayer.ts       # Audio player logic
│   │   │   ├── useEpisodeSyncStatus.ts # Episode sync status
│   │   │   └── useRecommendations.ts   # Recommendation data
│   │   ├── services/                   # API and external services
│   │   │   ├── api.ts                  # API client configuration
│   │   │   ├── podcastService.ts       # Podcast-related API calls
│   │   │   ├── episodeService.ts       # Episode-related API calls
│   │   │   ├── recommendationService.ts # Recommendation API calls
│   │   │   └── resumeService.ts        # Resume/playback position
│   │   ├── theme/                      # Theme and design tokens
│   │   └── utils/                      # Utility functions
│   ├── tests/                          # Test files
│   │   └── e2e/                        # End-to-end tests
│   │       └── app.spec.ts             # Main app E2E tests
│   ├── test-results/                   # Test output (generated)
│   ├── playwright-report/              # Playwright test reports (generated)
│   ├── .env.production                 # Production environment variables (generated)
│   ├── .env.development                # Development environment variables (optional)
│   └── .env.backup                     # Backup environment file (generated)
├── backend/                            # 🔧 Backend API (Node.js/Lambda)
│   ├── package.json                    # Backend dependencies
│   ├── tsconfig.json                   # TypeScript configuration
│   └── src/                            # Backend source code
│       ├── handlers/                   # Lambda function handlers
│       │   ├── authHandler.ts          # Authentication endpoints
│       │   ├── podcastHandler.ts       # Podcast management endpoints
│       │   ├── episodeHandler.ts       # Episode management endpoints
│       │   ├── searchHandler.ts        # Search functionality
│       │   ├── recommendationHandler.ts # Recommendation engine
│       │   ├── episodeSyncProcessor.ts # Episode sync processor
│       │   ├── guestExtractionProcessor.ts # Guest extraction processor
│       │   └── __tests__/              # Handler tests
│       ├── services/                   # Business logic services
│       │   ├── dynamoService.ts        # DynamoDB operations
│       │   ├── rssService.ts           # RSS feed processing
│       │   ├── authService.ts          # Authentication logic
│       │   ├── bedrockService.ts       # AWS Bedrock AI integration
│       │   ├── episodeService.ts       # Episode management
│       │   ├── recommendationService.ts # Recommendation logic
│       │   ├── rateLimitService.ts     # Rate limiting
│       │   ├── loggerService.ts        # Structured logging with correlation IDs
│       │   ├── sqsService.ts           # SQS queue management
│       │   ├── searchService.ts        # Search functionality
│       │   └── __tests__/              # Service tests
│       ├── types/                      # TypeScript type definitions
│       │   └── index.ts                # Shared type definitions
│       ├── validation/                 # Input validation schemas
│       │   └── schemas.ts              # Validation schemas
│       └── utils/                      # Utility functions
│           ├── response.ts             # HTTP response utilities
│           ├── middleware.ts           # Request/response logging middleware
│           └── searchUtils.ts          # Search utility functions
├── infra/                              # 🏗️ Infrastructure as Code (AWS CDK)
│   ├── package.json                    # CDK dependencies
│   ├── tsconfig.json                   # TypeScript configuration
│   ├── cdk.json                        # CDK configuration
│   ├── jest.config.js                  # CDK unit test configuration
│   ├── bin/                            # CDK entry points
│   │   └── rewind.ts                   # Main CDK app definition
│   ├── lib/                            # CDK stack definitions
│   │   ├── rewind-data-stack.ts        # DynamoDB and Cognito resources
│   │   ├── rewind-backend-stack.ts     # Lambda and API Gateway resources
│   │   └── rewind-frontend-stack.ts    # S3 and CloudFront resources
│   └── cdk.out/                        # CDK output (generated)
├── scripts/                            # 🚀 Deployment and utility scripts
│   └── deploy.sh                       # Main deployment script
├── tests/                              # 🧪 Integration tests (planned)
├── cdk.context.json                    # CDK context (generated)
└── .gitignore                          # Git ignore patterns
```

## Layer Architecture

### Frontend Layer (React/TypeScript)

- **Technology**: React 18 with React Router v7, TypeScript, Tailwind CSS
- **Build Tool**: Vite for fast development and optimized builds
- **State Management**: React Context for auth and media player state
- **Testing**: Playwright for E2E testing, Vitest for unit tests
- **PWA Features**: Service worker, manifest, offline support

### Backend Layer (Node.js/Lambda)

- **Technology**: Node.js 18 with TypeScript, AWS Lambda functions
- **API Design**: RESTful endpoints with JSON request/response
- **Authentication**: AWS Cognito with JWT tokens
- **Database**: DynamoDB with AWS SDK v3
- **External Services**: RSS feed parsing, podcast metadata

### Infrastructure Layer (AWS CDK)

- **Technology**: AWS CDK v2 with TypeScript
- **Architecture**: Serverless with API Gateway, Lambda, DynamoDB
- **Security**: IAM roles, Cognito User Pools, CORS configuration
- **Monitoring**: CloudWatch logs and metrics
- **Deployment**: Multi-stack organization for separation of concerns

### Documentation Layer

- **Format**: Markdown files with technical specifications
- **Coverage**: API docs, database schema, deployment guides
- **Maintenance**: Updated with implementation changes
- **Reference**: Comprehensive guides for development and operations

## Key Files and Their Purposes

### Configuration Files

- **`package.json`**: Root workspace configuration with npm scripts
- **`tsconfig.json`**: TypeScript configuration for consistent compilation
- **`vite.config.ts`**: Frontend build configuration with PWA plugins
- **`tailwind.config.js`**: Tailwind CSS customization and theming
- **`cdk.json`**: CDK project configuration and feature flags

### Core Application Files

- **`frontend/src/main.tsx`**: Application entry point with React Router setup
- **`frontend/src/routes/root.tsx`**: Root layout with navigation and auth
- **`backend/src/handlers/`**: Lambda function handlers for API endpoints
- **`infra/bin/rewind.ts`**: CDK app definition and stack instantiation

### Build and Deployment

- **`scripts/deploy.sh`**: Automated deployment script with validation
- **CDK Stacks**: Modular infrastructure definition
- **Environment Files**: Auto-generated from CDK outputs

## Development Workflow

### Local Development

1. **Setup**: `npm install` in root directory
2. **Frontend**: `npm run dev` for development server
3. **Backend**: Deploy to AWS for testing (no local server)
4. **Testing**: `npm run test` for unit tests, `npm run test:e2e` for E2E

### Deployment Process

1. **Validation**: Lint, format, and test checks
2. **Infrastructure**: CDK deployment of AWS resources
3. **Environment**: Auto-generation of environment variables
4. **Frontend**: Build and upload to S3/CloudFront
5. **Health Checks**: Automated API and frontend validation

## File Organization Principles

### Separation of Concerns

- **Frontend**: User interface and user experience
- **Backend**: Business logic and data processing
- **Infrastructure**: AWS resource management
- **Documentation**: Technical specifications and guides

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Directories**: kebab-case for consistency
- **Environment**: Prefix with `VITE_` for frontend variables

### Code Organization

- **Components**: Grouped by feature or domain
- **Services**: API integration and external services
- **Types**: Shared TypeScript definitions
- **Utils**: Pure functions and helper utilities

## Future Structure Enhancements

### Planned Additions

- **`backend/src/middleware/`**: Authentication and validation middleware
- **`backend/src/models/`**: Data models and business objects
- **`frontend/src/hooks/`**: Custom React hooks
- **`frontend/src/store/`**: State management (if needed)
- **`shared/`**: Shared types and utilities between frontend/backend

### Testing Improvements

- **Unit Tests**: Component and service testing
- **Integration Tests**: API endpoint testing
- **Performance Tests**: Load testing for Lambda functions
- **Visual Tests**: UI component screenshot testing

### Documentation Enhancements

- **API Documentation**: OpenAPI/Swagger specifications
- **Component Documentation**: Storybook for UI components
- **Architecture Decision Records**: Technical decision tracking
- **Runbooks**: Operational procedures and troubleshooting

## Implementation Status

### Current Implementation ✅

- ✅ Complete project structure with proper separation
- ✅ Frontend React application with routing and performance optimizations
- ✅ Backend Lambda functions with full API implementation
- ✅ CDK infrastructure with modular stacks
- ✅ Deployment automation with validation
- ✅ Environment variable management
- ✅ Comprehensive testing (137 tests - 109 backend, 28 frontend)
- ✅ Structured logging with correlation IDs
- ✅ Request/response logging middleware
- ✅ Full TypeScript type safety in backend (zero `any` types)
- ✅ Episode management and search functionality
- ✅ Database optimizations with batch operations

### Next Phase 🚧

- 🚧 API documentation with OpenAPI/Swagger
- 🚧 Request validation middleware implementation
- 🚧 Frontend test coverage expansion
- 🚧 E2E test suite completion

### Future Enhancements 📋

- 📋 Multi-environment support (dev/staging/prod)
- 📋 Advanced state management if needed
- 📋 Component library with Storybook
- 📋 API documentation with OpenAPI
- 📋 Performance monitoring and observability

## Notes for Development

### AI Agent Guidelines

- Follow the established file organization patterns
- Use TypeScript for all new code
- Maintain separation between frontend and backend
- Update documentation when making structural changes
- Follow naming conventions for consistency

### Development Best Practices

- Use absolute imports where configured
- Keep components small and focused
- Implement proper error handling
- Write tests for new features
- Document complex business logic

### Deployment Considerations

- Environment variables are auto-generated
- CDK handles infrastructure changes
- Test deployments in non-production first
- Monitor CloudWatch logs for issues
- Use staged deployments for major changes

## References

- [PLAN.md](./PLAN.md): Project roadmap and task management
- [BACKEND_API.md](./BACKEND_API.md): API endpoint specifications
- [DATABASE.md](./DATABASE.md): Database schema and design
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md): AWS infrastructure details
- [DEPLOYMENT_SETUP.md](./DEPLOYMENT_SETUP.md): Deployment procedures
- [UI_TECH.md](./UI_TECH.md): Frontend technology stack details
