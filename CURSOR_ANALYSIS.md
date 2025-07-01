# Rewind Codebase Analysis for Cursor AI

## Project Overview & Current State

Rewind is a mobile-first Progressive Web App (PWA) designed for podcast enthusiasts aged 35+ to rediscover older episodes. The project is currently in the **Frontend Development Phase** with a well-structured monorepo using npm workspaces.

### Architecture Summary
- **Monorepo Structure**: Three main workspaces (frontend, backend, infra)
- **Frontend**: React Router v7 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js Lambda functions (planned)
- **Infrastructure**: AWS CDK v2 (planned)
- **Documentation**: Comprehensive markdown specifications

## Codebase Structure Analysis

### Frontend (`frontend/`)
**Status**: Active development, well-established patterns

#### Key Components (Implemented)
- `Auth.tsx` - Amazon Cognito authentication with proper error handling
- `EpisodeCard.tsx` - Reusable episode display component with accessibility
- `FloatingMediaPlayer.tsx` - Complex media player with full controls
- `SideMenu.tsx` - Navigation menu with proper mobile interactions
- `PWAInstallPrompt.tsx` - Progressive Web App installation UI
- `OfflineStatus.tsx` - Network status indicator

#### Component Patterns
```typescript
// Standard component structure found in codebase:
interface ComponentProps {
  // Props are well-typed with TypeScript interfaces
}

export function Component({ prop }: ComponentProps) {
  // Uses hooks for state management
  // Implements proper error boundaries
  // Includes accessibility attributes
  // Uses Tailwind for styling
}

// Storybook stories for each component
export default {
  title: 'Components/ComponentName',
  component: Component,
}
```

#### Service Layer (`frontend/src/services/`)
- Well-organized service functions for API calls
- Proper TypeScript typing
- Error handling patterns established
- MSW mocking setup for development

#### Testing Strategy
- **Storybook**: Component development and visual testing
- **Vitest**: Unit and integration tests
- **MSW**: API mocking for reliable testing
- **Coverage**: Targeting >80% code coverage

### Backend (`backend/`)
**Status**: Planned, structure defined

#### Planned Structure
```
backend/src/
├── handlers/     # Lambda function handlers
├── services/     # Business logic layer
└── utils/        # Shared utilities
```

#### Technology Stack
- Node.js 18.x Lambda functions
- TypeScript with strict mode
- AWS SDK v3 for AWS services
- DynamoDB for data persistence
- Amazon Cognito for authentication

### Infrastructure (`infra/`)
**Status**: Planned, AWS CDK v2 ready

#### Planned AWS Services
- **Frontend**: S3 + CloudFront + Route 53
- **Backend**: API Gateway + Lambda
- **Database**: DynamoDB with streams
- **Auth**: Amazon Cognito User Pools
- **ML**: AWS Personalize for recommendations

## Documentation Analysis

### Comprehensive Documentation (`docs/`)
The project has exceptional documentation coverage:

1. **PLAN.md** - Master development plan with task tracking
2. **UI_TECH.md** - Detailed frontend technical specifications
3. **BACKEND_API.md** - Complete API endpoint definitions
4. **DATABASE.md** - DynamoDB schema with query patterns
5. **AWS_CONFIG.md** - Infrastructure setup with CDK examples
6. **UI_DESIGN.md** - Design specifications and wireframes
7. **CLAUDE.md** - Project context and current status

### Documentation Quality
- ✅ Consistent formatting and structure
- ✅ Detailed technical specifications
- ✅ Code examples and patterns
- ✅ Clear relationships between components
- ✅ Regular updates tracking project progress

## Development Patterns & Best Practices

### TypeScript Usage
```typescript
// Strict TypeScript configuration
"strict": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
"noFallthroughCasesInSwitch": true
```

### React Router v7 Patterns
```typescript
// clientLoader for data fetching
export async function clientLoader() {
  const data = await fetchData();
  return { data };
}

// clientAction for form handling
export async function clientAction({ request }) {
  const formData = await request.formData();
  // Handle form submission
}
```

