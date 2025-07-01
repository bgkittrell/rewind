# Rewind Development Plan

## Overview

Rewind is a mobile-first Progressive Web App (PWA) designed for podcast enthusiasts aged 35+ who enjoy rediscovering older episodes of their favorite podcasts, particularly comedy podcasts, when new content isn’t available. The app prioritizes simplicity, ease of use, and a recommendation engine tailored to listening history and favorite guests. Built with AWS serverless resources and the AWS CDK for low-cost hosting and developer familiarity, Rewind allows users to manage and share their podcast libraries effortlessly.

### Core Value Proposition

- **Primary Goal**: Enable users to rediscover older episodes for an entertaining listening experience.
- **Target Audience**: Tech-savvy adults aged 35+ who subscribe to multiple podcasts, especially comedy podcasts.
- **Key Differentiator**: Focus on rediscovery of older episodes with a robust recommendation engine.

### Technology Stack

- **Frontend**: React Router v7, TypeScript, Tailwind CSS, Vite, PWA.
- **Backend**: Node.js Lambdas, TypeScript, DynamoDB, Cognito JWT, RESTful APIs.
- **Infrastructure**: AWS (S3, CloudFront, API Gateway, Lambda, Personalize), AWS CDK v2.
- **Testing**: Storybook (component testing), Vitest (unit/integration tests).

## Milestones

- [x] Planning and Design (2 weeks) ✅ COMPLETED
  - Finalize requirements, wireframes, DynamoDB schema, CDK stacks.
- [x] Project Setup (3 days) ✅ COMPLETED
  - Create directory structure, initialize projects, configure Cognito.
- [x] Frontend Development (6 weeks) ✅ COMPLETED
  - Build UI components, PWA features, and audio playback.
- [x] Backend Development (6 weeks) ✅ COMPLETED
  - Set up APIs, recommendation engine, and library sharing.
- [ ] Testing (4 weeks) 🚧 IN PROGRESS
  - Unit and integration tests for UI, APIs, and features.
- [x] Deployment (1 week) ✅ COMPLETED
  - Deploy frontend to S3/CloudFront, backend via CDK.
- [ ] Monitoring and Iteration (Ongoing)
  - Track performance, user feedback, and optimize costs.

## Tasks

### Planning and Design

