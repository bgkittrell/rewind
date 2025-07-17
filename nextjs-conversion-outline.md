# Rewind App: Next.js Monolith Development Outline

## Executive Summary

This document outlines the development of Rewind, a mobile-first Progressive Web App for podcast enthusiasts aged 35+ to discover and rediscover older episodes. The application will be built as a Next.js 15 monolith focusing on UI and persistence layers with a clean, modern architecture.

## Application Overview

### Target Users
- Podcast enthusiasts aged 35+
- Users seeking to rediscover older episodes from their favorite shows
- Mobile-first users who prefer app-like experiences
- Comedy podcast listeners as primary demographic

### Core Features
- Mobile-first podcast discovery interface
- User authentication and profile management
- Podcast library management (add/remove podcasts via RSS)
- Episode browsing and search within user's library
- Audio playback with position tracking
- Episode recommendations based on listening history
- PWA features (offline access, app installation)

## Phase 1: Project Setup and Foundation

### 1.1 Next.js 15 Project Initialization
- **Framework**: Next.js 15 with App Router
- **TypeScript**: Full TypeScript configuration
- **Styling**: Tailwind CSS with custom design system
- **Package Manager**: npm
- **Node Version**: 18+

### 1.2 Project Structure
```
rewind-nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (dashboard)/       # Main app routes
│   │   ├── api/               # API routes
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── layout/           # Layout components
│   │   ├── ui/               # Base UI components
│   │   ├── forms/            # Form components
│   │   ├── media/            # Audio player components
│   │   └── podcast/          # Podcast-specific components
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
- **Validation**: Zod
- **Testing**: Vitest + Playwright
- **PWA**: next-pwa

## Phase 2: Database and Persistence Layer

### 2.1 Database Design
- **Target Database**: PostgreSQL
- **ORM**: Prisma for type-safe database operations
- **Connection**: Prisma connection pooling

### 2.2 Database Schema Design
```prisma
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

## Phase 5: Visual Design and Layout System

### 5.1 Design System Foundation
- **Color Palette**: 
  - Primary Red: #eb4034
  - Secondary Red: #c72e20
  - Dark Red: #a42318
  - Background: #ffffff
  - Text Primary: #1a1a1a
  - Text Secondary: #666666
  - Border: #e5e5e5
- **Typography**: 
  - Font Stack: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
  - Headers: 600 weight
  - Body: 400 weight
  - Sizes: text-xs (12px), text-sm (14px), text-base (16px), text-lg (18px), text-xl (20px)
- **Spacing Scale**: 4px base unit (4, 8, 12, 16, 20, 24, 32, 40, 48, 64px)
- **Border Radius**: rounded-sm (2px), rounded (4px), rounded-md (6px), rounded-lg (8px), rounded-xl (12px)

### 5.2 Mobile-First Layout Architecture

#### App Shell Layout (375px - 414px primary)
The mobile layout follows a standard app structure with a fixed header at the top (56px height), a scrollable main content area that takes up the remaining space, a floating media player positioned above the bottom navigation (64px height), and a fixed bottom navigation bar (64px height).

The header contains three sections: a hamburger menu icon on the left, the app title "Rewind" in the center, and a contextual action button (like "Add Podcast") on the right. The main content area is fully scrollable and contains cards or lists of episodes/podcasts with proper spacing between elements.

The floating media player appears only when audio is playing and shows album art on the left (48x48px), episode information in the center, and playback controls on the right. The bottom navigation contains three equally-spaced tabs: Home (house icon), Library (books icon), and Search (magnifying glass icon), each with labels underneath.

#### Desktop Layout (768px+)
The desktop layout expands to utilize the wider screen with a sidebar navigation on the left (approximately 240px wide) and an expanded main content area. The header increases to 64px height and includes additional elements like a user profile section and more action buttons.

The sidebar contains vertical navigation links (Home, Library, Search, Settings) with proper spacing and hover states. The main content area includes a filter bar at the top with pill-shaped filter buttons, followed by a grid layout of episodes or podcasts that can display 3-4 items per row depending on screen size.

The floating media player expands to 80px height with larger album art, more detailed episode information, a visible progress bar, and additional controls like previous/next track and settings.

### 5.3 Component Visual Specifications

