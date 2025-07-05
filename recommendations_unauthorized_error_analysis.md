# Recommendations "Unauthorized access" Error Analysis

## Problem Summary

When trying to load recommendations, users encounter an "Unauthorized access" error. This error originates from the `sanitizeError` function in the backend and indicates a mismatch between how the recommendation handlers access user authentication data versus how the Cognito authorizer provides it.

## Root Cause Analysis

### 1. CDK Configuration (Correct)

The CDK configuration in `infra/lib/rewind-backend-stack.ts` correctly sets up Cognito User Pool authorization for recommendation endpoints:

```typescript
// Lines 267, 274, 281, 288 in rewind-backend-stack.ts
recommendations.addMethod('GET', new apigateway.LambdaIntegration(recommendationFunction), {
  authorizer: cognitoAuthorizer,
  authorizationType: apigateway.AuthorizationType.COGNITO,
})
```

### 2. Authorizer Data Structure

When using Cognito User Pool authorizers, the user information is available in the event context as:
```typescript
event.requestContext.authorizer?.claims?.sub  // Contains the user ID
```

### 3. Handler Implementation Issue

The recommendation handlers incorrectly access user data:

**❌ Incorrect (Current Implementation):**
```typescript
// From recommendationHandler.ts and recommendationHandlerSecure.ts
const authorizer = event.requestContext.authorizer as APIGatewayAuthorizerEvent
const userId = authorizer.userId  // This is undefined!
```

**✅ Correct (Used in other handlers):**
```typescript
// From podcastHandler.ts and episodeHandler.ts
const userId = event.requestContext.authorizer?.claims?.sub
```

### 4. Error Flow

When `authorizer.userId` is undefined:

1. The condition `if (!userId)` evaluates to `true`
2. In the secure handler, this triggers `createErrorResponse(new Error('Unauthorized'), 401, event.path)`
3. `createErrorResponse` calls `sanitizeError(error, path)`
4. `sanitizeError` detects the "Unauthorized" string in the error message
5. It returns a sanitized error with message "Unauthorized access"

From `errorSanitizer.ts` lines 37-48:
```typescript
// Check if it's an authentication error (safe to expose)
if (
  error.message.includes('Unauthorized') ||
  error.message.includes('unauthorized') ||
  error.message.includes('authentication') ||
  error.message.includes('token')
) {
  return {
    message: 'Unauthorized access',
    code: 'UNAUTHORIZED',
    timestamp,
    path,
  }
}
```

## Comparison with Working Handlers

Other handlers in the codebase correctly access user data:

**podcastHandler.ts (Line 36):**
```typescript
const userId = event.requestContext.authorizer?.claims?.sub
```

**episodeHandler.ts (Line 22):**
```typescript
const userId = event.requestContext.authorizer?.claims?.sub
```

## Type Definition Issue

The `APIGatewayAuthorizerEvent` type in `types/index.ts` defines:
```typescript
export interface APIGatewayAuthorizerEvent {
  userId: string
  email: string
  name: string
}
```

This type doesn't match the actual structure of Cognito authorizer events, which use a `claims` object.

## Solution

The recommendation handlers need to be updated to access user data correctly:

### For recommendationHandler.ts:
```typescript
// Change from:
const authorizer = event.requestContext.authorizer as APIGatewayAuthorizerEvent
const userId = authorizer.userId

// To:
const userId = event.requestContext.authorizer?.claims?.sub
```

### For recommendationHandlerSecure.ts:
```typescript
// Change from:
const authorizer = event.requestContext.authorizer as APIGatewayAuthorizerEvent
const rawUserId = authorizer?.userId

// To:
const rawUserId = event.requestContext.authorizer?.claims?.sub
```

## Files That Need Updates

1. `backend/src/handlers/recommendationHandler.ts` - Lines 22-23, 102-103, 206-207, 348-349
2. `backend/src/handlers/recommendationHandlerSecure.ts` - Lines 23-24, 107-108, 188-189, 271-272
3. `backend/src/types/index.ts` - Update or deprecate the `APIGatewayAuthorizerEvent` interface

## Testing the Fix

After making these changes, users should be able to load recommendations without encountering the "Unauthorized access" error, assuming they have valid authentication tokens.

## Additional Considerations

1. **Consistent Error Handling**: Consider standardizing how all handlers access user data
2. **Type Safety**: Update type definitions to match actual AWS API Gateway + Cognito event structures
3. **Validation**: Add proper validation for the user ID extraction to handle edge cases
4. **Documentation**: Update handler documentation to reflect the correct way to access user data

## Prevention

To prevent similar issues in the future:
1. Create a utility function for extracting user data from authorizer context
2. Add integration tests that verify authentication flows
3. Use consistent patterns across all handlers
4. Update type definitions to match actual AWS service behaviors