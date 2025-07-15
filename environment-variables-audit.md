# Environment Variables Audit Report

## Executive Summary

This audit examined all environment variables used in the Rewind application, comparing what's defined in the `.env` files versus what's actually used in the codebase. The analysis revealed several gaps and inconsistencies that need to be addressed.

## Environment Files Found

- `frontend/.env.development` - Development environment variables
- `frontend/.env.production` - Production environment variables  
- `frontend/.env.example` - Example template
- `frontend/.env.backup` - Backup configuration

## Current Environment Variables Analysis

### Frontend Variables (VITE_*)

#### ✅ Properly Configured

| Variable | .env.development | .env.production | .env.example | Used In Code |
|----------|------------------|-----------------|--------------|--------------|
| `VITE_API_BASE_URL` | ✅ | ✅ | ✅ | ✅ (api.ts) |
| `VITE_USER_POOL_ID` | ✅ (as VITE_COGNITO_USER_POOL_ID) | ✅ | ✅ | ✅ (AuthContext.tsx) |
| `VITE_USER_POOL_CLIENT_ID` | ✅ (as VITE_COGNITO_CLIENT_ID) | ✅ | ✅ | ✅ (AuthContext.tsx) |
| `VITE_IDENTITY_POOL_ID` | ✅ (as VITE_COGNITO_IDENTITY_POOL_ID) | ✅ | ✅ | ✅ (AuthContext.tsx) |
| `VITE_AWS_REGION` | ❌ | ✅ | ✅ | ✅ (rumConfig.ts) |

#### ❌ Missing Frontend Variables

| Variable | Used In Code | Description | Status |
|----------|-------------|-------------|---------|
| `VITE_RUM_APPLICATION_ID` | ✅ (rumConfig.ts) | AWS RUM application ID | ❌ Missing from all .env files |
| `VITE_RUM_IDENTITY_POOL_ID` | ✅ (rumConfig.ts) | AWS RUM identity pool ID | ❌ Missing from all .env files |
| `VITE_RUM_REGION` | ✅ (rumConfig.ts) | AWS RUM region | ❌ Missing from all .env files |
| `VITE_VAPID_PUBLIC_KEY` | ✅ (PWA_FEATURES.md) | VAPID key for push notifications | ❌ Missing from all .env files |

#### ⚠️ Naming Inconsistencies

The development environment uses different naming conventions:
- `.env.development` uses `VITE_COGNITO_*` prefix
- `.env.production` uses `VITE_*` prefix  
- Code expects `VITE_*` format

### Backend Variables (process.env.*)

#### ✅ Set by CDK Infrastructure

| Variable | Used In Code | Set By CDK | Description |
|----------|-------------|------------|-------------|
| `AWS_REGION` | ✅ | ✅ | AWS region for services |
| `USER_POOL_CLIENT_ID` | ✅ | ✅ | Cognito user pool client ID |
| `USERS_TABLE` | ✅ | ✅ | DynamoDB users table name |
| `PODCASTS_TABLE` | ✅ | ✅ | DynamoDB podcasts table name |
| `EPISODES_TABLE` | ✅ | ✅ | DynamoDB episodes table name |
| `LISTENING_HISTORY_TABLE` | ✅ | ✅ | DynamoDB listening history table name |
| `SHARES_TABLE` | ✅ | ✅ | DynamoDB shares table name |
| `USER_POOL_ID` | ✅ | ✅ | Cognito user pool ID |

#### ❌ Missing Backend Variables

| Variable | Used In Code | Description | Status |
|----------|-------------|-------------|---------|
| `USER_FAVORITES_TABLE` | ✅ (recommendationService.ts) | DynamoDB user favorites table | ❌ Not set by CDK |
| `GUEST_ANALYTICS_TABLE` | ✅ (recommendationService.ts) | DynamoDB guest analytics table | ❌ Not set by CDK |
| `RATE_LIMIT_TABLE` | ✅ (rateLimitService.ts) | DynamoDB rate limiting table | ❌ Not set by CDK |
| `ALLOWED_ORIGINS` | ✅ (response.ts) | CORS allowed origins | ❌ Not configured |
| `LOG_LEVEL` | ✅ (loggerService.ts) | Application log level | ❌ Not configured |
| `CSP_REPORT_URI` | ✅ (response.ts) | Content Security Policy report URI | ❌ Not configured |
| `PERSONALIZE_CAMPAIGN_ARN` | ✅ (RECOMMENDATION_ENGINE.md) | AWS Personalize campaign ARN | ❌ Not configured |

#### ⚠️ Development-Only Variables

| Variable | Used In Code | Description | Status |
|----------|-------------|-------------|---------|
| `NODE_ENV` | ✅ | Environment mode | ✅ Set in development only |
| `CI` | ✅ (playwright configs) | CI environment flag | ✅ Set by CI/CD |

## Critical Gaps Identified