### Component Development
- Mobile-first responsive design
- Accessibility-first approach (ARIA labels, keyboard nav)
- Tailwind CSS utility classes
- @tabler/icons-react for consistent iconography
- Red color scheme (#eb4034 primary, #c72e20 secondary)

### Testing Approach
- Component testing with Storybook stories
- Unit testing with Vitest and @testing-library
- API mocking with MSW for reliable tests
- Coverage reporting with vitest/coverage-v8

## Key Dependencies Analysis

### Frontend Dependencies
```json
{
  "react": "^18.2.0",
  "react-router": "^7.0.0",
  "aws-amplify": "^6.15.1",
  "@tabler/icons-react": "^3.34.0",
  "idb-keyval": "^6.2.1"
}
```

### Development Tools
```json
{
  "vite": "^5.0.0",
  "vitest": "^1.0.0",
  "storybook": "^7.6.0",
  "msw": "^2.0.0",
  "tailwindcss": "^3.4.17"
}
```

## Database Schema Insights

### DynamoDB Tables
1. **Users** - Profile data (Cognito handles auth)
2. **Podcasts** - User's podcast library
3. **Episodes** - Episode metadata per podcast
4. **ListeningHistory** - Playback tracking
5. **UserFavorites** - User preferences and ratings
6. **UserFeedback** - Episode feedback for ML
7. **Shares** - Library sharing functionality

### Query Patterns
- Optimized for mobile use cases
- Efficient pagination with GSIs
- Proper partition key design for scalability

## Recommendations for Cursor AI

### When Working with This Codebase

1. **Follow Established Patterns**
   - Use existing component structures as templates
   - Follow the service layer pattern for API calls
   - Maintain TypeScript strict typing

2. **Mobile-First Approach**
   - Always consider mobile screen sizes first
   - Use Tailwind responsive utilities
   - Test touch interactions

3. **Documentation Updates**
   - Update relevant docs when making changes
   - Keep PLAN.md task list current
   - Reference comprehensive specs in docs/

4. **Testing Requirements**
   - Write Storybook stories for new components
   - Add unit tests with Vitest
   - Use MSW for API mocking

5. **Performance Considerations**
   - Implement infinite scroll for large lists
   - Use localStorage for state persistence
   - Optimize for PWA offline capabilities

### Common Tasks & Patterns

#### Adding a New Component
1. Create component file with TypeScript interface
2. Implement with Tailwind styling
3. Add accessibility attributes
4. Create Storybook story
5. Write unit tests
6. Update relevant documentation

#### Adding a New Route
1. Create route file with kebab-case naming
2. Implement clientLoader for data fetching
3. Add clientAction for form handling
4. Follow mobile-first design
5. Add to router configuration

#### API Integration
1. Add service function with proper typing
2. Implement error handling
3. Add MSW mock for testing
4. Update API documentation
5. Write integration tests

## Current Development Priorities

Based on PLAN.md and CLAUDE.md:

1. **Frontend Enhancements** (Current Focus)
   - Search functionality across all podcasts
   - Enhanced media player features
   - PWA optimization

2. **Backend Development** (Next Phase)
   - API endpoint implementation
   - Cognito integration
   - DynamoDB setup

3. **Infrastructure** (Final Phase)
   - AWS CDK deployment
   - Production environment

## Quality Indicators

### Strengths
- ✅ Comprehensive documentation
- ✅ Well-structured monorepo
- ✅ Consistent coding patterns
- ✅ Mobile-first design approach
- ✅ Accessibility considerations
- ✅ Proper testing setup
- ✅ TypeScript strict mode
- ✅ Modern React patterns

### Areas for Attention
- Backend implementation needs to start
- Infrastructure deployment pending
- Search functionality in development
- PWA features need completion

## Conclusion

This is a well-architected, documentation-driven project with excellent development practices. The codebase demonstrates professional-level organization with clear patterns, comprehensive testing, and thorough documentation. When working with this project, prioritize following the established patterns and keeping the documentation current.