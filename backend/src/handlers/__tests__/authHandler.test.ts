import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest'
import { APIGatewayProxyEvent } from 'aws-lambda'

// Create mock functions
const mockCognitoSend = vi.fn()
const mockDynamoSend = vi.fn()
const mockGetItemSend = vi.fn()

// Mock AWS SDK modules before any imports
vi.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const SignUpCommand = vi.fn()
  const InitiateAuthCommand = vi.fn()
  const ConfirmSignUpCommand = vi.fn()
  const ResendConfirmationCodeCommand = vi.fn()
  const GetUserCommand = vi.fn()

  class CognitoIdentityProviderClient {
    send(command: any) {
      return mockCognitoSend(command)
    }
  }

  return {
    CognitoIdentityProviderClient,
    SignUpCommand,
    InitiateAuthCommand,
    ConfirmSignUpCommand,
    ResendConfirmationCodeCommand,
    GetUserCommand,
  }
})

vi.mock('@aws-sdk/client-dynamodb', () => {
  const PutItemCommand = vi.fn()
  const GetItemCommand = vi.fn()

  class DynamoDBClient {
    send(command: any) {
      if (command.constructor.name === 'GetItemCommand') {
        return mockGetItemSend(command)
      }
      return mockDynamoSend(command)
    }
  }

  return {
    DynamoDBClient,
    PutItemCommand,
    GetItemCommand,
  }
})

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn(item => ({ M: item })),
  unmarshall: vi.fn(item => item),
}))

vi.mock('../../utils/response')

// Import handler and mocked response after all mocks are set
import { handler } from '../authHandler'
import { createResponse } from '../../utils/response'

const mockedCreateResponse = createResponse as MockedFunction<typeof createResponse>

// Helper to create mock API Gateway event
const createMockEvent = (httpMethod: string, path: string, body?: any): APIGatewayProxyEvent => ({
  body: body ? JSON.stringify(body) : null,
  headers: {},
  multiValueHeaders: {},
  httpMethod,
  isBase64Encoded: false,
  path,
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: 'test-account',
    apiId: 'test-api',
    authorizer: null,
    protocol: 'HTTP/1.1',
    httpMethod,
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: '127.0.0.1',
      user: null,
      userAgent: null,
      userArn: null,
    },
    path,
    stage: 'test',
    requestId: 'test-request-id',
    requestTime: '01/Jan/2024:00:00:00 +0000',
    requestTimeEpoch: 1704067200000,
    resourceId: 'test-resource',
    resourcePath: path,
  },
  resource: path,
})

