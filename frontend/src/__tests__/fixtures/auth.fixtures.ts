// Test fixtures for auth integration tests

export const testUser = {
  email: 'test@example.com',
  password: 'Test123!@#',
  name: 'Test User',
  userId: 'test-user-123',
}

export const validTokens = {
  accessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNzAwMDAwMDAwfQ.test',
  idToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiY29nbml0bzp1c2VybmFtZSI6InRlc3QtdXNlci0xMjMifQ.test',
  refreshToken: 'test-refresh-token-abc123',
  expiresIn: 3600,
}

export const signupResponses = {
  success: {
    message: 'User created successfully. Please check your email for confirmation code.',
    userId: testUser.userId,
  },
  emailExists: {
    error: 'User already exists',
  },
  invalidPassword: {
    error: 'Password does not meet requirements',
    details: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  },
}

export const signinResponses = {
  success: validTokens,
  invalidCredentials: {
    error: 'Invalid credentials',
  },
  userNotConfirmed: {
    error: 'User is not confirmed',
    details: 'Please check your email for confirmation code',
  },
  userNotFound: {
    error: 'User does not exist',
  },
}

export const confirmResponses = {
  success: {
    message: 'Email confirmed successfully',
  },
  invalidCode: {
    error: 'Invalid confirmation code',
  },
  codeExpired: {
    error: 'Confirmation code has expired',
  },
}

export const resendResponses = {
  success: {
    message: 'Confirmation code resent successfully',
  },
  userAlreadyConfirmed: {
    error: 'User is already confirmed',
  },
  userNotFound: {
    error: 'User does not exist',
  },
}

// Common error responses
export const networkError = {
  error: 'Network error',
  details: 'Failed to connect to server',
}

export const serverError = {
  error: 'Internal server error',
  details: 'An unexpected error occurred',
}

// Helper to create expired tokens
export const expiredTokens = {
  ...validTokens,
  accessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNjAwMDAwMDAwfQ.expired',
}

// Test scenarios
export const testScenarios = {
  happyPath: {
    email: 'happy@example.com',
    password: 'Happy123!@#',
    name: 'Happy User',
    confirmationCode: '123456',
  },
  invalidEmail: {
    email: 'invalid-email',
    password: 'Test123!@#',
    name: 'Invalid Email User',
  },
  weakPassword: {
    email: 'weak@example.com',
    password: '123',
    name: 'Weak Password User',
  },
  existingUser: {
    email: 'existing@example.com',
    password: 'Existing123!@#',
    name: 'Existing User',
  },
}
