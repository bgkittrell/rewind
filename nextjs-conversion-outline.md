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

### 1.2 Essential Dependencies
- **UI**: Next.js 15, React 18, Tailwind CSS
- **Database**: Prisma ORM with PostgreSQL
- **Authentication**: NextAuth.js v5
- **Audio**: Web Audio API with React hooks
- **Validation**: Zod
- **Testing**: Vitest + Playwright
- **PWA**: next-pwa
- **Icons**: @tabler/react-icons for consistent iconography

## Phase 2: Database and Persistence Layer

### 2.1 Database Design
- **Target Database**: PostgreSQL
- **ORM**: Prisma for type-safe database operations
- **Connection**: Prisma connection pooling

### 2.2 Database Schema Design
Design a relational schema with the following core entities:

**User Entity**: Store user profiles with email, name, preferences, and timestamps for creation, updates, and last activity.

**Podcast Entity**: Store podcast metadata including title, RSS URL, image, description, episode count, and sync timestamps. Each podcast belongs to a user.

**Episode Entity**: Store episode details including title, description, audio URL, duration, release date, images, guest information, and AI extraction data. Episodes belong to podcasts.

**Listening History Entity**: Track user playback progress with position, duration, completion status, and timestamps. Links users to episodes.

### 2.3 Data Access Layer
- **Repository Pattern**: Abstract database operations
- **Connection Pooling**: Prisma connection pooling
- **Migrations**: Automated database migrations with Prisma

## Phase 3: Authentication System

### 3.1 NextAuth.js v5 Implementation
- **Providers**: Email/password authentication
- **Session Management**: JWT-based sessions
- **Security**: CSRF protection, secure cookies
- **Database Sessions**: Store sessions in PostgreSQL

### 3.2 Authentication Flow
Configure NextAuth with credentials provider supporting email/password authentication. Set up custom pages for sign-in, sign-up, and email verification. Implement JWT and session callbacks for user data management.

### 3.3 User Management
- **Registration**: Email verification workflow
- **Password Reset**: Secure password reset flow
- **Profile Management**: User preferences and settings
- **Session Security**: Automatic session refresh

## Phase 4: API Layer (Next.js API Routes)

### 4.1 API Route Structure
Organize API routes into logical groupings:
- **Authentication endpoints**: signup, signin, verification
- **Podcast management**: CRUD operations for podcasts and episodes
- **Episode operations**: individual episode management and search
- **Playback tracking**: listening history management
- **Recommendations**: episode suggestion engine
- **RSS synchronization**: feed parsing and updates

### 4.2 API Implementation Strategy
- **Request Validation**: Zod schemas for input validation
- **Error Handling**: Standardized error responses
- **Logging**: Structured logging for debugging and monitoring

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
  - Neutral backgrounds and text colors
- **Typography**: 
  - Font Stack: Inter with system font fallbacks
  - Weight hierarchy for headers and body text
  - Responsive size scale
- **Spacing System**: Consistent spacing scale based on 4px units
- **Border Radius**: Consistent rounding for components

### 5.2 Mobile-First Layout Architecture

#### App Shell Layout
The mobile layout follows a standard app structure with a fixed header at the top, a scrollable main content area that takes up the remaining space, a floating media player positioned above the bottom navigation, and a fixed bottom navigation bar.

The header contains three sections: a hamburger menu icon on the left, the app title "Rewind" in the center, and a contextual action button on the right. The main content area is fully scrollable and contains cards or lists of episodes/podcasts with proper spacing between elements.

The floating media player appears only when audio is playing and shows album art on the left, episode information in the center, and playback controls on the right. The bottom navigation contains three equally-spaced tabs: Home, Library, and Search, each with icons and labels.

#### Desktop Layout
The desktop layout expands to utilize the wider screen with a sidebar navigation on the left and an expanded main content area. The header increases in height and includes additional elements like a user profile section and more action buttons.

The sidebar contains vertical navigation links with proper spacing and hover states. The main content area includes a filter bar at the top with pill-shaped filter buttons, followed by a grid layout of episodes or podcasts that can display multiple items per row.

