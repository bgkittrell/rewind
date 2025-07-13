import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { EventBridgeClient } from '@aws-sdk/client-eventbridge'
import { PersonalizeClient } from '@aws-sdk/client-personalize'

// Check if we're running in local development mode
const isLocal = process.env.NODE_ENV === 'development' && process.env.IS_LOCAL === 'true'

// LocalStack endpoint configuration
const localStackEndpoint = 'http://localhost:4566'

// Common AWS configuration for LocalStack
const localStackConfig = {
  endpoint: localStackEndpoint,
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
}

// Production AWS configuration
const productionConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
}

// Get the appropriate configuration based on environment
const getAWSConfig = () => {
  if (isLocal) {
    console.log('🔧 Using LocalStack configuration')
    return localStackConfig
  }
  console.log('☁️ Using production AWS configuration')
  return productionConfig
}

// Create DynamoDB client
export const createDynamoDBClient = (): DynamoDBClient => {
  const config = getAWSConfig()
  return new DynamoDBClient(config)
}

// Create DynamoDB Document client
export const createDynamoDBDocumentClient = (): DynamoDBDocumentClient => {
  const dynamoDBClient = createDynamoDBClient()
  return DynamoDBDocumentClient.from(dynamoDBClient)
}

// Create Cognito Identity Provider client
export const createCognitoClient = (): CognitoIdentityProviderClient => {
  const config = getAWSConfig()
  return new CognitoIdentityProviderClient(config)
}

// Create Bedrock Runtime client
export const createBedrockClient = (): BedrockRuntimeClient => {
  const config = getAWSConfig()
  return new BedrockRuntimeClient(config)
}

// Create EventBridge client
export const createEventBridgeClient = (): EventBridgeClient => {
  const config = getAWSConfig()
  return new EventBridgeClient(config)
}

// Create Personalize client
export const createPersonalizeClient = (): PersonalizeClient => {
  const config = getAWSConfig()
  return new PersonalizeClient(config)
}

// Environment-specific table names
export const getTableName = (tableName: string): string => {
  // In LocalStack, we use simple table names
  if (isLocal) {
    return tableName
  }
  
  // In production, use environment-specific table names
  return process.env[`${tableName.toUpperCase()}_TABLE`] || tableName
}

// Get environment-specific configuration values
export const getEnvironmentConfig = () => {
  return {
    isLocal,
    userPoolId: process.env.USER_POOL_ID,
    userPoolClientId: process.env.USER_POOL_CLIENT_ID,
    region: process.env.AWS_REGION || 'us-east-1',
    tables: {
      users: getTableName('users'),
      podcasts: getTableName('podcasts'),
      episodes: getTableName('episodes'),
      listeningHistory: getTableName('listeningHistory'),
      shares: getTableName('shares'),
    },
  }
}

// Utility function to log current configuration
export const logCurrentConfig = () => {
  const config = getEnvironmentConfig()
  console.log('🏗️ Current AWS Configuration:', {
    environment: config.isLocal ? 'Local (LocalStack)' : 'Production',
    region: config.region,
    userPoolId: config.userPoolId,
    tables: config.tables,
  })
}