# Rewind App: Next.js Monolith Conversion Outline

## Executive Summary

This document outlines the conversion of the Rewind podcast discovery app from a React Router v7/Vite frontend + AWS Lambda backend architecture to a unified Next.js 15 monolith. The conversion focuses on rebuilding the UI and persistence layers while maintaining the core functionality for podcast enthusiasts aged 35+ to rediscover older episodes.

## Current Architecture Analysis

### Existing Stack
- **Frontend**: React Router v7 + Vite + TypeScript + Tailwind CSS
- **Backend**: AWS Lambda functions + API Gateway + DynamoDB
- **Authentication**: AWS Cognito
- **Infrastructure**: AWS CDK
- **Features**: PWA capabilities, audio playback, AI-powered recommendations

### Core Functionality to Preserve
- Mobile-first podcast discovery interface
- User authentication and profile management
- Podcast library management (add/remove podcasts via RSS)
- Episode browsing and search within user's library
- Audio playback with position tracking
- Episode recommendations based on listening history
- Library sharing capabilities
- PWA features (offline access, app installation)

## Phase 1: Project Setup and Foundation

### 1.1 Next.js 15 Project Initialization
- **Framework**: Next.js 15 with App Router
- **TypeScript**: Full TypeScript configuration
- **Styling**: Tailwind CSS with existing design system
- **Package Manager**: npm (maintain consistency)
- **Node Version**: 18+ (maintain existing requirement)

### 1.2 Project Structure
```
rewind-nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Main app routes
│   │   ├── api/               # API routes (replaces Lambda)
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   ├── lib/                   # Utilities and configurations
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript type definitions
│   └── middleware.ts          # Next.js middleware
├── prisma/                    # Database schema and migrations
├── public/                    # Static assets
├── tests/                     # Test files
└── docs/                      # Documentation
```

### 1.3 Essential Dependencies
- **UI**: Next.js 15, React 18, Tailwind CSS
- **Database**: Prisma ORM with PostgreSQL
- **Authentication**: NextAuth.js v5
- **Audio**: Web Audio API with React hooks
- **Validation**: Zod (maintain existing choice)
- **Testing**: Vitest + Playwright
- **PWA**: next-pwa

## Phase 2: Database and Persistence Layer

### 2.1 Database Migration Strategy
- **Target Database**: PostgreSQL (hosted on Vercel Postgres or similar)
- **Migration Tool**: Custom migration scripts to transfer from DynamoDB
- **ORM**: Prisma for type-safe database operations

### 2.2 Database Schema Design
```prisma
// Core entities matching existing DynamoDB structure

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  preferences     Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lastActiveAt    DateTime @default(now())
  
  podcasts        Podcast[]
  listeningHistory ListeningHistory[]
  sharedLibraries SharedLibrary[]
}

model Podcast {
  id              String   @id @default(cuid())
  title           String
  rssUrl          String   @unique
  imageUrl        String?
  description     String?
  episodeCount    Int      @default(0)
  lastSynced      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  episodes        Episode[]
}

model Episode {
  id                        String   @id @default(cuid())
  title                     String
  description               String?
  audioUrl                  String
  duration                  String?
  releaseDate               DateTime
  imageUrl                  String?
  guests                    String[] // JSON array
  tags                      String[] // JSON array
  extractedGuests           String[] // AI-extracted guests
  guestExtractionStatus     String?  // 'pending' | 'completed' | 'failed'
  guestExtractionDate       DateTime?
  guestExtractionConfidence Float?
  rawGuestData              String?
  createdAt                 DateTime @default(now())
  
  podcastId       String
  podcast         Podcast @relation(fields: [podcastId], references: [id])
  listeningHistory ListeningHistory[]
}

model ListeningHistory {
  id                String   @id @default(cuid())
  playbackPosition  Int      @default(0) // seconds
  duration          Int?     // total duration in seconds
  isCompleted       Boolean  @default(false)
  lastPlayedAt      DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  userId            String
  episodeId         String
  user              User     @relation(fields: [userId], references: [id])
  episode           Episode  @relation(fields: [episodeId], references: [id])
  
  @@unique([userId, episodeId])
}

model SharedLibrary {
  id          String   @id @default(cuid())
  shareUrl    String   @unique
  isActive    Boolean  @default(true)
  expiresAt   DateTime?
  accessCount Int      @default(0)
  createdAt   DateTime @default(now())
  
  userId      String
  user        User     @relation(fields: [userId], references: [id])
}
```

### 2.3 Data Access Layer
- **Repository Pattern**: Abstract database operations
- **Caching Strategy**: Redis or in-memory caching for frequently accessed data
- **Connection Pooling**: Prisma connection pooling
- **Migrations**: Automated database migrations with Prisma

