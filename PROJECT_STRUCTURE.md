\# Rewind Project Structure Specifications

## Overview
This document defines the project structure for Rewind, a mobile-first Progressive Web App \(PWA\) for podcast enthusiasts aged 35\+. The structure organizes frontend, backend, and infrastructure code, facilitating development, testing, and deployment using AWS CDK, aligning with the plan \(see PLAN.md\) and technical requirements.

## Project Setup
- **Environment**:
  - Node.js (v18.x)
  - AWS CLI configured with credentials
  - AWS CDK installed globally
- **Initialization**:
  \```
  mkdir rewind-project
  cd rewind-project
  npm init -y
  npm install -g aws-cdk
  npm install typescript ts-node @types/node
  npx tsc --init
  \```
- **Directory Layout**:
  - `docs/`: Documentation files (e.g., `PLAN.md`, `UI_TECH.md`).
  - `frontend/`: Frontend codebase.
  - `backend/`: Backend Lambda functions.
  - `infra/`: AWS CDK configuration.
  - `tests/`: Unit and integration tests.

## Directory Structure
### Root Directory
- `package.json`: Project dependencies and scripts.
- `tsconfig.json`: TypeScript configuration.
- `README.md`: Project overview and setup instructions.

### Frontend (`frontend/`)
- **Purpose**: Contains the React-based PWA.
- **Structure**:
  - `src/`
    - `components/`: Reusable UI components (e.g., `Header.tsx`, `FloatingMediaPlayer.tsx`).
    - `routes/`: Route definitions (e.g., `home.tsx`, `library.tsx`).
    - `services/`: API service layer (e.g., `podcastService.ts`).
    - `context/`: State management (e.g., `AppContext.tsx`).
    - `mocks/`: Mock data for testing (e.g., `handlers.ts`).
    - `index.tsx`: App entry point.
  - `public/`: Static assets (e.g., `manifest.json`, `icon-192.png`).
  - `vite.config.ts`: Vite configuration with PWA plugin.
  - `.storybook/`: Storybook configuration.
- **Build Output**: `dist/` directory for S3 deployment.

### Backend (`backend/`)
- **Purpose**: Contains Lambda functions and shared logic.
- **Structure**:
  - `src/`
    - `handlers/`: Lambda handler files (e.g., `podcastHandler.ts`, `shareHandler.ts`).
    - `services/`: Business logic (e.g., `recommendationService.ts`).
    - `utils/`: Utility functions (e.g., `errorHandler.ts`).
  - `tsconfig.json`: TypeScript configuration for backend.
  - `package.json`: Backend dependencies (e.g., `@aws-sdk/client-dynamodb`).
- **Build Output**: Compiled JS files for Lambda deployment.

### Infrastructure (`infra/`)
- **Purpose**: AWS CDK stacks and configuration.
- **Structure**:
  - `bin/`: CDK app entry point (e.g., `rewind.ts`).
  - `lib/`: Stack definitions (e.g., `RewindFrontendStack.ts`, `RewindBackendStack.ts`).
  - `cdk.json`: CDK configuration.
  - `package.json`: CDK dependencies.
- **Deployment**: Managed via `cdk deploy`.

### Tests (`tests/`)
- **Purpose**: Houses unit and integration tests.
- **Structure**:
  - `unit/`: Frontend (Jest) and backend (Vitest) unit tests.
  - `integration/`: End-to-end tests (e.g., API and UI flows).
  - `setup.ts`: Test environment setup.

## Development Workflow
- **Frontend**:
  - Run: \`npm run dev\` (Vite development server).
  - Build: \`npm run build\` (Vite production build).
  - Test: \`npm run test\` (Vitest/Jest), \`npm run storybook\` (Storybook).
- **Backend**:
  - Run locally: Use `serverless-offline` or local Lambda emulator.
  - Test: \`npm run test\` (Vitest).
- **Infrastructure**:
  - Synth: \`cdk synth\`
  - Deploy: \`cdk deploy\`
  - Destroy: \`cdk destroy\`

## Version Control
- **Git Repository**:
  - Initialize: \`git init\`
  - Add: \`git add .\`
  - Commit: \`git commit -m "Initial project structure"\`
  - Remote: Push to GitHub or AWS CodeCommit.
- **Branching**: Use `main` for production, `develop` for integration, feature branches (e.g., `feature/library-sharing`).

## Notes for AI Agent
- Set up directories and files as outlined.
- Configure `package.json` scripts for build and test commands.
- Ensure TypeScript configurations align with UI_TECH.md and BACKEND_API.md.
- Commit structure to Git after setup.
- Report issues (e.g., missing dependencies) in PLAN.md.

## References
- PLAN.md: Development environment setup.
- UI_TECH.md: Frontend structure and testing.
- BACKEND_API.md: Backend handler organization.
- AWS_CONFIG.md: Infrastructure integration.
- INFRASTRUCTURE.md: Deployment targets.