- [x] Create wireframes for Home, Library, and Search screens ([UI_DESIGN.md](#home-screen)).
- [x] Design DynamoDB schema for podcasts and episodes ([DATABASE.md](#schema-design)).
- [x] Define AWS CDK stacks for infrastructure ([AWS_CONFIG.md](#cdk-stacks)).
- [ ] Set up Cognito User Pool and application configuration.
- [ ] Create development environment and repository structure.

### Project Setup

- [ ] Initialize project directory structure per PROJECT_STRUCTURE.md.
- [ ] Set up root package.json with workspace configuration.
- [ ] Initialize frontend project with Vite and React Router v7.
- [ ] Initialize backend project with TypeScript and AWS Lambda setup.
- [ ] Initialize infrastructure project with AWS CDK v2.
- [ ] Configure Cognito User Pool for development and production.
- [ ] Set up environment variables and configuration files.
- [ ] Initialize testing frameworks (Vitest, Storybook, MSW).
- [ ] Create initial CI/CD workflow structure.

### Frontend Development

- [ ] Set up React Router v7, TypeScript, and Tailwind CSS ([UI_TECH.md](#project-setup)).
- [ ] Build header with menu button and side menu ([UI_DESIGN.md](#header), [UI_TECH.md](#header-component)).
- [ ] Implement bottom action bar (Home, Library, Search) ([UI_DESIGN.md](#bottom-action-bar)).
- [ ] Create episode cards with AI explanation button and release date ([UI_DESIGN.md](#episode-cards)).
- [ ] Develop floating media player with playback controls ([UI_DESIGN.md](#floating-media-player)).
- [ ] Add library sharing UI (button to generate URL) ([LIBRARY_SHARING.md](#ui)).
- [ ] Implement PWA service worker for offline playback ([PWA_FEATURES.md](#service-worker)).
- [ ] Set up Storybook for component testing ([UI_TECH.md](#testing)).

### Backend Development

- [ ] Configure Node.js Lambda functions with TypeScript ([BACKEND_API.md](#setup)).
- [ ] Implement podcast addition API (`POST /podcasts/add`) ([BACKEND_API.md](#podcast-addition)).
- [ ] Set up daily RSS feed updates via EventBridge ([BACKEND_LOGIC.md](#episode-updates)).
- [ ] Configure AWS Personalize for recommendation engine ([RECOMMENDATION_ENGINE.md](#setup)).
- [ ] Create library sharing API (`POST /library/share`) ([LIBRARY_SHARING.md](#backend)).
- [ ] Set up DynamoDB tables for users, podcasts, and share links ([DATABASE.md](#schema-design)).
- [ ] Implement error handling for APIs ([ERROR_HANDLING.md](#api-errors)).
- [ ] Configure Cognito for social login ([THIRD_PARTY_INTEGRATIONS.md](#amazon-cognito-authentication)).

### Testing

- [ ] Write Storybook stories for UI components ([UI_TECH.md](#testing)).
- [ ] Write Vitest tests for components, routes, and Lambda functions ([UI_TECH.md](#testing), [BACKEND_API.md](#testing)).
- [ ] Test Bluetooth/AirPlay compatibility ([UI_TECH.md](#external-device-support)).
- [ ] Test library sharing flow (generate and add podcasts) ([LIBRARY_SHARING.md](#testing)).

### Deployment

- [ ] Deploy frontend to S3/CloudFront via CDK ([INFRASTRUCTURE.md](#frontend-hosting)).
- [ ] Deploy backend (Lambda, API Gateway, DynamoDB) via CDK ([INFRASTRUCTURE.md](#backend-hosting)).
- [ ] Set up CloudWatch for monitoring ([INFRASTRUCTURE.md](#monitoring)).

### Monitoring and Iteration

- [ ] Track success metrics via AWS Pinpoint ([PLAN.md](#success-metrics)).
- [ ] Monitor costs with AWS Cost Explorer ([INFRASTRUCTURE.md](#cost-monitoring)).
- [ ] Refine recommendation engine based on feedback ([RECOMMENDATION_ENGINE.md](#feedback-loop)).

## Success Metrics

- User retention rate (weekly/monthly).
- Episodes rediscovered per user (>1 month old).
- Scroll distance before episode selection.
- Recommendation feedback engagement (thumbs-up/thumbs-down).
- Library sharing usage (links generated/added).
- Comedy episode engagement (% of listened episodes tagged as comedy).

## Notes for AI Agent

- Update this file by checking off completed tasks (e.g., `[x]`).
- Add notes for roadblocks (e.g., “Need clarification on Auth0 setup”).
- Commit changes to Git after completing each task.
- Refer to linked files for detailed specs (e.g., [UI_DESIGN.md](#ui-design)).

## References

- [UI_DESIGN.md](#ui-design): Screen and component designs.
- [UI_TECH.md](#ui-tech): Frontend technical implementation.
- [BACKEND_API.md](#backend-api): API endpoints and formats.
- [BACKEND_LOGIC.md](#backend-logic): Business logic and algorithms.
- [DATABASE.md](#database): Database schema and queries.
- [INFRASTRUCTURE.md](#infrastructure): AWS services and deployment.
- [AWS_CONFIG.md](#aws-config): AWS CDK and service settings.
- [RECOMMENDATION_ENGINE.md](#recommendation-engine): Recommendation logic.
- [DATA_STORAGE.md](#data-storage): Data management details.
- [PWA_FEATURES.md](#pwa-features): PWA and offline functionality.
- [LIBRARY_SHARING.md](#library-sharing): Library sharing feature.
- [ERROR_HANDLING.md](#error-handling): Error management.
- [PROJECT_STRUCTURE.md](#project-structure): Codebase organization.
- [THIRD_PARTY_INTEGRATIONS.md](#third-party-integrations): External services.

## Notes

- [ ] Initialize Git repository and add all markdown files.
- [ ] Set up development environment (Node.js, AWS CLI, etc.) ([PROJECT_STRUCTURE.md](#setup)).