#### Header Component
- **Height**: 56px mobile, 64px desktop
- **Background**: White with red accents
- **Typography**: text-lg font-semibold for title
- **Icons**: 24px Heroicons, red color (#eb4034)
- **Shadow**: shadow-sm for subtle elevation
- **Layout**: justify-between with padding-x-4

#### Bottom Navigation
- **Height**: 64px fixed
- **Background**: Red gradient (#eb4034 to #c72e20)
- **Icons**: 24px white icons with labels
- **Typography**: text-xs white labels
- **Active State**: Brighter icon + underline
- **Touch Targets**: 48px minimum for accessibility

#### Episode Card
The episode card layout features a horizontal design with an 80x80px square thumbnail on the left containing the episode artwork and a play button overlay. To the right is the content area with the episode title prominently displayed, followed by podcast name and duration on the same line separated by a bullet point, the release date below that, and a progress bar at the bottom showing listening progress.
- **Padding**: p-4
- **Border**: border border-gray-200 rounded-lg
- **Hover**: hover:shadow-md transition
- **Thumbnail**: 80x80px rounded-md
- **Typography**: title (text-base font-medium), meta (text-sm text-gray-600)

#### Podcast Card
The podcast card uses a vertical layout with a large 120x120px cover art image at the top, followed by the podcast title, episode count and last update information, and a full-width action button at the bottom labeled "View Episodes". The card has rounded corners and subtle border styling.
- **Width**: Full width mobile, 300px desktop
- **Padding**: p-6
- **Border**: border-2 border-gray-100 rounded-xl
- **Cover Art**: 120x120px rounded-lg shadow-sm
- **Typography**: title (text-lg font-semibold), meta (text-sm text-gray-500)

#### Media Player (Floating)
The floating media player spans the full width of the screen and is divided into four sections: a 48x48px album art thumbnail on the left, episode information (title and podcast name) in the center-left, a progress indicator with time display in the center-right, and playback controls (play/pause and next) on the far right.
- **Position**: Fixed bottom, above navigation
- **Height**: 64px
- **Background**: White with shadow-lg
- **Border**: border-t border-gray-200
- **Padding**: px-4 py-2

#### Filter Pills
Filter pills are displayed horizontally as rounded buttons that users can tap to filter content. The active filter has a red background with white text, while inactive filters have a light gray background with dark text and show a hover state when users interact with them.
- **Active**: bg-red-500 text-white
- **Inactive**: bg-gray-100 text-gray-700 hover:bg-gray-200
- **Padding**: px-4 py-2
- **Border Radius**: rounded-full
- **Typography**: text-sm font-medium

### 5.4 Responsive Breakpoints
- **Mobile**: 0px - 767px (default)
- **Tablet**: 768px - 1023px (md:)
- **Desktop**: 1024px+ (lg:)
- **Large Desktop**: 1280px+ (xl:)

### 5.5 Loading and Empty States

#### Skeleton Loading
- **Episode Card Skeleton**: Gray rectangles with shimmer animation
- **Grid Skeleton**: 2x3 grid on mobile, 3x4 on desktop
- **Animation**: pulse animation with bg-gray-200

#### Empty States
- **No Podcasts**: Illustration + "Add your first podcast" CTA
- **No Episodes**: "No episodes found" with filter reset option
- **Search No Results**: "No episodes match your search" with suggestions

## Phase 6: User Interface Components

### 6.1 Component Architecture
- **Design System**: Red theme with accessibility compliance
- **Component Library**: Reusable UI components with TypeScript
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 compliance with screen reader support

### 6.2 Core UI Components
```typescript
// Layout Components:
- AppShell: Header + bottom navigation + floating player
- Header: Navigation and contextual actions
- BottomActionBar: Home, Library, Search navigation
- SideMenu: User profile and app settings (desktop)

// Content Components:
- PodcastCard: Display podcast with metadata
- EpisodeCard: Episode display with play controls
- MediaPlayer: Audio playback with progress tracking
- SearchInterface: Full-text search with filters

// Modal Components:
- AddPodcastModal: RSS URL input and validation
- AuthModals: Login, signup, email verification
- ConfirmationDialogs: Delete confirmations

// Form Components:
- Input fields with validation
- Filter pills and dropdowns
- Audio player controls
```

### 6.3 State Management
- **React Server Components**: Leverage server components for data fetching
- **Client State**: React Context for audio player and authentication
- **Form State**: React Hook Form with Zod validation
- **URL State**: Next.js routing for navigation state

### 6.4 Loading and Error States
- **Skeleton Components**: Loading placeholders for perceived performance
- **Error Boundaries**: Graceful error handling with user-friendly messages
- **Optimistic Updates**: Immediate UI feedback for user actions
- **Progressive Enhancement**: Core functionality works without JavaScript

## Phase 7: Audio Playback System

### 7.1 Media Player Implementation
- **Web Audio API**: Cross-browser audio playback
- **Media Session API**: Background playback controls
- **Progress Tracking**: Real-time playback position sync
- **Playlist Management**: Queue and episode progression

### 7.2 Audio Features
```typescript
// Core audio functionality:
- Playback Controls: Play, pause, seek, speed adjustment
- Background Playback: Continue playing when app is backgrounded
- Resume Functionality: Remember playback position across sessions
- Offline Playback: Cache audio files for offline listening
```

### 7.3 Performance Optimization
- **Audio Preloading**: Intelligent preloading of next episodes
- **Bandwidth Management**: Adaptive quality based on connection
- **Caching Strategy**: Local storage for frequently played episodes
- **Memory Management**: Efficient audio resource cleanup

## Phase 8: Search and Discovery

### 8.1 Search Implementation
- **Full-text Search**: PostgreSQL full-text search capabilities
- **Search Indexing**: Optimized database indexes for search performance
- **Filter Options**: Genre, date range, podcast, completion status
- **Search History**: Recent searches and suggested queries

### 8.2 Search Features
```typescript
// Search capabilities:
- Episode Search: Title, description, guest names
- Podcast Search: Within user's library
- Advanced Filters: Date range, completion status, favorites
- Search Highlighting: Highlight matching terms in results
- Instant Search: Real-time search with debouncing
```

### 8.3 Recommendation Engine (Basic Implementation)
- **Content-Based Filtering**: Similar episodes based on metadata
- **Collaborative Filtering**: Basic user behavior patterns
- **Recommendation API**: Separate endpoint for recommendation logic
- **A/B Testing**: Framework for testing recommendation algorithms

## Phase 9: Progressive Web App Features

### 9.1 PWA Implementation
- **Service Worker**: Cache strategy for offline functionality
- **Web App Manifest**: Installation and app metadata
- **Offline Support**: Core features available without internet
- **App Installation**: Native app-like installation experience

### 9.2 PWA Features
```typescript
// PWA capabilities:
- Offline Access: Cached podcasts and episodes
- App Installation: Add to home screen functionality
- Background Sync: Update podcasts when connection restored
- Push Notifications: New episode alerts (optional)
- App Shortcuts: Quick actions from home screen
- Responsive Design: Works on all screen sizes
```

### 9.3 Caching Strategy
- **App Shell**: Cache navigation and layout components
- **Data Caching**: Cache podcast metadata and episode information
- **Image Caching**: Cache podcast and episode artwork
- **Audio Caching**: Selective audio file caching for offline playback

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
- **PWA**: Offline functionality and app installation

## Timeline and Resource Allocation

### Estimated Timeline (12-14 weeks)
- **Weeks 1-2**: Project setup and database design
- **Weeks 3-4**: Authentication and user management
- **Weeks 5-7**: Core API development and UI components
- **Weeks 8-9**: Audio player and search features
- **Weeks 10-11**: PWA implementation and optimization
- **Weeks 12-13**: Testing and deployment
- **Week 14**: Go-live support and issue resolution

### Resource Requirements
- **Development**: 2-3 full-stack developers
- **Design**: 1 UI/UX designer for component refinement
- **QA**: 1 QA engineer for testing and validation
- **DevOps**: 1 DevOps engineer for deployment and monitoring

## Risk Assessment and Mitigation

### Technical Risks
- **Performance Degradation**: Continuous performance monitoring
- **Authentication Issues**: Comprehensive auth testing
- **Mobile Compatibility**: Extensive device testing
- **Audio Playback**: Cross-browser audio testing

### Business Risks
- **Feature Parity**: Detailed feature comparison and testing
- **Timeline Delays**: Buffer time and phased approach
- **Cost Overruns**: Regular budget reviews and scope management

## Conclusion

This Next.js 15 monolith will create a maintainable, performant, and feature-rich podcast discovery application. The unified architecture will simplify development, reduce infrastructure complexity, and improve the overall user experience while providing a solid foundation for future enhancements.

The focus on UI and persistence layers ensures a modern, accessible, and mobile-first experience that helps podcast enthusiasts rediscover older episodes from their favorite shows.