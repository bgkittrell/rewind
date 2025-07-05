import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { createResponse } from '../utils/response'
import { User } from '../types'

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' })
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })

const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID!
const USERS_TABLE = process.env.USERS_TABLE!

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Auth request:', JSON.stringify(event, null, 2))

  try {
    const path = event.path
    const method = event.httpMethod

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {}

    switch (true) {
      case path.includes('/auth/signup') && method === 'POST':
        return await handleSignUp(body)

      case path.includes('/auth/signin') && method === 'POST':
        return await handleSignIn(body)

      case path.includes('/auth/confirm') && method === 'POST':
        return await handleConfirmSignUp(body)

      case path.includes('/auth/resend') && method === 'POST':
        return await handleResendConfirmation(body)

      default:
        return createResponse(404, { error: 'Endpoint not found' })
    }
  } catch (error) {
    console.error('Auth error:', error)
    return createResponse(500, { error: 'Internal server error' })
  }
}

async function handleSignUp(body: any): Promise<APIGatewayProxyResult> {
  const { email, password, name } = body

  if (!email || !password || !name) {
    return createResponse(400, { error: 'Email, password, and name are required' })
  }

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
  } catch (error: any) {
    console.error('SignUp error:', error)

    if (error.name === 'UsernameExistsException') {
      return createResponse(409, { error: 'User already exists' })
    }

    if (error.name === 'InvalidPasswordException') {
      return createResponse(400, { error: 'Password does not meet requirements' })
    }

    return createResponse(400, { error: error.message || 'Failed to create user' })
  }
}

async function handleSignIn(body: any): Promise<APIGatewayProxyResult> {
  const { email, password } = body

  if (!email || !password) {
    return createResponse(400, { error: 'Email and password are required' })
  }

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
  } catch (error: any) {
    console.error('SignIn error:', error)

    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, { error: 'Invalid credentials' })
    }

    if (error.name === 'UserNotConfirmedException') {
      return createResponse(400, { error: 'Email not verified. Please check your email for verification code.' })
    }

    return createResponse(400, { error: error.message || 'Sign in failed' })
  }
}

async function handleConfirmSignUp(body: any): Promise<APIGatewayProxyResult> {
  const { email, confirmationCode } = body

  if (!email || !confirmationCode) {
    return createResponse(400, { error: 'Email and confirmation code are required' })
  }

  try {
    const confirmCommand = new ConfirmSignUpCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
    })

    await cognitoClient.send(confirmCommand)

    return createResponse(200, { message: 'Email verified successfully' })
  } catch (error: any) {
    console.error('Confirmation error:', error)

    if (error.name === 'CodeMismatchException') {
      return createResponse(400, { error: 'Invalid confirmation code' })
    }

    if (error.name === 'ExpiredCodeException') {
      return createResponse(400, { error: 'Confirmation code has expired' })
    }

    return createResponse(400, { error: error.message || 'Email verification failed' })
  }
}

async function handleResendConfirmation(body: any): Promise<APIGatewayProxyResult> {
  const { email } = body

  if (!email) {
    return createResponse(400, { error: 'Email is required' })
  }

  try {
    const resendCommand = new ResendConfirmationCodeCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
    })

    await cognitoClient.send(resendCommand)

    return createResponse(200, { message: 'Confirmation code sent successfully' })
  } catch (error: any) {
    console.error('Resend confirmation error:', error)
    return createResponse(400, { error: error.message || 'Failed to resend confirmation code' })
  }
}

async function createUserInDynamoDB(userId: string, email: string, userAttributes: any[]): Promise<void> {
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
      console.log('User created in DynamoDB:', userId)
    } else {
      console.log('User already exists in DynamoDB:', userId)
    }
  } catch (error) {
    console.error('Error creating user in DynamoDB:', error)
    // Don't throw error - authentication should still succeed even if DynamoDB fails
  }
}