The floating media player expands in height with larger album art, more detailed episode information, a visible progress bar, and additional controls.

### 5.3 Component Visual Specifications

#### Header Component
- Fixed height header with white background and red accents
- Large, semibold typography for titles
- Consistent icon sizing using @tabler/react-icons
- Subtle shadow for elevation
- Responsive layout with proper spacing

#### Bottom Navigation
- Fixed height with red gradient background
- White icons with labels
- Clear active state indication
- Minimum touch target sizes for accessibility

#### Episode Card
The episode card layout features a horizontal design with a square thumbnail on the left containing the episode artwork and a play button overlay. To the right is the content area with the episode title prominently displayed, followed by podcast name and duration, the release date, and a progress bar showing listening progress.
- Consistent padding and borders
- Hover effects and transitions
- Rounded thumbnail images
- Clear typography hierarchy

#### Podcast Card
The podcast card uses a vertical layout with a large cover art image at the top, followed by the podcast title, episode count and last update information, and a full-width action button at the bottom. The card has rounded corners and subtle border styling.
- Responsive width handling
- Generous padding for touch targets
- Subtle borders and shadows
- Clear typography hierarchy

#### Media Player (Floating)
The floating media player spans the full width of the screen and is divided into sections: album art thumbnail on the left, episode information in the center-left, a progress indicator with time display in the center-right, and playback controls on the far right.
- Fixed positioning above navigation
- White background with shadow
- Border separation from content
- Responsive layout

#### Filter Pills
Filter pills are displayed horizontally as rounded buttons that users can tap to filter content. The active filter has a red background with white text, while inactive filters have a light gray background with dark text and show a hover state when users interact with them.
- Rounded pill design
- Clear active/inactive states
- Proper spacing and typography

### 5.4 Responsive Breakpoints
- **Mobile**: Primary experience (default)
- **Tablet**: Medium screens with adjusted layouts
- **Desktop**: Large screens with sidebar navigation
- **Large Desktop**: Expanded content areas

### 5.5 Loading and Empty States

#### Skeleton Loading
- Shimmer animations for loading states
- Grid-based skeleton layouts
- Consistent placeholder sizing

#### Empty States
- Helpful illustrations and messaging
- Clear call-to-action buttons
- Contextual suggestions for next steps

## Phase 6: User Interface Components

### 6.1 Component Architecture
- **Design System**: Red theme with accessibility compliance
- **Component Library**: Reusable UI components with TypeScript
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 compliance with screen reader support

### 6.2 Core UI Components
**Layout Components**: App shell with header, navigation, and floating player sections. Desktop sidebar navigation for larger screens.

**Content Components**: Podcast and episode cards with consistent styling and interactions. Media player with audio controls and progress tracking. Search interface with filtering capabilities.

**Modal Components**: Authentication modals for login and signup flows. Podcast addition modal with RSS input. Confirmation dialogs for destructive actions.

**Form Components**: Input fields with validation states. Filter controls and dropdowns. Audio player interface elements.

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
Core audio functionality includes playback controls (play, pause, seek, speed adjustment), background playback when the app is backgrounded, resume functionality that remembers playback position across sessions, and offline playback with cached audio files.

### 7.3 Performance Optimization
- **Audio Preloading**: Intelligent preloading of next episodes
- **Local Storage**: Frequently played episodes cached locally
- **Memory Management**: Efficient audio resource cleanup

## Phase 8: Search and Discovery

### 8.1 Search Implementation
- **Full-text Search**: PostgreSQL full-text search capabilities
- **Search Indexing**: Optimized database indexes for search performance
- **Filter Options**: Genre, date range, podcast, completion status
- **Search History**: Recent searches and suggested queries

### 8.2 Search Features
Search capabilities include episode search across title, description, and guest names. Podcast search within user's library. Advanced filters for date range, completion status, and favorites. Search highlighting for matching terms in results. Instant search with debouncing for performance.

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
PWA capabilities include offline access to cached podcasts and episodes, app installation with add to home screen functionality, background sync to update podcasts when connection is restored, optional push notifications for new episodes, app shortcuts for quick actions, and responsive design that works on all screen sizes.

