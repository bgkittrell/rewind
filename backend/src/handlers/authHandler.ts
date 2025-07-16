import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  GetUserCommand,
  AttributeType,
} from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { createResponse } from '../utils/response'
import { User } from '../types'
import { logger } from '../services/loggerService'
import { withLogging } from '../utils/middleware'
import { withValidation } from '../validation/middleware'
import {
  signupSchema,
  signinSchema,
  confirmSchema,
  resendSchema,
  type SignupRequest,
  type SigninRequest,
  type ConfirmRequest,
  type ResendRequest,
} from '../validation/authSchemas'

// Use validated request types from schemas

// Helper function to safely get error message and name
function getErrorInfo(error: unknown): { message: string; name?: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name }
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return {
      message: String((error as { message: unknown }).message),
      name: 'name' in error ? String((error as { name: unknown }).name) : undefined,
    }
  }
  return { message: 'An unknown error occurred' }
}

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' })
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!
const USERS_TABLE = process.env.USERS_TABLE!

const authHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.debug('Processing auth request', { path: event.path, method: event.httpMethod })

  try {
    const path = event.path
    const method = event.httpMethod

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {}

    switch (true) {
      case path.includes('/auth/signup') && method === 'POST': {
        const validationResult = signupSchema.safeParse(body)
        if (!validationResult.success) {
          return createResponse(400, { error: 'Email, password, and name are required' })
        }
        return await handleSignUp(validationResult.data)
      }

      case path.includes('/auth/signin') && method === 'POST': {
        const validationResult = signinSchema.safeParse(body)
        if (!validationResult.success) {
          return createResponse(400, { error: 'Email and password are required' })
        }
        return await handleSignIn(validationResult.data)
      }

      case path.includes('/auth/confirm') && method === 'POST': {
        const validationResult = confirmSchema.safeParse(body)
        if (!validationResult.success) {
          return createResponse(400, { error: 'Email and confirmation code are required' })
        }
        return await handleConfirmSignUp(validationResult.data)
      }

      case path.includes('/auth/resend') && method === 'POST': {
        const validationResult = resendSchema.safeParse(body)
        if (!validationResult.success) {
          return createResponse(400, { error: 'Email is required' })
        }
        return await handleResendConfirmation(validationResult.data)
      }

      default:
        return createResponse(404, { error: 'Endpoint not found' })
    }
  } catch (error) {
    logger.error('Auth handler error', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}

// Create validated handlers for each endpoint
export const signupHandler = withLogging(
  withValidation(
    async (event: APIGatewayProxyEvent, validatedBody?: SignupRequest) => {
      return await handleSignUp(validatedBody!)
    },
    { bodySchema: signupSchema },
  ),
)

export const signinHandler = withLogging(
  withValidation(
    async (event: APIGatewayProxyEvent, validatedBody?: SigninRequest) => {
      return await handleSignIn(validatedBody!)
    },
    { bodySchema: signinSchema },
  ),
)

export const confirmHandler = withLogging(
  withValidation(
    async (event: APIGatewayProxyEvent, validatedBody?: ConfirmRequest) => {
      return await handleConfirmSignUp(validatedBody!)
    },
    { bodySchema: confirmSchema },
  ),
)

export const resendHandler = withLogging(
  withValidation(
    async (event: APIGatewayProxyEvent, validatedBody?: ResendRequest) => {
      return await handleResendConfirmation(validatedBody!)
    },
    { bodySchema: resendSchema },
  ),
)

// Keep the old handler for backward compatibility
export const handler = withLogging(authHandler)

async function handleSignUp(body: SignupRequest): Promise<APIGatewayProxyResult> {
  const { email, password, name } = body

  try {
    // Create user in Cognito
    const signUpCommand = new SignUpCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
      ],
    })

    const signUpResult = await cognitoClient.send(signUpCommand)

    return createResponse(201, {
      message: 'User created successfully',
      userSub: signUpResult.UserSub,
      emailVerificationRequired: !signUpResult.UserConfirmed,
    })
  } catch (error) {
    logger.error('SignUp error', error, { email })

    const errorInfo = getErrorInfo(error)

    if (errorInfo.name === 'UsernameExistsException') {
      return createResponse(409, { error: 'User already exists' })
    }

    if (errorInfo.name === 'InvalidPasswordException') {
      return createResponse(400, { error: 'Password does not meet requirements' })
    }

    return createResponse(400, { error: errorInfo.message || 'Failed to create user' })
  }
}

