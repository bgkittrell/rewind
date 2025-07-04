# Rewind Project Guidelines for Claude

## Project Overview
Mobile-first PWA for podcast enthusiasts aged 35+ to rediscover older episodes through intelligent recommendations.

## Technology Stack
- **Frontend**: React Router v7, TypeScript, Tailwind CSS, Vite
- **Backend**: AWS Lambda, API Gateway, DynamoDB  
- **Infrastructure**: AWS CDK
- **Testing**: Vitest, Playwright (E2E)
- **Deployment**: GitHub Actions, AWS S3, CloudFront

## Code Style and Standards
- Use TypeScript with strict type checking
- Follow existing ESLint and Prettier configurations  
- Prefer functional components with hooks
- Use Tailwind CSS for styling with mobile-first approach
- Follow existing file structure in frontend/, backend/, infra/
- Use descriptive variable and function names

## Testing Requirements
- Unit tests required for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage
- Use `npm run test` for running tests

## Review Focus Areas
1. **Security**: No hardcoded secrets, proper input validation, secure AWS configurations
2. **Performance**: Efficient algorithms, proper caching, bundle size optimization  
3. **Accessibility**: WCAG compliance, semantic HTML, mobile usability
4. **Error Handling**: Comprehensive error boundaries, API error handling, user feedback
5. **Code Quality**: Clean, readable, maintainable code following project patterns
6. **Testing**: Adequate test coverage and quality

## Available Commands
- Lint: `npm run lint`
- Test: `npm run test` 
- Build: `npm run build`
- Format check: `npm run format:check`
- Development: `npm run dev`
- Deploy: `npm run deploy`

## Architecture Notes
- Mobile-first responsive design
- PWA features with offline capability
- AWS serverless backend architecture
- Cognito authentication system
- DynamoDB for user data and podcast metadata
- Recommendation engine for episode discovery

## Key Features to Understand
- User library sharing between friends
- Podcast episode recommendation system
- Offline listening capabilities
- Audio playback with progress tracking
- Social features for episode sharing