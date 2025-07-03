#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { RewindDataStack } from '../lib/rewind-data-stack'
import { RewindBackendStack } from '../lib/rewind-backend-stack'
import { RewindFrontendStack } from '../lib/rewind-frontend-stack'

const app = new cdk.App()

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
}

// Data stack (DynamoDB tables)
const dataStack = new RewindDataStack(app, 'RewindDataStack', {
  env,
  description: 'DynamoDB tables and data infrastructure for Rewind app',
})

// Backend stack (Lambda functions, API Gateway)
const backendStack = new RewindBackendStack(app, 'RewindBackendStack', {
  env,
  description: 'Backend Lambda functions and API Gateway for Rewind app',
  tables: dataStack.tables,
})

// Frontend stack (S3, CloudFront)
const frontendStack = new RewindFrontendStack(app, 'RewindFrontendStack', {
  env,
  description: 'Frontend hosting infrastructure for Rewind app',
  apiUrl: backendStack.apiUrl,
})

// Add tags to all resources
cdk.Tags.of(app).add('Project', 'Rewind')
cdk.Tags.of(app).add('Environment', process.env.NODE_ENV || 'development')

// Ensure all stacks are used (prevents linter warnings)
console.log(`Created stacks: ${dataStack.stackName}, ${backendStack.stackName}, ${frontendStack.stackName}`)