### 9.3 Strategy Overview
- **App Shell Caching**: Cache navigation and layout components
- **Data Storage**: Cache podcast metadata and episode information
- **Image Storage**: Cache podcast and episode artwork
- **Audio Storage**: Selective audio file storage for offline playback

## Phase 10: Deployment and Infrastructure

### 10.1 Deployment Platform
- **Primary**: AWS with Next.js deployment
- **Database**: Amazon RDS PostgreSQL
- **File Storage**: Amazon S3 for images and audio assets
- **CDN**: Amazon CloudFront for content delivery
- **Infrastructure**: AWS CDK or CloudFormation for infrastructure as code

### 10.2 Environment Configuration
Environment setup includes local development with proper tooling, staging environment for preview deployments and testing, production environment with optimized deployment, database environments with data isolation, and secrets management through AWS Secrets Manager and environment variables.

### 10.3 CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment to AWS
- **Quality Gates**: Tests must pass before deployment
- **Database Migrations**: Automated schema migrations
- **Rollback Strategy**: Quick rollback capability for issues

## Phase 11: Testing Strategy

### 11.1 Testing Framework
- **Unit Tests**: Vitest for component and utility testing
- **Integration Tests**: API route testing with test database
- **E2E Tests**: Playwright for user journey testing
- **Visual Testing**: Screenshot comparison for UI consistency

### 11.2 Test Coverage
Testing priorities include authentication flow (login, signup, password reset), podcast management (add, remove, sync podcasts), audio playback (play, pause, seek, progress tracking), search functionality (search accuracy and performance), PWA features (offline functionality), and mobile experience (touch interactions and responsive design).

### 11.3 Quality Assurance
- **Accessibility Testing**: Screen reader and keyboard navigation
- **Cross-browser Testing**: Chrome, Firefox, Safari compatibility
- **Mobile Testing**: iOS Safari, Chrome Mobile, Samsung Internet

## Success Metrics and Validation

### Feature Completeness
- **Authentication**: Complete user management system
- **Podcast Management**: RSS feed integration and sync
- **Audio Playback**: Full media player with background support
- **Search**: Fast, accurate full-text search
- **PWA**: Offline functionality and app installation

### User Experience Metrics
- **Mobile Usability**: Touch target size compliance
- **Accessibility**: WCAG 2.1 AA compliance
- **PWA Score**: High Lighthouse PWA score
- **Cross-browser**: Feature parity across target browsers

## Timeline and Resource Allocation

### Estimated Timeline (12-14 weeks)
- **Weeks 1-2**: Project setup and database design
- **Weeks 3-4**: Authentication and user management
- **Weeks 5-7**: Core API development and UI components
- **Weeks 8-9**: Audio player and search features
- **Weeks 10-11**: PWA implementation and AWS infrastructure
- **Weeks 12-13**: Testing and deployment
- **Week 14**: Go-live support and issue resolution

### Resource Requirements
- **Development**: 2-3 full-stack developers
- **Design**: 1 UI/UX designer for component refinement
- **QA**: 1 QA engineer for testing and validation
- **DevOps**: 1 DevOps engineer for deployment and monitoring

## Risk Assessment and Mitigation

### Technical Risks
- **Authentication Issues**: Comprehensive auth testing
- **Mobile Compatibility**: Extensive device testing
- **Audio Playback**: Cross-browser audio testing
- **AWS Infrastructure**: Proper AWS service configuration and monitoring

### Business Risks
- **Feature Parity**: Detailed feature comparison and testing
- **Timeline Delays**: Buffer time and phased approach
- **Cost Overruns**: Regular budget reviews and scope management

## Conclusion

This Next.js 15 monolith will create a maintainable, performant, and feature-rich podcast discovery application. The unified architecture will simplify development, reduce infrastructure complexity, and improve the overall user experience while providing a solid foundation for future enhancements.

The focus on UI and persistence layers ensures a modern, accessible, and mobile-first experience that helps podcast enthusiasts rediscover older episodes from their favorite shows.