## Phase 3: Authentication System

### 3.1 NextAuth.js v5 Implementation
- **Providers**: Email/password authentication
- **Session Management**: JWT-based sessions
- **Security**: CSRF protection, secure cookies
- **Database Sessions**: Store sessions in PostgreSQL

### 3.2 Authentication Flow
```typescript
// Simplified auth configuration
export const authConfig = {
  providers: [
    CredentialsProvider({
      // Email/password authentication
    })
  ],
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    verifyRequest: '/auth/verify-email',
  },
  callbacks: {
    jwt: ({ token, user }) => {
      // JWT token customization
    },
    session: ({ session, token }) => {
      // Session customization
    }
  }
}
```

### 3.3 User Management
- **Registration**: Email verification workflow
- **Password Reset**: Secure password reset flow
- **Profile Management**: User preferences and settings
- **Session Security**: Automatic session refresh

## Phase 4: API Layer (Next.js API Routes)

### 4.1 API Route Structure
```
src/app/api/
├── auth/                      # Authentication endpoints
│   ├── signup/route.ts
│   ├── signin/route.ts
│   └── verify/route.ts
├── podcasts/                  # Podcast management
│   ├── route.ts              # GET (list), POST (add)
│   ├── [id]/route.ts         # GET, PUT, DELETE
│   └── [id]/episodes/route.ts
├── episodes/                  # Episode operations
│   ├── route.ts
│   ├── [id]/route.ts
│   └── search/route.ts
├── listening-history/         # Playback tracking
│   ├── route.ts
│   └── [episodeId]/route.ts
├── recommendations/           # Episode recommendations
│   └── route.ts
├── library/                   # Library management
│   ├── share/route.ts
│   └── shared/[shareId]/route.ts
└── sync/                      # RSS feed synchronization
    └── route.ts
```

### 4.2 API Implementation Strategy
- **Request Validation**: Zod schemas for input validation
- **Error Handling**: Standardized error responses
- **Rate Limiting**: Implement rate limiting for API endpoints
- **Logging**: Structured logging for debugging and monitoring
- **Response Caching**: Cache static/semi-static responses

### 4.3 External Service Integration
- **RSS Feed Processing**: Server-side RSS parsing and episode extraction
- **Audio Metadata**: Extract duration and metadata from audio files
- **AI Guest Extraction**: Integrate with OpenAI API for guest name extraction
- **Image Processing**: Optimize and resize podcast/episode images

## Phase 5: User Interface Components

