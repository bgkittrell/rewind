# Environment Variables Audit Report

## Executive Summary

This audit compares environment variables defined in `.env.development` and `.env.production` files with their actual usage in the codebase. The findings reveal several gaps and inconsistencies that need to be addressed.

## Current State

### `.env.production` (Auto-generated in deployment)
The deployment workflow creates `frontend/.env.production` with these variables:
- `VITE_API_BASE_URL` - API base URL from CDK outputs
- `VITE_AWS_REGION` - AWS region
- `VITE_COGNITO_USER_POOL_ID` - Cognito User Pool ID
- `VITE_COGNITO_USER_POOL_CLIENT_ID` - Cognito User Pool Client ID
- `VITE_COGNITO_IDENTITY_POOL_ID` - Cognito Identity Pool ID

### `.env.development` (Missing)
**Status**: File does not exist. Should be created for local development.

## Frontend Environment Variables Analysis

### Variables Used in Code
| Variable | Used In | Purpose | Status |
|----------|---------|---------|--------|
| `VITE_API_BASE_URL` | `src/services/api.ts` | API endpoint | ✅ Defined in .env.production |
| `VITE_API_URL` | Test files | API endpoint (alternative name) | ❌ Not defined in .env files |
| `VITE_USER_POOL_ID` | `src/context/AuthContext.tsx` | Cognito User Pool | ❌ Mismatch: code uses `VITE_USER_POOL_ID` but .env has `VITE_COGNITO_USER_POOL_ID` |
| `VITE_USER_POOL_CLIENT_ID` | `src/context/AuthContext.tsx` | Cognito Client ID | ❌ Mismatch: code uses `VITE_USER_POOL_CLIENT_ID` but .env has `VITE_COGNITO_USER_POOL_CLIENT_ID` |
| `VITE_IDENTITY_POOL_ID` | `src/context/AuthContext.tsx` | Cognito Identity Pool | ❌ Mismatch: code uses `VITE_IDENTITY_POOL_ID` but .env has `VITE_COGNITO_IDENTITY_POOL_ID` |
| `VITE_RUM_APPLICATION_ID` | `src/config/rumConfig.ts` | AWS RUM Application ID | ❌ Not defined in .env files |
| `VITE_RUM_IDENTITY_POOL_ID` | `src/config/rumConfig.ts` | AWS RUM Identity Pool | ❌ Not defined in .env files |
| `VITE_RUM_REGION` | `src/config/rumConfig.ts` | AWS RUM Region | ❌ Not defined in .env files |

### Test-Only Variables
| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | Integration tests | API endpoint for tests |

## Backend Environment Variables Analysis

### Variables Set by CDK Infrastructure
| Variable | Set For Lambda | Purpose |
|----------|----------------|---------|
| `USERS_TABLE` | PodcastHandler, AuthHandler | Users table name |
| `PODCASTS_TABLE` | PodcastHandler, EpisodeHandler, SearchHandler, RecommendationHandler | Podcasts table name |
| `EPISODES_TABLE` | PodcastHandler, EpisodeHandler, RecommendationHandler | Episodes table name |
| `LISTENING_HISTORY_TABLE` | PodcastHandler, EpisodeHandler, RecommendationHandler | Listening history table name |
| `SHARES_TABLE` | PodcastHandler | Shares table name |
| `USER_POOL_ID` | PodcastHandler, AuthHandler | Cognito User Pool ID |
| `USER_POOL_CLIENT_ID` | PodcastHandler, AuthHandler | Cognito Client ID |
| `USER_FAVORITES_TABLE` | RecommendationHandler | User favorites table name |
| `GUEST_ANALYTICS_TABLE` | RecommendationHandler | Guest analytics table name |
| `USER_FEEDBACK_TABLE` | RecommendationHandler | User feedback table name |

### Variables Used in Code (Not Set by CDK)
| Variable | Used In | Purpose | Status |
|----------|---------|---------|--------|
| `AWS_REGION` | Multiple services | AWS region | ⚠️ Should be set by CDK |
| `ALLOWED_ORIGINS` | `src/utils/response.ts` | CORS origins | ❌ Not set anywhere |
| `NODE_ENV` | Multiple files | Environment mode | ⚠️ Should be set by CDK |
| `CSP_REPORT_URI` | `src/utils/response.ts` | Content Security Policy reporting | ❌ Not set anywhere |
| `LOG_LEVEL` | `src/services/loggerService.ts` | Logging level | ❌ Not set anywhere |
| `RATE_LIMIT_TABLE` | `src/services/rateLimitService.ts` | Rate limiting table | ❌ Not set by CDK |
| `CDK_DEFAULT_ACCOUNT` | `infra/bin/rewind.ts` | CDK deployment account | ⚠️ Set by CDK CLI |
| `CDK_DEFAULT_REGION` | `infra/bin/rewind.ts` | CDK deployment region | ⚠️ Set by CDK CLI |

