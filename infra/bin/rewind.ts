#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RewindDataStack } from '../lib/rewind-data-stack';
import { RewindBackendStack } from '../lib/rewind-backend-stack';
import { RewindFrontendStack } from '../lib/rewind-frontend-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Data stack - DynamoDB tables and related resources
const dataStack = new RewindDataStack(app, 'RewindDataStack', {
  env,
  description: 'DynamoDB tables and data infrastructure for Rewind'
});

// Backend stack - Lambda functions and API Gateway
const backendStack = new RewindBackendStack(app, 'RewindBackendStack', {
  dynamoTables: dataStack.tables,
  env,
  description: 'Lambda functions and API Gateway for Rewind'
});

// Frontend stack - S3 and CloudFront for React app
const frontendStack = new RewindFrontendStack(app, 'RewindFrontendStack', {
  apiUrl: backendStack.apiUrl,
  env,
  description: 'Frontend hosting infrastructure for Rewind'
});

// Add tags to all stacks
const tags = {
  Project: 'Rewind',
  Environment: process.env.NODE_ENV || 'development',
  Owner: 'RewindTeam'
};

Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(dataStack).add(key, value);
  cdk.Tags.of(backendStack).add(key, value);
  cdk.Tags.of(frontendStack).add(key, value);
});