async function handleSignIn(body: SigninRequest): Promise<APIGatewayProxyResult> {
  const { email, password } = body

  try {
    const authCommand = new InitiateAuthCommand({
      ClientId: USER_POOL_CLIENT_ID,
      AuthFlow: 'USER_SRP_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })

    const authResult = await cognitoClient.send(authCommand)

    if (authResult.AuthenticationResult) {
      // Get user details
      const getUserCommand = new GetUserCommand({
        AccessToken: authResult.AuthenticationResult.AccessToken!,
      })

      const userResult = await cognitoClient.send(getUserCommand)
      const userSub = userResult.UserAttributes?.find(attr => attr.Name === 'sub')?.Value!

      // Create or update user in DynamoDB
      await createUserInDynamoDB(userSub, email, userResult.UserAttributes || [])

      return createResponse(200, {
        message: 'Sign in successful',
        tokens: {
          accessToken: authResult.AuthenticationResult.AccessToken,
          refreshToken: authResult.AuthenticationResult.RefreshToken,
          idToken: authResult.AuthenticationResult.IdToken,
        },
        user: {
          id: userSub,
          email,
          name: userResult.UserAttributes?.find(attr => attr.Name === 'name')?.Value,
        },
      })
    } else {
      return createResponse(400, { error: 'Authentication failed' })
    }
  } catch (error) {
    logger.error('SignIn error', error, { email })

    const errorInfo = getErrorInfo(error)

    if (errorInfo.name === 'NotAuthorizedException') {
      return createResponse(401, { error: 'Invalid credentials' })
    }

    if (errorInfo.name === 'UserNotConfirmedException') {
      return createResponse(400, { error: 'Email not verified. Please check your email for verification code.' })
    }

    return createResponse(400, { error: errorInfo.message || 'Sign in failed' })
  }
}

async function handleConfirmSignUp(body: ConfirmRequest): Promise<APIGatewayProxyResult> {
  const { email, code: confirmationCode } = body

  try {
    const confirmCommand = new ConfirmSignUpCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
    })

    await cognitoClient.send(confirmCommand)

    return createResponse(200, { message: 'Email verified successfully' })
  } catch (error) {
    logger.error('Confirmation error', error, { email })

    const errorInfo = getErrorInfo(error)

    if (errorInfo.name === 'CodeMismatchException') {
      return createResponse(400, { error: 'Invalid confirmation code' })
    }

    if (errorInfo.name === 'ExpiredCodeException') {
      return createResponse(400, { error: 'Confirmation code has expired' })
    }

    return createResponse(400, { error: errorInfo.message || 'Email verification failed' })
  }
}

async function handleResendConfirmation(body: ResendRequest): Promise<APIGatewayProxyResult> {
  const { email } = body

  try {
    const resendCommand = new ResendConfirmationCodeCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
    })

    await cognitoClient.send(resendCommand)

    return createResponse(200, { message: 'Confirmation code sent successfully' })
  } catch (error) {
    logger.error('Resend confirmation error', error, { email })
    const errorInfo = getErrorInfo(error)
    return createResponse(400, { error: errorInfo.message || 'Failed to resend confirmation code' })
  }
}

async function createUserInDynamoDB(userId: string, email: string, userAttributes: AttributeType[]): Promise<void> {
  const name = userAttributes.find(attr => attr.Name === 'name')?.Value || ''

  const user: User = {
    userId,
    email,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      autoPlay: true,
      playbackSpeed: 1.0,
      skipIntro: false,
      skipOutro: false,
    },
    subscriptions: [],
  }

  try {
    // Check if user already exists
    const getCommand = new GetItemCommand({
      TableName: USERS_TABLE,
      Key: marshall({ userId }),
    })

    const existingUser = await dynamoClient.send(getCommand)

    if (!existingUser.Item) {
      // Create new user
      const putCommand = new PutItemCommand({
        TableName: USERS_TABLE,
        Item: marshall(user),
      })

      await dynamoClient.send(putCommand)
      logger.info('User created in DynamoDB', { userId })
    } else {
      logger.debug('User already exists in DynamoDB', { userId })
    }
  } catch (error) {
    logger.error('Error creating user in DynamoDB', error, { userId })
    // Don't throw error - authentication should still succeed even if DynamoDB fails
  }
}