describe('authHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.USER_POOL_CLIENT_ID = 'test-client-id'
    process.env.USERS_TABLE = 'test-users-table'
    process.env.AWS_REGION = 'us-east-1'

    // Setup default mock for createResponse
    mockedCreateResponse.mockImplementation((statusCode, body) => ({
      statusCode,
      body: JSON.stringify(body),
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Content-Type': 'application/json',
      },
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /auth/signup', () => {
    it('should successfully sign up a new user', async () => {
      mockCognitoSend.mockResolvedValueOnce({
        UserSub: 'test-user-sub',
        UserConfirmed: false,
      })

      const event = createMockEvent('POST', '/auth/signup', {
        email: 'test@example.com',
        password: 'Test123!',
        name: 'Test User',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(201, {
        message: 'User created successfully',
        userSub: 'test-user-sub',
        emailVerificationRequired: true,
      })
    })

    it('should return 400 when required fields are missing', async () => {
      const event = createMockEvent('POST', '/auth/signup', {
        email: 'test@example.com',
        // missing password and name
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(400, { error: 'Email, password, and name are required' })
    })

    it('should handle username already exists error', async () => {
      mockCognitoSend.mockRejectedValueOnce({
        name: 'UsernameExistsException',
        message: 'User already exists',
      })

      const event = createMockEvent('POST', '/auth/signup', {
        email: 'existing@example.com',
        password: 'Test123!',
        name: 'Test User',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(409, { error: 'User already exists' })
    })

    it('should handle invalid password error', async () => {
      mockCognitoSend.mockRejectedValueOnce({
        name: 'InvalidPasswordException',
        message: 'Password does not meet requirements',
      })

      const event = createMockEvent('POST', '/auth/signup', {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(400, { error: 'Password does not meet requirements' })
    })
  })

  describe('POST /auth/signin', () => {
    it('should successfully sign in a user', async () => {
      mockCognitoSend
        .mockResolvedValueOnce({
          // InitiateAuthCommand response
          AuthenticationResult: {
            AccessToken: 'test-access-token',
            RefreshToken: 'test-refresh-token',
            IdToken: 'test-id-token',
          },
        })
        .mockResolvedValueOnce({
          // GetUserCommand response
          UserAttributes: [
            { Name: 'sub', Value: 'test-user-sub' },
            { Name: 'email', Value: 'test@example.com' },
            { Name: 'name', Value: 'Test User' },
          ],
        })

      // Mock GetItemCommand to return null (user doesn't exist yet)
      mockGetItemSend.mockResolvedValueOnce({ Item: null })
      // Mock PutItemCommand
      mockDynamoSend.mockResolvedValueOnce({})

      const event = createMockEvent('POST', '/auth/signin', {
        email: 'test@example.com',
        password: 'Test123!',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(200, {
        message: 'Sign in successful',
        tokens: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          idToken: 'test-id-token',
        },
        user: {
          id: 'test-user-sub',
          email: 'test@example.com',
          name: 'Test User',
        },
      })
    })

    it('should return 400 when email or password is missing', async () => {
      const event = createMockEvent('POST', '/auth/signin', {
        email: 'test@example.com',
        // missing password
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(400, { error: 'Email and password are required' })
    })

    it('should handle invalid credentials error', async () => {
      mockCognitoSend.mockRejectedValueOnce({
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password',
      })

      const event = createMockEvent('POST', '/auth/signin', {
        email: 'test@example.com',
        password: 'WrongPassword!',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(401, { error: 'Invalid credentials' })
    })

    it('should handle unconfirmed user error', async () => {
      mockCognitoSend.mockRejectedValueOnce({
        name: 'UserNotConfirmedException',
        message: 'User is not confirmed',
      })

      const event = createMockEvent('POST', '/auth/signin', {
        email: 'test@example.com',
        password: 'Test123!',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(400, {
        error: 'Email not verified. Please check your email for verification code.',
      })
    })
  })

  describe('POST /auth/confirm', () => {
    it('should successfully confirm user signup', async () => {
      mockCognitoSend.mockResolvedValueOnce({}) // ConfirmSignUpCommand

      const event = createMockEvent('POST', '/auth/confirm', {
        email: 'test@example.com',
        confirmationCode: '123456',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(200, { message: 'Email verified successfully' })
    })

    it('should return 400 when required fields are missing', async () => {
      const event = createMockEvent('POST', '/auth/confirm', {
        email: 'test@example.com',
        // missing confirmationCode
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(400, { error: 'Email and confirmation code are required' })
    })

    it('should handle invalid confirmation code error', async () => {
      mockCognitoSend.mockRejectedValueOnce({
        name: 'CodeMismatchException',
        message: 'Invalid verification code',
      })

      const event = createMockEvent('POST', '/auth/confirm', {
        email: 'test@example.com',
        confirmationCode: 'wrong-code',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(400, { error: 'Invalid confirmation code' })
    })

    it('should handle expired confirmation code error', async () => {
      mockCognitoSend.mockRejectedValueOnce({
        name: 'ExpiredCodeException',
        message: 'Confirmation code has expired',
      })

      const event = createMockEvent('POST', '/auth/confirm', {
        email: 'test@example.com',
        confirmationCode: '123456',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(400, { error: 'Confirmation code has expired' })
    })
  })

  describe('POST /auth/resend', () => {
    it('should successfully resend confirmation code', async () => {
      mockCognitoSend.mockResolvedValueOnce({}) // ResendConfirmationCodeCommand

      const event = createMockEvent('POST', '/auth/resend', {
        email: 'test@example.com',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(200, { message: 'Confirmation code sent successfully' })
    })

    it('should return 400 when email is missing', async () => {
      const event = createMockEvent('POST', '/auth/resend', {})

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(400, { error: 'Email is required' })
    })

    it('should handle errors gracefully', async () => {
      mockCognitoSend.mockRejectedValueOnce({
        message: 'Some error occurred',
      })

      const event = createMockEvent('POST', '/auth/resend', {
        email: 'test@example.com',
      })

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(400, { error: 'Some error occurred' })
    })
  })

  describe('Unknown endpoints', () => {
    it('should return 404 for unknown endpoints', async () => {
      const event = createMockEvent('POST', '/auth/unknown', {})

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(404, { error: 'Endpoint not found' })
    })
  })

  describe('Error handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const event = createMockEvent('POST', '/auth/signup', null)
      event.body = '{"invalid json' // Malformed JSON

      const result = await handler(event)

      expect(mockedCreateResponse).toHaveBeenCalledWith(500, { error: 'Internal server error' })
    })
  })
})
