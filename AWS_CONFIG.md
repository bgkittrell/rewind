\# Rewind AWS CDK Configuration Specifications

## Overview
This document defines the AWS CDK configuration for Rewind, a mobile-first Progressive Web App \(PWA\) for podcast enthusiasts aged 35\+. The configuration sets up serverless infrastructure using AWS Lambda, API Gateway, S3, CloudFront, DynamoDB, and Personalize, aligning with the architecture \(see PLAN.md\) and backend requirements \(see BACKEND_API.md\).

## CDK Setup
- **Language**: TypeScript
- **Dependencies**:
  \```
  npm install -g aws-cdk
  npm install @aws-cdk/core @aws-cdk/aws-lambda @aws-cdk/aws-apigateway @aws-cdk/aws-s3 @aws-cdk/aws-cloudfront @aws-cdk/aws-dynamodb @aws-cdk/aws-personalize @aws-cdk/aws-events @aws-cdk/aws-events-targets
  \```
- **Project Structure**:
  - `lib/`: CDK stack definitions.
  - `bin/`: Entry point for CDK app.
  - `cdk.json`: CDK configuration.

## Stacks
### RewindFrontendStack
- **Description**: Hosts the frontend on S3 with CloudFront.
- **Resources**:
  - **S3 Bucket**:
    - Name: `rewind-frontend-bucket-${AWS::AccountId}`
    - Configuration: Static website hosting, public read access.
  - **CloudFront Distribution**:
    - Origin: S3 bucket.
    - Default cache behavior: Serve index.html for SPA routing.
    - SSL: Managed certificate via ACM.
- **Deployment**:
  - Sync frontend build (`dist/`) to S3 using CDK custom resource.
  - Invalidate CloudFront cache on deploy.

### RewindBackendStack
- **Description**: Manages Lambda functions, API Gateway, and DynamoDB.
- **Resources**:
  - **API Gateway**:
    - REST API with CORS enabled.
    - Stages: `dev`, `prod`.
    - Endpoints mapped to Lambda functions (e.g.,