## Critical Issues Found

### 1. Frontend Variable Name Mismatches
The deployment workflow creates variables with `VITE_COGNITO_` prefix, but the code expects them without the `COGNITO_` prefix:
- Code: `VITE_USER_POOL_ID` → .env: `VITE_COGNITO_USER_POOL_ID`
- Code: `VITE_USER_POOL_CLIENT_ID` → .env: `VITE_COGNITO_USER_POOL_CLIENT_ID`
- Code: `VITE_IDENTITY_POOL_ID` → .env: `VITE_COGNITO_IDENTITY_POOL_ID`

### 2. Missing AWS RUM Configuration
The RUM config is referenced but no environment variables are set:
- `VITE_RUM_APPLICATION_ID`
- `VITE_RUM_IDENTITY_POOL_ID`
- `VITE_RUM_REGION`

### 3. Missing Backend Environment Variables
Several backend services expect environment variables that are not set by CDK:
- `AWS_REGION` (should be set automatically)
- `ALLOWED_ORIGINS` (needed for CORS)
- `NODE_ENV` (needed for environment detection)
- `CSP_REPORT_URI` (needed for security)
- `LOG_LEVEL` (needed for logging)
- `RATE_LIMIT_TABLE` (needed for rate limiting)

### 4. Inconsistent API URL Variables
Frontend code uses both `VITE_API_BASE_URL` and `VITE_API_URL` in different places.

## Recommendations

### 1. Fix Frontend Variable Names
**Option A**: Update deployment workflow to match code expectations:
```yaml
VITE_API_BASE_URL=${{ steps.cdk-outputs.outputs.api-url }}
VITE_AWS_REGION=${{ env.AWS_REGION }}
VITE_USER_POOL_ID=${{ steps.cdk-outputs.outputs.user-pool-id }}
VITE_USER_POOL_CLIENT_ID=${{ steps.cdk-outputs.outputs.user-pool-client-id }}
VITE_IDENTITY_POOL_ID=${{ steps.cdk-outputs.outputs.identity-pool-id }}
```

**Option B**: Update code to match current deployment workflow (requires more changes).

### 2. Add Missing Backend Environment Variables to CDK
Update `infra/lib/rewind-backend-stack.ts` to set these variables for all Lambda functions:
```typescript
environment: {
  // ... existing variables
  AWS_REGION: cdk.Stack.of(this).region,
  NODE_ENV: 'production',
  LOG_LEVEL: 'INFO',
  ALLOWED_ORIGINS: 'https://your-domain.com', // from CDK outputs
  CSP_REPORT_URI: 'https://your-domain.com/csp-report',
  RATE_LIMIT_TABLE: rateLimitTable.tableName, // need to create this table
}
```

### 3. Create Rate Limit Table
The rate limit service expects a table that doesn't exist in the CDK infrastructure.

### 4. Standardize API URL Variable
Choose either `VITE_API_BASE_URL` or `VITE_API_URL` and update all references consistently.

### 5. Add AWS RUM Configuration
If RUM monitoring is needed, add these variables to the deployment workflow:
```yaml
VITE_RUM_APPLICATION_ID=${{ steps.cdk-outputs.outputs.rum-application-id }}
VITE_RUM_IDENTITY_POOL_ID=${{ steps.cdk-outputs.outputs.rum-identity-pool-id }}
VITE_RUM_REGION=${{ env.AWS_REGION }}
```

### 6. Create `.env.development` Template
Create a template for local development:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=your-local-user-pool-id
VITE_USER_POOL_CLIENT_ID=your-local-client-id
VITE_IDENTITY_POOL_ID=your-local-identity-pool-id
VITE_RUM_APPLICATION_ID=
VITE_RUM_IDENTITY_POOL_ID=
VITE_RUM_REGION=us-east-1
```

## Action Items

1. **HIGH PRIORITY**: Fix frontend variable name mismatches
2. **HIGH PRIORITY**: Add missing backend environment variables to CDK
3. **MEDIUM PRIORITY**: Create rate limit table in CDK
4. **MEDIUM PRIORITY**: Standardize API URL variable naming
5. **LOW PRIORITY**: Add AWS RUM configuration if monitoring is needed
6. **LOW PRIORITY**: Create `.env.development` template for local development

## Testing Required

After implementing fixes:
1. Test local development setup with `.env.development`
2. Test deployment with updated `.env.production`
3. Verify all Lambda functions have required environment variables
4. Test CORS configuration with `ALLOWED_ORIGINS`
5. Test logging with `LOG_LEVEL`
6. Test rate limiting with `RATE_LIMIT_TABLE`