### 1. Missing AWS RUM Configuration
- **Issue**: AWS RUM monitoring is not configured
- **Impact**: No real user monitoring in production
- **Solution**: Add RUM variables to all environment files

### 2. Missing PWA Push Notifications
- **Issue**: `VITE_VAPID_PUBLIC_KEY` not configured
- **Impact**: Push notifications won't work
- **Solution**: Generate VAPID keys and add to environment

### 3. Inconsistent Naming Conventions
- **Issue**: Development uses `VITE_COGNITO_*` while production uses `VITE_*`
- **Impact**: Configuration confusion and potential runtime errors
- **Solution**: Standardize on `VITE_*` format

### 4. Missing Backend Security Configuration
- **Issue**: No CORS origins, CSP reporting, or log levels configured
- **Impact**: Security vulnerabilities and operational blindness
- **Solution**: Add security-related environment variables

### 5. Missing DynamoDB Tables
- **Issue**: Several tables referenced in code but not created by CDK
- **Impact**: Runtime errors when accessing these features
- **Solution**: Add missing tables to infrastructure or remove unused code

## Recommendations

### Immediate Actions

1. **Standardize Frontend Variables** - Update `.env.development` to use `VITE_*` format
2. **Add Missing AWS RUM Variables** - Configure RUM monitoring
3. **Configure CORS Origins** - Add `ALLOWED_ORIGINS` environment variable
4. **Set Log Levels** - Add `LOG_LEVEL` configuration

### Infrastructure Updates

1. **Add Missing DynamoDB Tables**:
   - `USER_FAVORITES_TABLE`
   - `GUEST_ANALYTICS_TABLE` 
   - `RATE_LIMIT_TABLE`

2. **Configure Security Variables**:
   - `CSP_REPORT_URI`
   - `ALLOWED_ORIGINS`

### PWA Features

1. **Generate VAPID Keys** for push notifications
2. **Add RUM Configuration** for monitoring

## Proposed Environment File Updates

### .env.development
```env
# AWS Configuration
VITE_AWS_REGION=us-east-1

# API Configuration
VITE_API_BASE_URL=https://12c77xnz00.execute-api.us-east-1.amazonaws.com/v1

# Cognito Configuration (standardized naming)
VITE_USER_POOL_ID=us-east-1_Cw78Mapt3
VITE_USER_POOL_CLIENT_ID=49kf2uvsl9vg08ka6o67ts41jj
VITE_IDENTITY_POOL_ID=us-east-1:14710d0b-58b7-4743-a489-1412f75f9c11

# AWS RUM Configuration
VITE_RUM_APPLICATION_ID=your-rum-application-id
VITE_RUM_IDENTITY_POOL_ID=your-rum-identity-pool-id
VITE_RUM_REGION=us-east-1

# PWA Configuration
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

### .env.production
```env
# AWS Configuration
VITE_AWS_REGION=us-east-1

# API Configuration
VITE_API_BASE_URL=https://bds33eqtv5.execute-api.us-east-1.amazonaws.com/prod

# Cognito Configuration
VITE_USER_POOL_ID=us-east-1_jfT5M1vfA
VITE_USER_POOL_CLIENT_ID=7viflgadalnplcvo49fmv45i3c
VITE_IDENTITY_POOL_ID=us-east-1:c3628a89-eca7-4d8d-af50-05652fd048bf

# AWS RUM Configuration
VITE_RUM_APPLICATION_ID=your-prod-rum-application-id
VITE_RUM_IDENTITY_POOL_ID=your-prod-rum-identity-pool-id
VITE_RUM_REGION=us-east-1

# PWA Configuration
VITE_VAPID_PUBLIC_KEY=your-prod-vapid-public-key
```

## Code References

### Frontend Environment Variable Usage
- `frontend/src/services/api.ts` - API base URL
- `frontend/src/context/AuthContext.tsx` - Cognito configuration
- `frontend/src/config/rumConfig.ts` - AWS RUM configuration
- `frontend/src/vite-env.d.ts` - Type definitions

### Backend Environment Variable Usage
- `backend/src/handlers/authHandler.ts` - Authentication configuration
- `backend/src/services/recommendationService.ts` - DynamoDB tables
- `backend/src/services/rateLimitService.ts` - Rate limiting
- `backend/src/utils/response.ts` - CORS and security headers
- `backend/src/services/loggerService.ts` - Logging configuration

### Infrastructure Configuration
- `infra/lib/rewind-backend-stack.ts` - Lambda environment variables
- `infra/lib/rewind-data-stack.ts` - DynamoDB and Cognito resources
- `infra/bin/rewind.ts` - CDK deployment configuration

## Summary

The audit revealed 4 missing frontend variables, 7 missing backend variables, and several naming inconsistencies. The most critical gaps are around AWS RUM monitoring, PWA push notifications, and security configuration. Addressing these issues will improve application reliability, security, and operational visibility.