### 5.1 Component Architecture
- **Design System**: Maintain existing red theme (#eb4034, #c72e20)
- **Component Library**: Reusable UI components with TypeScript
- **Responsive Design**: Mobile-first approach (375px–414px primary)
- **Accessibility**: WCAG 2.1 compliance with screen reader support

### 5.2 Core UI Components Migration
```typescript
// Key components to rebuild:
- Layout Components:
  - AppShell: Header + bottom navigation + floating player
  - Header: Navigation and contextual actions
  - BottomActionBar: Home, Library, Search navigation
  - SideMenu: User profile and app settings

- Content Components:
  - PodcastCard: Display podcast with metadata
  - EpisodeCard: Episode display with play controls
  - MediaPlayer: Audio playback with progress tracking
  - SearchInterface: Full-text search with filters

- Modal Components:
  - AddPodcastModal: RSS URL input and validation
  - AuthModals: Login, signup, email verification
  - ConfirmationDialogs: Delete confirmations

- Form Components:
  - Input fields with validation
  - Filter pills and dropdowns
  - Audio player controls
```

### 5.3 State Management
- **React Server Components**: Leverage server components for data fetching
- **Client State**: React Context for audio player and authentication
- **Form State**: React Hook Form with Zod validation
- **URL State**: Next.js routing for navigation state

### 5.4 Loading and Error States
- **Skeleton Components**: Loading placeholders for perceived performance
- **Error Boundaries**: Graceful error handling with user-friendly messages
- **Optimistic Updates**: Immediate UI feedback for user actions
- **Progressive Enhancement**: Core functionality works without JavaScript

## Phase 6: Audio Playback System

### 6.1 Media Player Implementation
- **Web Audio API**: Cross-browser audio playback
- **Media Session API**: Background playback controls
- **Progress Tracking**: Real-time playback position sync
- **Playlist Management**: Queue and episode progression

### 6.2 Audio Features
```typescript
// Core audio functionality:
- Playback Controls: Play, pause, seek, speed adjustment
- Background Playback: Continue playing when app is backgrounded
- Resume Functionality: Remember playback position across sessions
- Offline Playback: Cache audio files for offline listening
- Cross-device Sync: Resume on different devices (future enhancement)
```

### 6.3 Performance Optimization
- **Audio Preloading**: Intelligent preloading of next episodes
- **Bandwidth Management**: Adaptive quality based on connection
- **Caching Strategy**: Local storage for frequently played episodes
- **Memory Management**: Efficient audio resource cleanup

## Phase 7: Search and Discovery

### 7.1 Search Implementation
- **Full-text Search**: PostgreSQL full-text search capabilities
- **Search Indexing**: Optimized database indexes for search performance
- **Filter Options**: Genre, date range, podcast, completion status
- **Search History**: Recent searches and suggested queries

### 7.2 Search Features
```typescript
// Search capabilities:
- Episode Search: Title, description, guest names
- Podcast Search: Within user's library
- Advanced Filters: Date range, completion status, favorites
- Search Highlighting: Highlight matching terms in results
- Instant Search: Real-time search with debouncing
- Search Analytics: Track popular search terms
```

### 7.3 Recommendation Engine (Basic Implementation)
- **Content-Based Filtering**: Similar episodes based on metadata
- **Collaborative Filtering**: Basic user behavior patterns
- **Recommendation API**: Separate endpoint for recommendation logic
- **A/B Testing**: Framework for testing recommendation algorithms

## Phase 8: Progressive Web App Features

### 8.1 PWA Implementation
- **Service Worker**: Cache strategy for offline functionality
- **Web App Manifest**: Installation and app metadata
- **Offline Support**: Core features available without internet
- **App Installation**: Native app-like installation experience

### 8.2 PWA Features
```typescript
// PWA capabilities:
- Offline Access: Cached podcasts and episodes
- App Installation: Add to home screen functionality
- Background Sync: Update podcasts when connection restored
- Push Notifications: New episode alerts (optional)
- App Shortcuts: Quick actions from home screen
- Responsive Design: Works on all screen sizes
```

### 8.3 Caching Strategy
- **App Shell**: Cache navigation and layout components
- **Data Caching**: Cache podcast metadata and episode information
- **Image Caching**: Cache podcast and episode artwork
- **Audio Caching**: Selective audio file caching for offline playback

## Phase 9: Library Sharing System

### 9.1 Sharing Implementation
- **Share URLs**: Generate unique, time-limited sharing links
- **Privacy Controls**: Granular sharing permissions
- **Access Tracking**: Monitor shared library access
- **Share Management**: View and revoke shared libraries

### 9.2 Sharing Features
```typescript
// Library sharing capabilities:
- Generate Share Link: Create unique URL for library access
- Expiration Control: Set automatic link expiration
- Access Analytics: Track who accessed shared libraries
- Selective Sharing: Share specific podcasts or full library
- Social Integration: Easy sharing to social platforms
- QR Code Generation: Mobile-friendly sharing method
```

## Phase 10: Performance and Optimization

### 10.1 Performance Targets
- **Core Web Vitals**: Optimize LCP, FID, CLS metrics
- **Load Time**: Sub-3-second initial load on 3G networks
- **Bundle Size**: Minimize JavaScript bundle size
- **Image Optimization**: Next.js Image component for optimized images

### 10.2 Optimization Strategies
- **Code Splitting**: Route-based and component-based code splitting
- **Server-Side Rendering**: SSR for initial page loads
- **Static Generation**: ISR for podcast and episode pages
- **Database Optimization**: Query optimization and indexing
- **CDN Integration**: Static asset delivery optimization

### 10.3 Monitoring and Analytics
- **Performance Monitoring**: Real User Monitoring (RUM)
- **Error Tracking**: Application error monitoring
- **Usage Analytics**: User behavior and feature usage tracking
- **Database Monitoring**: Query performance and optimization

## Phase 11: Testing Strategy

### 11.1 Testing Framework
- **Unit Tests**: Vitest for component and utility testing
- **Integration Tests**: API route testing with test database
- **E2E Tests**: Playwright for user journey testing
- **Visual Testing**: Screenshot comparison for UI consistency

### 11.2 Test Coverage
```typescript
// Testing priorities:
- Authentication Flow: Login, signup, password reset
- Podcast Management: Add, remove, sync podcasts
- Audio Playback: Play, pause, seek, progress tracking
- Search Functionality: Search accuracy and performance
- Library Sharing: Share generation and access
- PWA Features: Offline functionality and caching
- Mobile Experience: Touch interactions and responsive design
```

### 11.3 Quality Assurance
- **Accessibility Testing**: Screen reader and keyboard navigation
- **Cross-browser Testing**: Chrome, Firefox, Safari compatibility
- **Mobile Testing**: iOS Safari, Chrome Mobile, Samsung Internet
- **Performance Testing**: Load testing and stress testing

## Phase 12: Deployment and Infrastructure

### 12.1 Deployment Platform
- **Primary**: Vercel (seamless Next.js integration)
- **Database**: Vercel Postgres or Supabase
- **File Storage**: Vercel Blob or Cloudinary for images
- **Monitoring**: Vercel Analytics and logging

### 12.2 Environment Configuration
```typescript
// Environment setup:
- Development: Local development with Docker Compose
- Staging: Preview deployments for testing
- Production: Optimized production deployment
- Database: Separate environments with data isolation
- Secrets Management: Environment variables for sensitive data
```

### 12.3 CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **Quality Gates**: Tests must pass before deployment
- **Database Migrations**: Automated schema migrations
- **Rollback Strategy**: Quick rollback capability for issues

## Phase 13: Migration and Data Transfer

### 13.1 Data Migration Strategy
- **DynamoDB Export**: Export existing user data and podcast libraries
- **Data Transformation**: Convert DynamoDB format to PostgreSQL schema
- **User Migration**: Migrate user accounts and authentication
- **Validation**: Verify data integrity after migration

### 13.2 Migration Process
```typescript
// Migration steps:
1. Data Export: Export all DynamoDB tables
2. Schema Setup: Initialize PostgreSQL with Prisma schema
3. Data Transform: Convert and clean data for new schema
4. User Migration: Transfer user accounts and preferences
5. Validation: Verify data completeness and accuracy
6. Testing: Full application testing with migrated data
7. Go-live: Switch DNS and decommission old infrastructure
```

### 13.3 Rollback Plan
- **Data Backup**: Complete backup before migration
- **Dual Running**: Run both systems temporarily
- **Quick Switch**: Ability to revert to old system if needed
- **User Communication**: Clear communication about migration timeline

## Success Metrics and Validation

### Performance Metrics
- **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Load Time**: Initial load under 3 seconds on 3G
- **Bundle Size**: JavaScript bundle under 200KB gzipped
- **Database**: Query response times under 100ms average

### User Experience Metrics
- **Mobile Usability**: Touch target size compliance (48px minimum)
- **Accessibility**: WCAG 2.1 AA compliance
- **PWA Score**: Lighthouse PWA score > 90
- **Cross-browser**: 100% feature parity across target browsers

### Feature Completeness
- **Authentication**: Complete user management system
- **Podcast Management**: RSS feed integration and sync
- **Audio Playback**: Full media player with background support
- **Search**: Fast, accurate full-text search
- **Library Sharing**: Secure sharing with access controls
- **PWA**: Offline functionality and app installation

## Timeline and Resource Allocation

### Estimated Timeline (16-20 weeks)
- **Weeks 1-2**: Project setup and database design
- **Weeks 3-4**: Authentication and user management
- **Weeks 5-7**: Core API development and data migration
- **Weeks 8-10**: UI component development and audio player
- **Weeks 11-12**: Search and recommendation features
- **Weeks 13-14**: PWA implementation and library sharing
- **Weeks 15-16**: Testing, optimization, and deployment
- **Weeks 17-18**: Migration execution and validation
- **Weeks 19-20**: Go-live support and issue resolution

### Resource Requirements
- **Development**: 2-3 full-stack developers
- **Design**: 1 UI/UX designer for component refinement
- **QA**: 1 QA engineer for testing and validation
- **DevOps**: 1 DevOps engineer for deployment and monitoring
- **Project Management**: 1 technical project manager

## Risk Assessment and Mitigation

### Technical Risks
- **Data Migration Complexity**: Thorough testing and staged migration
- **Performance Degradation**: Continuous performance monitoring
- **Authentication Issues**: Comprehensive auth testing
- **Mobile Compatibility**: Extensive device testing

### Business Risks
- **User Disruption**: Clear communication and rollback plan
- **Feature Parity**: Detailed feature comparison and testing
- **Timeline Delays**: Buffer time and phased approach
- **Cost Overruns**: Regular budget reviews and scope management

## Conclusion

This conversion from React Router v7/Vite + AWS Lambda to Next.js 15 monolith will create a more maintainable, performant, and feature-rich podcast discovery application. The unified architecture will simplify development, reduce infrastructure complexity, and improve the overall user experience while maintaining all existing functionality and adding new capabilities.

The focus on UI and persistence layers ensures a solid foundation for future enhancements while preserving the core value proposition of helping podcast enthusiasts rediscover older episodes from their favorite shows.